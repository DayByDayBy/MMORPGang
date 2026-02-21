import { Graphics, Container } from 'pixi.js'
import { mmorpong } from 'shared'

export class Arena {
  private gfx: Graphics
  private cx: number
  private cy: number
  private radius: number

  constructor(stage: Container, cx: number, cy: number, radius: number) {
    this.cx = cx
    this.cy = cy
    this.radius = radius
    this.gfx = new Graphics()
    stage.addChild(this.gfx)
    this.draw()
  }

  private draw() {
    const g = this.gfx
    g.circle(this.cx, this.cy, this.radius)
    g.stroke({ width: 2, color: mmorpong.COLORS.cyan, alpha: 0.4 })
  }
}