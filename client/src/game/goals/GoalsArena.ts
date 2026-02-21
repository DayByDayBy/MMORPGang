import { Graphics, Container } from "pixi.js";
import { GOALS_ARENA_RADIUS } from "shared";

export class GoalsArena extends Container {
  public radius: number;
  private gfx = new Graphics();

  constructor(radius: number = GOALS_ARENA_RADIUS) {
    super();
    this.radius = radius;
    this.addChild(this.gfx);
    this.draw();
  }

  private draw() {
    this.gfx.circle(0, 0, this.radius);
    this.gfx.stroke({ width: 2, color: 0x00ffe7, alpha: 0.4 });
  }
}
