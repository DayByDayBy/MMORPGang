import { Graphics, Container } from 'pixi.js'
import { mmorpong } from 'shared'

export class Goal {
  private gfx: Graphics

  constructor(stage: Container) {
    this.gfx = new Graphics()
    stage.addChild(this.gfx)
  }

  destroy() {
    this.gfx.destroy()
  }

  render(state: mmorpong.PlayerState, cx: number, cy: number, radius: number) {
    const g = this.gfx
    g.clear()
    const color = state.lives > 0 ? mmorpong.COLORS.cyan : 0xff3344
    g.circle(cx, cy, radius)
    g.fill({ color, alpha: 0.15 })
    g.stroke({ width: 2, color, alpha: 0.8 })
  }
}