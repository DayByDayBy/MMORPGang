import { Graphics, Container } from 'pixi.js'
import { PlayerState, COLORS } from 'shared'

export class Goal {
  private gfx: Graphics

  constructor(stage: Container) {
    this.gfx = new Graphics()
    stage.addChild(this.gfx)
  }

  render(state: PlayerState, cx: number, cy: number, radius: number) {
    const g = this.gfx
    g.clear()
    const color = state.lives > 0 ? COLORS.cyan : 0xff3344
    g.circle(cx, cy, radius)
    g.fill({ color, alpha: 0.15 })
    g.stroke({ width: 2, color, alpha: 0.8 })
  }
}