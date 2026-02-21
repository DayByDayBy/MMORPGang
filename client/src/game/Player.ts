import { Graphics, Container } from 'pixi.js'
import { PlayerState, COLORS } from 'shared'

export class Player {
  private gfx: Graphics

  constructor(stage: Container) {
    this.gfx = new Graphics()
    stage.addChild(this.gfx)
  }

  render(
    state: PlayerState,
    goalX: number,
    goalY: number,
    orbitRadius: number,
  ) {
    const g = this.gfx
    g.clear()

    // Orbit path
    g.circle(goalX, goalY, orbitRadius)
    g.stroke({ width: 0.5, color: COLORS.cyan, alpha: 0.08 })

    // Paddle arc
    const startAngle = state.angle - state.paddleArc / 2
    const endAngle   = state.angle + state.paddleArc / 2
    g.arc(goalX, goalY, orbitRadius, startAngle, endAngle)
    g.stroke({ width: 6, color: COLORS.cyan, alpha: 0.9 })
  }
}