// ─── Visual Constants (shared so server can reference if needed) ──────────────
export const COLORS = {
  background: 0x03020a,
  cyan:        0x00ffe7,
  ball:        0xff6600,
  ballTrail:   0xff9944,
  wallGlow:    0x1a3a3a,
}



// ─── Canonical world ─────────────────────────────────────────────────────────
// All physics runs in this coordinate space. (0,0) = arena centre.
// Client scales world → screen with a single factor: screen_px / WORLD_SIZE.
export const WORLD_SIZE        = 800                          // logical px, square
export const ARENA_RADIUS      = WORLD_SIZE * 0.45            // 360
export const GOAL_RING_RADIUS  = ARENA_RADIUS * 0.72          // 259.2
export const GOAL_RADIUS       = ARENA_RADIUS * 0.05          // 18

// ─── Ball ─────────────────────────────────────────────────────────────────────
export const BALL_RADIUS     = WORLD_SIZE * 0.0125            // 10
export const BALL_BASE_SPEED = WORLD_SIZE * 0.00625 * 60      // 300 world-units/sec
export const BALL_MAX_SPEED  = WORLD_SIZE * 0.0125  * 60      // 600 world-units/sec

// ─── Player / Paddle ──────────────────────────────────────────────────────────
export const ORBIT_RADIUS      = ARENA_RADIUS * 0.15          // 54
export const PADDLE_ARC        = 0.5   // radians — arc length of paddle
export const PADDLE_MIN_ARC    = 0.15  // minimum arc (winning shrinks it)
export const ORBIT_SPEED       = 0.05  // radians/sec (applied per tick via dt)
export const ORBIT_ACCEL       = 0.18  // lerp factor for smooth acceleration

// ─── Game ─────────────────────────────────────────────────────────────────────
export const MAX_PLAYERS   = 12
export const STARTING_LIVES = 5
export const TICK_RATE     = 60  // server ticks per second

// ─── Player slot positions (angles around arena, evenly distributed) ──────────
export function getSlotAngles(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (2 * Math.PI * i) / count)
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Vec2 {
  x: number
  y: number
}

export interface BallState {
  x: number
  y: number
  vx: number
  vy: number
}

export interface PlayerState {
  id:         string
  name?:      string
  angle:      number   // current paddle angle around their orbit
  goalAngle:  number   // this player's slot angle around the arena
  paddleArc:  number   // current arc width in radians
  lives:      number
  score:      number
  connected:  boolean
}

export interface GameState {
  players: Record<string, PlayerState>
  ball:    BallState
  tick:    number
  phase:   'lobby' | 'playing' | 'gameover'
}

// ─── Input ────────────────────────────────────────────────────────────────────
export interface PlayerInput {
  left:  boolean
  right: boolean
}

// ─── Lobby ─────────────────────────────────────────────────────────────────────
export interface LobbyState {
  players: { id: string; name: string }[]
}

// ─── Socket event contracts ────────────────────────────────────────────────────
export interface ServerToClientEvents {
  gameState:  (state: GameState) => void
  lobbyState: (state: LobbyState) => void
}

export interface ClientToServerEvents {
  playerInput: (input: PlayerInput) => void
  joinGame:    (name: string) => void
  startGame:   () => void
}

// ─── Math utilities (pure, no pixi dependency) ────────────────────────────────
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
