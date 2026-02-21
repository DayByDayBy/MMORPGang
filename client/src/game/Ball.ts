import { Graphics, Container } from 'pixi.js'
import type { BallState } from 'shared'
import { COLORS } from 'shared'

export class Ball {
  private gfx: Graphics
  private trailGfx: Graphics
  private trail: { x: number, y: number }[] = []

  constructor(stage: Container) {
    this.trailGfx = new Graphics()
    this.gfx = new Graphics()
    stage.addChild(this.trailGfx, this.gfx)
  }

  destroy() {
    this.gfx.destroy()
    this.trailGfx.destroy()
  }

  render(state: BallState, radius: number) {
    this.trail.push({ x: state.x, y: state.y })
    if (this.trail.length > 15) this.trail.shift()

    const t = this.trailGfx
    t.clear()
    for (let i = 1; i < this.trail.length; i++) {
      const alpha = (i / this.trail.length) * 0.4
      const r = (i / this.trail.length) * radius * 0.8
      t.circle(this.trail[i].x, this.trail[i].y, r)
      t.fill({ color: COLORS.ball, alpha })
    }

    const g = this.gfx
    g.clear()
    g.circle(state.x, state.y, radius * 2.2)
    g.fill({ color: COLORS.ball, alpha: 0.15 })
    g.circle(state.x, state.y, radius)
    g.fill({ color: COLORS.ball, alpha: 0.9 })
    g.stroke({ width: 2, color: COLORS.ballTrail })
  }
}