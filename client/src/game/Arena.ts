import { Graphics, Container } from 'pixi.js'
import { COLORS } from 'shared'

export class Arena {
    private gfx: Graphics

    constructor(
        stage: Container,
        private cx: number,
        private cy: number,
        private radius: number
    ) {
        this.gfx = new Graphics()
        stage.addChild(this.gfx)
        this.draw()
    }

    private draw() {
        const g = this.gfx
        g.circle(this.cx, this.cy, this.radius)
        g.stroke({ width: 2, color: COLORS.cyan, alpha: 0.4 })
    }
}