import { BALL_BASE_SPEED, BALL_RADIUS, ARENA_RADIUS_RATIO, reflect } from 'shared'
import type { BallState } from 'shared'

const ARENA_RADIUS = 400 * ARENA_RADIUS_RATIO  // logical server arena: 400px reference

const CENTER_X = 0
const CENTER_Y = 0

export class Ball {
  private state: BallState

  constructor() {
    const angle = Math.random() * Math.PI * 2
    this.state = {
      x:  CENTER_X,
      y:  CENTER_Y,
      vx: Math.cos(angle) * BALL_BASE_SPEED,
      vy: Math.sin(angle) * BALL_BASE_SPEED,
    }
  }

  update() {
    this.state.x += this.state.vx
    this.state.y += this.state.vy

    const dx   = this.state.x - CENTER_X
    const dy   = this.state.y - CENTER_Y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist + BALL_RADIUS >= ARENA_RADIUS) {
      const nx  = dx / dist
      const ny  = dy / dist
      const vel = reflect({ x: this.state.vx, y: this.state.vy }, { x: nx, y: ny })
      this.state.vx = vel.x
      this.state.vy = vel.y
      const safe = ARENA_RADIUS - BALL_RADIUS
      this.state.x = CENTER_X + nx * safe
      this.state.y = CENTER_Y + ny * safe
    }
  }

  getState(): BallState {
    return this.state
  }

  reset() {
    const angle = Math.random() * Math.PI * 2
    this.state.x  = CENTER_X
    this.state.y  = CENTER_Y
    this.state.vx = Math.cos(angle) * BALL_BASE_SPEED
    this.state.vy = Math.sin(angle) * BALL_BASE_SPEED
  }
}
