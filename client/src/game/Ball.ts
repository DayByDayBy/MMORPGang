import { Graphics, Container } from "pixi.js";
import { BALL_RADIUS, BALL_SPEED, MAX_BALL_SPEED, TICK_RATE } from "shared";
import type { Vector2 } from "shared";

export class Ball extends Container {
  public velocity: Vector2;
  public radius = BALL_RADIUS;
  private gfx = new Graphics();

  private lerpPrev = { x: 0, y: 0 };
  private lerpTarget = { x: 0, y: 0 };
  private lerpT = 1;
  private readonly tickMs = 1000 / TICK_RATE;

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
    this.clampSpeed();
  }

  public addSpin(tangentVelocity: Vector2, influence = 0.6) {
    this.velocity.x += tangentVelocity.x * influence;
    this.velocity.y += tangentVelocity.y * influence;
    this.clampSpeed();
  }

  private clampSpeed() {
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    if (speed > MAX_BALL_SPEED) {
      const scale = MAX_BALL_SPEED / speed;
      this.velocity.x *= scale;
      this.velocity.y *= scale;
    }
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

  public syncState(serverBall: { x: number; y: number }) {
    this.lerpPrev.x = this.x;
    this.lerpPrev.y = this.y;
    this.lerpTarget.x = serverBall.x;
    this.lerpTarget.y = serverBall.y;
    this.lerpT = 0;
  }

  public interpolate(deltaMs: number) {
    if (this.lerpT >= 1) return;
    this.lerpT = Math.min(1, this.lerpT + deltaMs / this.tickMs);
    const t = this.lerpT;
    this.x = this.lerpPrev.x + (this.lerpTarget.x - this.lerpPrev.x) * t;
    this.y = this.lerpPrev.y + (this.lerpTarget.y - this.lerpPrev.y) * t;
  }
}
