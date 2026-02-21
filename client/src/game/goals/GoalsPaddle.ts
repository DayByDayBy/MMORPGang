import { Graphics, Container } from "pixi.js";
import { PLAYER_COLORS, GOALS_ORBIT_RADIUS, GOALS_PADDLE_ARC } from "shared";

export class GoalsPaddle extends Container {
  public paddleAngle: number;
  public colorIndex: number;
  public paddleArc: number;
  public orbitRadius: number;

  private gfx = new Graphics();

  constructor(
    colorIndex: number,
    initialAngle: number = 0,
    orbitRadius: number = GOALS_ORBIT_RADIUS,
    paddleArc: number = GOALS_PADDLE_ARC,
  ) {
    super();
    this.colorIndex = colorIndex;
    this.paddleAngle = initialAngle;
    this.orbitRadius = orbitRadius;
    this.paddleArc = paddleArc;
    this.addChild(this.gfx);
  }

  public render(goalX: number, goalY: number, isLocal: boolean = false) {
    this.gfx.clear();

    const color = isLocal ? 0xffffff : PLAYER_COLORS[this.colorIndex % PLAYER_COLORS.length];
    const lineWidth = isLocal ? 8 : 6;

    this.gfx.circle(goalX, goalY, this.orbitRadius);
    this.gfx.stroke({ width: 0.5, color: 0x00ffe7, alpha: 0.08 });

    const startAngle = this.paddleAngle - this.paddleArc / 2;
    const endAngle = this.paddleAngle + this.paddleArc / 2;
    this.gfx.moveTo(
      goalX + Math.cos(startAngle) * this.orbitRadius,
      goalY + Math.sin(startAngle) * this.orbitRadius,
    );
    this.gfx.arc(goalX, goalY, this.orbitRadius, startAngle, endAngle);
    this.gfx.stroke({ width: lineWidth, color, alpha: 0.9 });
  }
}
