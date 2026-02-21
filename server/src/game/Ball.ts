import { mmorpong, reflect } from 'shared'

const CENTER_X = 0
const CENTER_Y = 0

export class Ball {
  private state: mmorpong.BallState

  constructor() {
    const angle = Math.random() * Math.PI * 2
    this.state = {
      x:  CENTER_X,
      y:  CENTER_Y,
      vx: Math.cos(angle) * mmorpong.BALL_BASE_SPEED,
      vy: Math.sin(angle) * mmorpong.BALL_BASE_SPEED,
    }
  }

  update(dt: number) {
    this.state.x += this.state.vx * dt
    this.state.y += this.state.vy * dt

    const dx   = this.state.x - CENTER_X
    const dy   = this.state.y - CENTER_Y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist + mmorpong.BALL_RADIUS >= mmorpong.ARENA_RADIUS) {
      const nx  = dx / dist
      const ny  = dy / dist
      const vel = reflect({ x: this.state.vx, y: this.state.vy }, { x: nx, y: ny })
      this.state.vx = vel.x
      this.state.vy = vel.y
      const safe = mmorpong.ARENA_RADIUS - mmorpong.BALL_RADIUS
      this.state.x = CENTER_X + nx * safe
      this.state.y = CENTER_Y + ny * safe
    }
  }

  getState(): mmorpong.BallState {
    return this.state
  }

  reset() {
    const angle   = Math.random() * Math.PI * 2
    this.state.x  = CENTER_X
    this.state.y  = CENTER_Y
    this.state.vx = Math.cos(angle) * mmorpong.BALL_BASE_SPEED
    this.state.vy = Math.sin(angle) * mmorpong.BALL_BASE_SPEED
  }
}