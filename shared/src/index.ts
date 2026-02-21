// Game constants
export const ARENA_RADIUS = 900
export const BALL_RADIUS = 8
export const BALL_SPEED = 5
export const ORBIT_RADIUS = 700
export const PADDLE_ARC = 0.4 // radians

// Types
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
  id: string
  angle: number
  paddleArc: number
  goalAngle: number  // where on the arena edge this player's goal sits
  lives: number
  score: number
}

export interface GameState {
  players: Record<string, PlayerState>
  ball: BallState
  tick: number
}
