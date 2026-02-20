import { Graphics, Container } from "pixi.js";
import { BALL_RADIUS, BALL_SPEED } from "shared";
import type { Vector2 } from "shared";

export class Ball extends Container {
  public velocity: Vector2;
  public radius = BALL_RADIUS;
  private gfx = new Graphics();

  constructor() {
    super();
    this.velocity = { x: 0, y: 0 };
    this.addChild(this.gfx);
    this.draw();
  }

  private draw() {
    this.gfx.circle(0, 0, this.radius);
    this.gfx.fill({ color: 0xffffff });
    this.gfx.circle(0, 0, this.radius + 4);
    this.gfx.fill({ color: 0xffffff, alpha: 0.15 });
  }

  public update() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
  }

  public reflect(normal: Vector2) {
    const dot = this.velocity.x * normal.x + this.velocity.y * normal.y;
    this.velocity.x -= 2 * dot * normal.x;
    this.velocity.y -= 2 * dot * normal.y;
    this.velocity.x *= 1.02;
    this.velocity.y *= 1.02;
  }

  public addSpin(tangentVelocity: Vector2, influence = 0.6) {
    this.velocity.x += tangentVelocity.x * influence;
    this.velocity.y += tangentVelocity.y * influence;
  }

  public launch(target: Vector2) {
    this.x = 0;
    this.y = 0;
    const dist = Math.sqrt(target.x * target.x + target.y * target.y) || 1;
    this.velocity = {
      x: (target.x / dist) * BALL_SPEED,
      y: (target.y / dist) * BALL_SPEED,
    };
  }
}
