import {
  getSlotAngles,
  MAX_PLAYERS,
  STARTING_LIVES,
  PADDLE_ARC,
  ORBIT_SPEED,
  ORBIT_ACCEL,
} from 'shared'
import type { GameState, PlayerState, BallState, PlayerInput, LobbyState } from 'shared'

export class GameStateManager {
  private players: Record<string, PlayerState> = {}
  private slots: number[] = getSlotAngles(MAX_PLAYERS)
  private inputs: Map<string, PlayerInput> = new Map()
  private phase: GameState['phase'] = 'lobby'

  addPlayer(socketId: string): void {
    const usedAngles = new Set(
      Object.values(this.players).map(p => p.goalAngle)
    )
    const freeSlot = this.slots.find(a => !usedAngles.has(a))
    if (freeSlot === undefined) return  // server full

    this.players[socketId] = {
      id:        socketId,
      name:      '',
      angle:     freeSlot,
      goalAngle: freeSlot,
      paddleArc: PADDLE_ARC,
      lives:     STARTING_LIVES,
      score:     0,
      connected: true,
    }
  }

  removePlayer(socketId: string): void {
    delete this.players[socketId]
    this.inputs.delete(socketId)
  }

  setInput(socketId: string, input: PlayerInput): void {
    this.inputs.set(socketId, input)
  }

  setPlayerName(socketId: string, name: string): boolean {
    const player = this.players[socketId]
    if (!player) return false
    const trimmed = (name ?? '').trim()
    if (!trimmed) return false
    player.name = trimmed.slice(0, 24)
    return true
  }

  setPhase(phase: GameState['phase']): void {
    this.phase = phase
  }

  getPhase(): GameState['phase'] {
    return this.phase
  }

  canStartGame(): boolean {
    const named = Object.values(this.players).filter(p => !!p.name?.trim())
    return named.length >= 2
  }

  getHostId(): string | null {
    const joined = Object.values(this.players).filter(p => !!p.name?.trim())
    return joined.length > 0 ? joined[0].id : null
  }

  isHost(socketId: string): boolean {
    return this.getHostId() === socketId
  }

  getLobbyState(): LobbyState {
    return {
      players: Object.values(this.players).map((p) => ({
        id: p.id,
        name: p.name?.trim() || p.id.slice(0, 6),
        joined: !!p.name?.trim(),
      })),
      hostId: this.getHostId(),
    }
  }

  applyInputs(): void {
    for (const [id, player] of Object.entries(this.players)) {
      const input = this.inputs.get(id)
      if (!input) continue
      let target = player.angle
      if (input.left)  target -= ORBIT_SPEED
      if (input.right) target += ORBIT_SPEED
      player.angle += (target - player.angle) * ORBIT_ACCEL
    }
  }

  getState(ball: BallState, tick: number): GameState {
    return {
      players: { ...this.players },
      ball,
      tick,
      phase: this.phase,
    }
  }

  getPlayers(): Record<string, PlayerState> {
    return this.players
  }
}
