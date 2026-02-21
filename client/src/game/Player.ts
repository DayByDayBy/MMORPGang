import { Graphics, Container } from 'pixi.js'
import { mmorpong } from 'shared'

export class Player {
  private gfx: Graphics

  constructor(stage: Container) {
    this.gfx = new Graphics()
    stage.addChild(this.gfx)
  }

  destroy() {
    this.gfx.destroy()
  }

  render(
    state: mmorpong.PlayerState,
    goalX: number,
    goalY: number,
    orbitRadius: number,
    isLocal = false,
  ) {
    const g = this.gfx
    g.clear()

    const color = isLocal ? 0xffffff : mmorpong.COLORS.cyan
    const lineWidth = isLocal ? 8 : 6

    g.circle(goalX, goalY, orbitRadius)
    g.stroke({ width: 0.5, color: mmorpong.COLORS.cyan, alpha: 0.08 })

    const startAngle = state.angle - state.paddleArc / 2
    const endAngle   = state.angle + state.paddleArc / 2
    g.moveTo(
      goalX + Math.cos(startAngle) * orbitRadius,
      goalY + Math.sin(startAngle) * orbitRadius
    )
    g.arc(goalX, goalY, orbitRadius, startAngle, endAngle)
    g.stroke({ width: lineWidth, color, alpha: 0.9 })
  }
}