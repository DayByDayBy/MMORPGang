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

  it('requires two players to start', () => {
    const gsm = new GameStateManager()
    gsm.addPlayer('p1')
    expect(gsm.canStartGame()).toBe(false)
    gsm.addPlayer('p2')
    expect(gsm.canStartGame()).toBe(true)
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
