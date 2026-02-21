import { Graphics, Container } from "pixi.js";
import { GOALS_GOAL_RADIUS } from "shared";

export class GoalsGoal extends Container {
  private gfx = new Graphics();
  private goalRadius: number;

  constructor(goalRadius: number = GOALS_GOAL_RADIUS) {
    super();
    this.goalRadius = goalRadius;
    this.addChild(this.gfx);
  }

  public render(goalX: number, goalY: number, alive: boolean) {
    this.gfx.clear();
    const color = alive ? 0x00ffe7 : 0xff3344;
    this.gfx.circle(goalX, goalY, this.goalRadius);
    this.gfx.fill({ color, alpha: 0.15 });
    this.gfx.stroke({ width: 2, color, alpha: 0.8 });
  }
}
