import { BALL_BASE_SPEED } from 'shared'
import type { BallState } from 'shared'

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
