// ─── Math utilities (pure, no dependencies) ───────────────────────────────────
export interface Vec2 {
  x: number
  y: number
}

export function reflect(vel: Vec2, normal: Vec2): Vec2 {
  const len = Math.sqrt(normal.x ** 2 + normal.y ** 2)
  const nx = normal.x / len, ny = normal.y / len
  const dot = vel.x * nx + vel.y * ny
  return { x: vel.x - 2 * dot * nx, y: vel.y - 2 * dot * ny }
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2)
  return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 }
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y
}


// ─── Shared game constants ────────────────────────────────────────────────────
export const TICK_RATE   = 60
export const MAX_PLAYERS = 12


// ─── mmorpong ─────────────────────────────────────────────────────────────────
export namespace mmorpong {

  export const COLORS = {
    background: 0x03020a,
    cyan:       0x00ffe7,
    ball:       0xff6600,
    ballTrail:  0xff9944,
    wallGlow:   0x1a3a3a,
  }

  export const WORLD_SIZE       = 800
  export const ARENA_RADIUS     = WORLD_SIZE * 0.45
  export const GOAL_RING_RADIUS = ARENA_RADIUS * 0.72
  export const GOAL_RADIUS      = ARENA_RADIUS * 0.05
  export const ORBIT_RADIUS     = ARENA_RADIUS * 0.15
  export const BALL_RADIUS      = WORLD_SIZE * 0.0125
  export const BALL_BASE_SPEED  = WORLD_SIZE * 0.00625 * 60
  export const BALL_MAX_SPEED   = WORLD_SIZE * 0.0125  * 60
  export const PADDLE_ARC       = 0.5
  export const PADDLE_MIN_ARC   = 0.15
  export const ORBIT_SPEED      = 0.05
  export const ORBIT_ACCEL      = 0.18
  export const STARTING_LIVES   = 5

  export function getSlotAngles(count: number): number[] {
    return Array.from({ length: count }, (_, i) => (2 * Math.PI * i) / count)
  }

  export interface BallState {
    x: number
    y: number
    vx: number
    vy: number
  }

  export interface PlayerState {
    id:        string
    name?:     string
    angle:     number
    goalAngle: number
    paddleArc: number
    lives:     number
    score:     number
    connected: boolean
  }

  export interface GameState {
    players: Record<string, PlayerState>
    ball:    BallState
    tick:    number
    phase:   'lobby' | 'playing' | 'gameover'
  }

  export interface PlayerInput {
    left:  boolean
    right: boolean
  }

  export interface LobbyState {
    players: { id: string; name: string; joined: boolean }[]
    hostId:  string | null
  }

  export interface ServerToClientEvents {
    gameState:  (state: GameState) => void
    lobbyState: (state: LobbyState) => void
  }

  export interface ClientToServerEvents {
    playerInput: (input: PlayerInput) => void
    joinGame:    (name: string) => void
    startGame:   () => void
  }
}


// ─── myrto ───────────────────────────────────────────────────────────────────
export namespace myrto {

  export const PLAYER_COLORS = [
    "#FF4136", "#0074D9", "#2ECC40", "#FFDC00",
    "#FF851B", "#B10DC9", "#01FF70", "#7FDBFF",
    "#F012BE", "#FF6384", "#39CCCC", "#AAAAAA",
  ] as const

  export const ARENA_RADIUS      = 350
  export const BALL_RADIUS       = 8
  export const BALL_SPEED        = 5
  export const MAX_BALL_SPEED    = 14
  export const PADDLE_WIDTH_RATIO = 0.35
  export const PADDLE_SPEED      = 0.02
  export const DEFAULT_LIVES     = 3
  export const MAX_CLIP_DURATION = 1.5

  export interface Edge {
    start:    Vec2
    end:      Vec2
    midpoint: Vec2
    normal:   Vec2
    angle:    number
    length:   number
  }

  export interface ArenaConfig {
    numSides:        number
    edgeAssignments: number[]
  }

  export function getArenaConfig(playerCount: number): ArenaConfig {
    if (playerCount === 2) {
      return { numSides: 4, edgeAssignments: [0, 2] }
    }
    return {
      numSides: playerCount,
      edgeAssignments: Array.from({ length: playerCount }, (_, i) => i),
    }
  }

  export function computeVertices(numSides: number, radius: number): Vec2[] {
    return Array.from({ length: numSides }, (_, i) => ({
      x: radius * Math.cos((2 * Math.PI * i) / numSides - Math.PI / 2),
      y: radius * Math.sin((2 * Math.PI * i) / numSides - Math.PI / 2),
    }))
  }

  export function computeEdges(numSides: number, radius: number): Edge[] {
    const vertices = computeVertices(numSides, radius)
    return Array.from({ length: numSides }, (_, i) => {
      const start = vertices[i]
      const end   = vertices[(i + 1) % numSides]
      const dx = end.x - start.x
      const dy = end.y - start.y
      const len = Math.sqrt(dx * dx + dy * dy)
      return {
        start,
        end,
        midpoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
        normal:   { x: dy / len, y: -dx / len },
        angle:    Math.atan2(dy, dx),
        length:   len,
      }
    })
  }

  export function getPaddleEndpoints(
    paddlePosition: number,
    edge: Edge,
    widthRatio: number,
  ): { start: Vec2; end: Vec2 } {
    const cx = edge.start.x + (edge.end.x - edge.start.x) * paddlePosition
    const cy = edge.start.y + (edge.end.y - edge.start.y) * paddlePosition
    const halfLen = (edge.length * widthRatio) / 2
    const cos = Math.cos(edge.angle)
    const sin = Math.sin(edge.angle)
    return {
      start: { x: cx - cos * halfLen, y: cy - sin * halfLen },
      end:   { x: cx + cos * halfLen, y: cy + sin * halfLen },
    }
  }

  export function ballNearSegment(
    bx: number, by: number,
    a: Vec2, b: Vec2,
    hitDistSq: number,
  ): boolean {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lenSq = dx * dx + dy * dy
    const t = Math.max(0, Math.min(1,
      ((bx - a.x) * dx + (by - a.y) * dy) / lenSq,
    ))
    const distSq = (bx - (a.x + t * dx)) ** 2 + (by - (a.y + t * dy)) ** 2
    return distSq <= hitDistSq
  }

  export function ballPassedEdge(
    bx: number, by: number,
    ballRadius: number,
    edge: Edge,
  ): boolean {
    const relX = bx - edge.start.x
    const relY = by - edge.start.y
    const dot  = relX * edge.normal.x + relY * edge.normal.y
    if (dot <= ballRadius) return false
    const edgeDx = edge.end.x - edge.start.x
    const edgeDy = edge.end.y - edge.start.y
    const proj = (relX * edgeDx + relY * edgeDy) / edge.length
    return proj >= -ballRadius && proj <= edge.length + ballRadius
  }

  export function clampSpeed(vx: number, vy: number, maxSpeed: number): Vec2 {
    const speed = Math.sqrt(vx ** 2 + vy ** 2)
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed
      return { x: vx * scale, y: vy * scale }
    }
    return { x: vx, y: vy }
  }

  export interface BallState {
    x: number
    y: number
  }

  export interface PlayerState {
    sessionId:     string
    name:          string
    colorIndex:    number
    edgeIndex:     number
    lives:         number
    eliminated:    boolean
    ready:         boolean
    paddlePosition: number
  }

  export interface GameState {
    phase:      string
    winnerId:   string
    winnerName: string
    players:    Map<string, PlayerState>
    ball:       BallState
    arenaRadius: number
    numSides:   number
    maxPlayers: number
  }
}