import { mmorpong, MAX_PLAYERS } from 'shared'


export class GameStateManager {
  private players: Record<string, mmorpong.PlayerState> = {}
private slots: number[] = mmorpong.getSlotAngles(MAX_PLAYERS)
  private inputs: Map<string, mmorpong.PlayerInput> = new Map()
  private phase: mmorpong.GameState['phase'] = 'lobby'
  private lobbyChanged = true

  addPlayer(socketId: string): void {
    const usedAngles = new Set(
      Object.values(this.players).map(p => p.goalAngle)
    )
    const freeSlot = this.slots.find(a => !usedAngles.has(a))
    if (freeSlot === undefined) return

    this.players[socketId] = {
      id:        socketId,
      name:      '',
      angle:     freeSlot,
      goalAngle: freeSlot,
      paddleArc: mmorpong.PADDLE_ARC,
      lives:     mmorpong.STARTING_LIVES,
      score:     0,
      connected: true,
    }
    this.lobbyChanged = true
  }

  removePlayer(socketId: string): void {
    delete this.players[socketId]
    this.inputs.delete(socketId)
    this.lobbyChanged = true
  }

  setInput(socketId: string, input: mmorpong.PlayerInput): void {
    this.inputs.set(socketId, input)
  }

  setPlayerName(socketId: string, name: string): boolean {
    if (this.phase !== 'lobby') return false
    const player = this.players[socketId]
    if (!player) return false
    const trimmed = (name ?? '').trim()
    if (!trimmed) return false
    player.name = trimmed.slice(0, 24)
    this.lobbyChanged = true
    return true
  }

  setPhase(phase: mmorpong.GameState['phase']): void {
    this.phase = phase
  }

  getPhase(): mmorpong.GameState['phase'] {
    return this.phase
  }

  canStartGame(): boolean {
    if (this.phase !== 'lobby') return false
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

  getLobbyState(): mmorpong.LobbyState {
    return {
      players: Object.values(this.players).map((p) => ({
        id:     p.id,
        name:   p.name?.trim() || p.id.slice(0, 6),
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
      if (input.left)  target -= mmorpong.ORBIT_SPEED
      if (input.right) target += mmorpong.ORBIT_SPEED
      player.angle += (target - player.angle) * mmorpong.ORBIT_ACCEL
    }
  }

  getState(ball: mmorpong.BallState, tick: number): mmorpong.GameState {
    return {
      players: { ...this.players },
      ball,
      tick,
      phase: this.phase,
    }
  }

  getPlayers(): Record<string, mmorpong.PlayerState> {
    return this.players
  }

  hasLobbyChanged(): boolean {
    return this.lobbyChanged
  }

  consumeLobbyChange(): void {
    this.lobbyChanged = false
  }
}