import { describe, it, expect } from 'vitest'
import { GameStateManager } from './GameState'

describe('GameStateManager lobby and phase behavior', () => {
  it('starts in lobby phase', () => {
    const gsm = new GameStateManager()
    expect(gsm.getPhase()).toBe('lobby')
  })

  it('returns fallback lobby names before joinGame naming', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('socket_abcdef1234')

    const lobby = gsm.getLobbyState()
    expect(lobby.players).toHaveLength(1)
    expect(lobby.players[0]).toEqual({
      id: 'socket_abcdef1234',
      name: 'socket',
      joined: false,
    })
  })

  it('uses player name once set', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('socket_one')
    const ok = gsm.setPlayerName('socket_one', 'Alice')

    expect(ok).toBe(true)
    const lobby = gsm.getLobbyState()
    expect(lobby.players[0].name).toBe('Alice')
  })

  it('falls back to id slice when player name is blank', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('socket_blank')
    const ok = gsm.setPlayerName('socket_blank', '   ')

    expect(ok).toBe(false)
    const lobby = gsm.getLobbyState()
    expect(lobby.players[0].name).toBe('socket')
  })

  it('requires two named players to start (unnamed do not count)', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('p1')
    gsm.addPlayer('p2')
    // two connected but unnamed — not eligible
    expect(gsm.canStartGame()).toBe(false)

    gsm.setPlayerName('p1', 'Alice')
    // one named — still not enough
    expect(gsm.canStartGame()).toBe(false)

    gsm.setPlayerName('p2', 'Bob')
    // two named — eligible
    expect(gsm.canStartGame()).toBe(true)
  })

  it('lobbyState includes joined flag per player', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('p1')
    gsm.addPlayer('p2')
    gsm.setPlayerName('p1', 'Alice')

    const lobby = gsm.getLobbyState()
    const alice = lobby.players.find(p => p.id === 'p1')!
    const unnamed = lobby.players.find(p => p.id === 'p2')!
    expect(alice.joined).toBe(true)
    expect(unnamed.joined).toBe(false)
  })

  it('reflects phase changes in emitted game state', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('socket_one')
    gsm.setPhase('playing')

    const state = gsm.getState({ x: 0, y: 0, vx: 0, vy: 0 }, 42)
    expect(state.phase).toBe('playing')
    expect(state.tick).toBe(42)
  })

  it('removes disconnected players from lobby state', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('socket_one')
    gsm.addPlayer('socket_two')

    gsm.removePlayer('socket_one')

    const lobby = gsm.getLobbyState()
    expect(lobby.players).toHaveLength(1)
    expect(lobby.players[0].id).toBe('socket_two')
  })
})

describe('GameStateManager host authority', () => {
  it('first joined (named) player becomes host', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('p1')
    gsm.addPlayer('p2')
    gsm.setPlayerName('p1', 'Alice')

    expect(gsm.getHostId()).toBe('p1')
  })

  it('no host when no players have joined', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('p1')
    expect(gsm.getHostId()).toBeNull()
  })

  it('isHost returns true only for the host socket', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('p1')
    gsm.addPlayer('p2')
    gsm.setPlayerName('p1', 'Alice')
    gsm.setPlayerName('p2', 'Bob')

    expect(gsm.isHost('p1')).toBe(true)
    expect(gsm.isHost('p2')).toBe(false)
  })

  it('host migrates to next joined player when host disconnects', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('p1')
    gsm.addPlayer('p2')
    gsm.setPlayerName('p1', 'Alice')
    gsm.setPlayerName('p2', 'Bob')

    gsm.removePlayer('p1')
    expect(gsm.getHostId()).toBe('p2')
    expect(gsm.isHost('p2')).toBe(true)
  })

  it('host becomes null when all joined players disconnect', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('p1')
    gsm.addPlayer('p2')
    gsm.setPlayerName('p1', 'Alice')

    gsm.removePlayer('p1')
    // p2 is connected but not joined (no name)
    expect(gsm.getHostId()).toBeNull()
  })

  it('lobbyState includes hostId', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('p1')
    gsm.setPlayerName('p1', 'Alice')

    const lobby = gsm.getLobbyState()
    expect(lobby.hostId).toBe('p1')
  })
})

describe('GameStateManager lobby tick suppression', () => {
  it('hasLobbyChanged returns true initially', () => {
    const gsm = new GameStateManager()
    expect(gsm.hasLobbyChanged()).toBe(true)
  })

  it('hasLobbyChanged returns false after being consumed', () => {
    const gsm = new GameStateManager()
    gsm.consumeLobbyChange()
    expect(gsm.hasLobbyChanged()).toBe(false)
  })

  it('hasLobbyChanged returns true after a player is added', () => {
    const gsm = new GameStateManager()
    gsm.consumeLobbyChange()
    gsm.addPlayer('p1')
    expect(gsm.hasLobbyChanged()).toBe(true)
  })

  it('hasLobbyChanged returns true after a player is removed', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('p1')
    gsm.consumeLobbyChange()
    gsm.removePlayer('p1')
    expect(gsm.hasLobbyChanged()).toBe(true)
  })

  it('hasLobbyChanged returns true after a player name is set', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('p1')
    gsm.consumeLobbyChange()
    gsm.setPlayerName('p1', 'Alice')
    expect(gsm.hasLobbyChanged()).toBe(true)
  })
})

describe('GameStateManager playing-phase guards', () => {
  it('setPlayerName rejects during playing phase', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('p1')
    gsm.addPlayer('p2')
    gsm.setPlayerName('p1', 'Alice')
    gsm.setPlayerName('p2', 'Bob')
    gsm.setPhase('playing')

    const ok = gsm.setPlayerName('p1', 'NewName')
    expect(ok).toBe(false)
    // name unchanged
    const lobby = gsm.getLobbyState()
    expect(lobby.players.find(p => p.id === 'p1')!.name).toBe('Alice')
  })

  it('canStartGame returns false during playing phase', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('p1')
    gsm.addPlayer('p2')
    gsm.setPlayerName('p1', 'Alice')
    gsm.setPlayerName('p2', 'Bob')
    gsm.setPhase('playing')

    expect(gsm.canStartGame()).toBe(false)
  })

  it('new connections during playing are added but not joined', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('p1')
    gsm.addPlayer('p2')
    gsm.setPlayerName('p1', 'Alice')
    gsm.setPlayerName('p2', 'Bob')
    gsm.setPhase('playing')

    gsm.addPlayer('late')
    const lobby = gsm.getLobbyState()
    const latePlayer = lobby.players.find(p => p.id === 'late')!
    expect(latePlayer.joined).toBe(false)
  })
})
