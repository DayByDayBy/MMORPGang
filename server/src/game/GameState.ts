import {
  getSlotAngles,
  MAX_PLAYERS,
  STARTING_LIVES,
  PADDLE_ARC,
} from 'shared'
import type { GameState, PlayerState, BallState } from 'shared'

export class GameStateManager {
  private players: Record<string, PlayerState> = {}
  private slots: number[] = getSlotAngles(MAX_PLAYERS)
  private tick = 0

  addPlayer(socketId: string): void {
    const usedAngles = new Set(
      Object.values(this.players).map(p => p.goalAngle)
    )
    const freeSlot = this.slots.find(a => !usedAngles.has(a))
    if (freeSlot === undefined) return  // server full

    this.players[socketId] = {
      id:        socketId,
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
  }

  getState(ball: BallState, tick: number): GameState {
    return {
      players: { ...this.players },
      ball,
      tick,
      phase: 'playing',
    }
  }

  getPlayers(): Record<string, PlayerState> {
    return this.players
  }
}
