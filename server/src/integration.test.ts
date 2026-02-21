import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { io as ioc } from 'socket.io-client'
import type { Socket as ClientSocket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents, LobbyState, GameState } from 'shared'
import { GameStateManager } from './game/GameState'
import { Ball } from './game/Ball'
import { checkPaddleCollision, checkGoalCollision } from './game/Physics'
import { TICK_RATE, GOAL_RING_RADIUS } from 'shared'

type TestClient = ClientSocket<ServerToClientEvents, ClientToServerEvents>

function createTestServer() {
  const httpServer = createServer()
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: '*' },
  })
  const gsm = new GameStateManager()
  const ball = new Ball()
  const DT = 1 / TICK_RATE
  let tick = 0

  const interval = setInterval(() => {
    tick++
    if (gsm.getPhase() === 'playing') {
      gsm.applyInputs()
      ball.update(DT)
      const ballState = ball.getState()
      for (const player of Object.values(gsm.getPlayers())) {
        const goalX = Math.cos(player.goalAngle) * GOAL_RING_RADIUS
        const goalY = Math.sin(player.goalAngle) * GOAL_RING_RADIUS
        const saved = checkPaddleCollision(ballState, player, goalX, goalY)
        if (!saved) checkGoalCollision(ballState, player, goalX, goalY)
      }
      io.emit('gameState', gsm.getState(ball.getState(), tick))
    } else if (gsm.hasLobbyChanged()) {
      gsm.consumeLobbyChange()
      io.emit('gameState', gsm.getState(ball.getState(), tick))
    }
  }, 1000 / TICK_RATE)

  io.on('connection', (socket) => {
    gsm.addPlayer(socket.id)
    io.emit('lobbyState', gsm.getLobbyState())
    socket.on('playerInput', (input) => {
      if (
        typeof input !== 'object' || input === null ||
        typeof input.left !== 'boolean' ||
        typeof input.right !== 'boolean' ||
        Object.keys(input).length > 2
      ) return
      gsm.setInput(socket.id, { left: input.left, right: input.right })
    })
    socket.on('joinGame', (name) => {
      const ok = gsm.setPlayerName(socket.id, name)
      if (ok) io.emit('lobbyState', gsm.getLobbyState())
    })
    socket.on('startGame', () => {
      if (!gsm.isHost(socket.id)) return
      if (!gsm.canStartGame()) return
      gsm.setPhase('playing')
    })
    socket.on('disconnect', () => {
      gsm.removePlayer(socket.id)
      io.emit('lobbyState', gsm.getLobbyState())
    })
  })

  return { httpServer, io, gsm, stop: () => { clearInterval(interval); io.close() } }
}

function connectClient(port: number): TestClient {
  return ioc(`http://localhost:${port}`, { autoConnect: true }) as TestClient
}

function waitFor<T>(socket: TestClient, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event as any, resolve))
}

function waitForLobby(socket: TestClient, predicate: (s: LobbyState) => boolean): Promise<LobbyState> {
  return new Promise((resolve) => {
    const handler = (state: LobbyState) => {
      if (predicate(state)) {
        socket.off('lobbyState', handler)
        resolve(state)
      }
    }
    socket.on('lobbyState', handler)
  })
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('socket integration: connect -> lobbyState', () => {
  let server: ReturnType<typeof createTestServer>
  let port: number

  beforeEach(async () => {
    server = createTestServer()
    await new Promise<void>((resolve) => server.httpServer.listen(0, resolve))
    port = (server.httpServer.address() as any).port
  })

  afterEach(() => {
    server.stop()
    server.httpServer.close()
  })

  it('emits lobbyState on connect with the new player', async () => {
    const client = connectClient(port)
    const lobby = await waitFor<LobbyState>(client, 'lobbyState')
    expect(lobby.players).toHaveLength(1)
    expect(lobby.players[0].joined).toBe(false)
    client.disconnect()
  })

  it('emits updated lobbyState after joinGame with name', async () => {
    const client = connectClient(port)
    await waitFor<LobbyState>(client, 'lobbyState')

    const lobbyPromise = waitFor<LobbyState>(client, 'lobbyState')
    client.emit('joinGame', 'Alice')
    const lobby = await lobbyPromise

    expect(lobby.players[0].name).toBe('Alice')
    expect(lobby.players[0].joined).toBe(true)
    expect(lobby.hostId).toBe(client.id)
    client.disconnect()
  })
})

describe('socket integration: startGame authorization + eligibility', () => {
  let server: ReturnType<typeof createTestServer>
  let port: number

  beforeEach(async () => {
    server = createTestServer()
    await new Promise<void>((resolve) => server.httpServer.listen(0, resolve))
    port = (server.httpServer.address() as any).port
  })

  afterEach(() => {
    server.stop()
    server.httpServer.close()
  })

  it('non-host cannot start the game', async () => {
    const c1 = connectClient(port)
    const c2 = connectClient(port)

    await waitFor<LobbyState>(c1, 'lobbyState')
    await waitFor<LobbyState>(c2, 'lobbyState')

    const c1LobbyP = waitFor<LobbyState>(c1, 'lobbyState')
    c1.emit('joinGame', 'Alice')
    const c1Lobby = await c1LobbyP

    const c2LobbyP = waitFor<LobbyState>(c2, 'lobbyState')
    c2.emit('joinGame', 'Bob')
    await c2LobbyP

    // c2 is not host — startGame should be ignored
    c2.emit('startGame')
    await waitMs(100)

    expect(server.gsm.getPhase()).toBe('lobby')
    c1.disconnect()
    c2.disconnect()
  })

  it('host can start when 2+ players have joined', async () => {
    const c1 = connectClient(port)
    const c2 = connectClient(port)

    await waitFor<LobbyState>(c1, 'lobbyState')
    await waitFor<LobbyState>(c2, 'lobbyState')

    const c1LobbyP = waitFor<LobbyState>(c1, 'lobbyState')
    c1.emit('joinGame', 'Alice')
    await c1LobbyP

    const c2LobbyP = waitFor<LobbyState>(c2, 'lobbyState')
    c2.emit('joinGame', 'Bob')
    await c2LobbyP

    // c1 is host — startGame should succeed
    const gameStateP = waitFor<GameState>(c1, 'gameState')
    c1.emit('startGame')
    const state = await gameStateP

    expect(state.phase).toBe('playing')
    c1.disconnect()
    c2.disconnect()
  })

  it('host cannot start with only 1 joined player', async () => {
    const c1 = connectClient(port)
    await waitFor<LobbyState>(c1, 'lobbyState')

    const c1LobbyP = waitFor<LobbyState>(c1, 'lobbyState')
    c1.emit('joinGame', 'Alice')
    await c1LobbyP

    c1.emit('startGame')
    await waitMs(100)

    expect(server.gsm.getPhase()).toBe('lobby')
    c1.disconnect()
  })
})

describe('socket integration: disconnect updates and host migration', () => {
  let server: ReturnType<typeof createTestServer>
  let port: number

  beforeEach(async () => {
    server = createTestServer()
    await new Promise<void>((resolve) => server.httpServer.listen(0, resolve))
    port = (server.httpServer.address() as any).port
  })

  afterEach(() => {
    server.stop()
    server.httpServer.close()
  })

  it('lobbyState updates when a player disconnects', async () => {
    const c1 = connectClient(port)
    const c2 = connectClient(port)

    // wait until both are registered
    await waitForLobby(c1, s => s.players.length === 2)

    const lobbyAfterDisconnect = waitForLobby(c1, s => s.players.length === 1)
    c2.disconnect()
    const lobby = await lobbyAfterDisconnect

    expect(lobby.players).toHaveLength(1)
    c1.disconnect()
  })

  it('host migrates to next joined player when host disconnects', async () => {
    const c1 = connectClient(port)
    const c2 = connectClient(port)

    await waitFor<LobbyState>(c1, 'lobbyState')
    await waitFor<LobbyState>(c2, 'lobbyState')

    const c1LobbyP = waitFor<LobbyState>(c1, 'lobbyState')
    c1.emit('joinGame', 'Alice')
    await c1LobbyP

    const c2LobbyP = waitFor<LobbyState>(c2, 'lobbyState')
    c2.emit('joinGame', 'Bob')
    await c2LobbyP

    // c1 is host; disconnect it
    const lobbyAfterP = waitFor<LobbyState>(c2, 'lobbyState')
    c1.disconnect()
    const lobbyAfter = await lobbyAfterP

    expect(lobbyAfter.hostId).toBe(c2.id)
    c2.disconnect()
  })
})
