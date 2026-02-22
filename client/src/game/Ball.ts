import { Graphics, Container } from "pixi.js";
import { BALL_RADIUS, BALL_SPEED, CLASSIC_MAX_BALL_SPEED, reflectVelocity, clampSpeed } from "shared";
import type { Vector2, BallState } from "shared";

const SNAP_DIST_SQ = 900; // 30px — snap instead of lerp when correction is this large
const LERP_RATE = 12; // higher = snappier tracking of server position

export class Ball extends Container {
  public velocity: Vector2;
  public radius = BALL_RADIUS;
  private gfx = new Graphics();
  private serverX = 0;
  private serverY = 0;
  private serverVx = 0;
  private serverVy = 0;
  private currentSpeed = BALL_SPEED;
  private acceleration = 0;
  private maxSpeed = BALL_SPEED;
  private useAcceleration = false;

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
    if (this.useAcceleration && this.currentSpeed < this.maxSpeed) {
      this.currentSpeed = Math.min(this.currentSpeed + this.acceleration, this.maxSpeed);
      const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
      if (speed > 0) {
        this.velocity.x = (this.velocity.x / speed) * this.currentSpeed;
        this.velocity.y = (this.velocity.y / speed) * this.currentSpeed;
      }
    }
    
    this.x += this.velocity.x;
    this.y += this.velocity.y;
  }

  public reflect(normal: Vector2, maxSpeed: number = CLASSIC_MAX_BALL_SPEED) {
    const v = reflectVelocity(this.velocity.x, this.velocity.y, normal);
    this.velocity = clampSpeed(v.x, v.y, maxSpeed);
  }

  public addSpin(tangentVelocity: Vector2, influence = 0.6, maxSpeed: number = CLASSIC_MAX_BALL_SPEED) {
    this.velocity.x += tangentVelocity.x * influence;
    this.velocity.y += tangentVelocity.y * influence;
    this.velocity = clampSpeed(this.velocity.x, this.velocity.y, maxSpeed);
  }

  public launch(target: Vector2, options?: { useAcceleration?: boolean; initialSpeedMultiplier?: number; acceleration?: number; maxSpeed?: number }) {
    this.x = 0;
    this.y = 0;
    
    this.useAcceleration = options?.useAcceleration ?? false;
    const initialMultiplier = options?.initialSpeedMultiplier ?? 1.0;
    this.acceleration = options?.acceleration ?? 0;
    this.maxSpeed = options?.maxSpeed ?? BALL_SPEED;
    this.currentSpeed = this.maxSpeed * initialMultiplier;
    
    const dist = Math.sqrt(target.x * target.x + target.y * target.y) || 1;
    this.velocity.x = (target.x / dist) * this.currentSpeed;
    this.velocity.y = (target.y / dist) * this.currentSpeed;
  }

  /** Called when a new server state patch arrives. */
  public syncState(serverBall: BallState) {
    this.serverX = serverBall.x;
    this.serverY = serverBall.y;
    this.serverVx = serverBall.vx;
    this.serverVy = serverBall.vy;
  }

  /**
   * Called every render frame. Extrapolates the ball along its velocity
   * and smoothly corrects toward the server position.
   * @param dt frame delta in seconds (e.g. ticker.deltaMS / 1000)
   */
  public interpolate(dt: number) {
    // Extrapolate server position forward by velocity so the ball
    // keeps moving between patches instead of freezing
    this.serverX += this.serverVx * dt * 60;
    this.serverY += this.serverVy * dt * 60;

    const dx = this.serverX - this.x;
    const dy = this.serverY - this.y;
    const distSq = dx * dx + dy * dy;

    if (distSq > SNAP_DIST_SQ) {
      this.x = this.serverX;
      this.y = this.serverY;
    } else {
      const t = 1 - Math.exp(-LERP_RATE * dt);
      this.x += dx * t;
      this.y += dy * t;
    }
  }
}
