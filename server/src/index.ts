import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { mmorpong, MAX_PLAYERS, TICK_RATE } from 'shared'
import { Ball } from './game/Ball'
import { GameStateManager } from './game/GameState'
import { checkPaddleCollision, checkGoalCollision } from './game/Physics'

const DT = 1 / TICK_RATE

const app = express()
const httpServer = createServer(app)
const io = new Server<mmorpong.ClientToServerEvents, mmorpong.ServerToClientEvents>(httpServer, {
  cors: { origin: '*' }
})

let tick = 0
const ball = new Ball()
const gsm  = new GameStateManager()

setInterval(() => {
  tick++
  if (gsm.getPhase() === 'playing') {
    gsm.applyInputs()
    ball.update(DT)
    const ballState = ball.getState()
    for (const player of Object.values(gsm.getPlayers())) {
      const goalX = Math.cos(player.goalAngle) * mmorpong.GOAL_RING_RADIUS
      const goalY = Math.sin(player.goalAngle) * mmorpong.GOAL_RING_RADIUS
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
  console.log('client connected:', socket.id)
  gsm.addPlayer(socket.id)
  io.emit('lobbyState', gsm.getLobbyState())

  socket.on('playerInput', (input) => {
    if (
      typeof input !== 'object' || input === null ||
      typeof input.left  !== 'boolean' ||
      typeof input.right !== 'boolean' ||
      Object.keys(input).length > 2
    ) {
      console.warn('invalid playerInput from', socket.id, input)
      return
    }
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
    console.log('client disconnected:', socket.id)
    gsm.removePlayer(socket.id)
    io.emit('lobbyState', gsm.getLobbyState())
  })
})

httpServer.listen(3001, () => console.log('server running on port 3001'))
