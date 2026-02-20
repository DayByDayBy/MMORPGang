import { Graphics, Container } from "pixi.js";
import { PADDLE_WIDTH_RATIO, PLAYER_COLORS } from "shared";
import type { Edge } from "shared";

export class Paddle extends Container {
  public position_t = 0.5; // 0..1 along the edge
  public velocity_t = 0;   // change in position_t per frame
  public edgeIndex: number;
  public colorIndex: number;
  public widthRatio: number;

  private gfx = new Graphics();
  private edge!: Edge;

  constructor(edgeIndex: number, colorIndex: number, widthRatio = PADDLE_WIDTH_RATIO) {
    super();
    this.edgeIndex = edgeIndex;
    this.colorIndex = colorIndex;
    this.widthRatio = widthRatio;
    this.addChild(this.gfx);
  }

  public setEdge(edge: Edge) {
    this.edge = edge;
    this.draw();
  }

  public move(delta: number) {
    const prev = this.position_t;
    const halfWidth = this.widthRatio / 2;
    this.position_t = Math.max(halfWidth, Math.min(1 - halfWidth, this.position_t + delta));
    this.velocity_t = this.position_t - prev;
    this.updatePosition();
  }

  public updatePosition() {
    if (!this.edge) return;
    const { start, end, angle } = this.edge;
    const cx = start.x + (end.x - start.x) * this.position_t;
    const cy = start.y + (end.y - start.y) * this.position_t;

    this.x = cx;
    this.y = cy;
    this.rotation = angle;
  }

  private draw() {
    const color = PLAYER_COLORS[this.colorIndex % PLAYER_COLORS.length];
    const halfLen = (this.edge.length * this.widthRatio) / 2;
    const thickness = 8;

    this.gfx.clear();

    this.gfx.roundRect(-halfLen, -thickness / 2, halfLen * 2, thickness, 4);
    this.gfx.fill({ color });

    this.gfx.roundRect(-halfLen - 1, -thickness / 2 - 1, halfLen * 2 + 2, thickness + 2, 5);
    this.gfx.stroke({ width: 1, color: 0xffffff, alpha: 0.3 });

    this.updatePosition();
  }

  public getTangentVelocity(): { x: number; y: number } {
    if (!this.edge) return { x: 0, y: 0 };
    const speed = this.velocity_t * this.edge.length;
    return {
      x: Math.cos(this.edge.angle) * speed,
      y: Math.sin(this.edge.angle) * speed,
    };
  }

  public getPaddleEndpoints(): { start: { x: number; y: number }; end: { x: number; y: number } } {
    const halfLen = (this.edge.length * this.widthRatio) / 2;
    const cos = Math.cos(this.edge.angle);
    const sin = Math.sin(this.edge.angle);
    return {
      start: { x: this.x - cos * halfLen, y: this.y - sin * halfLen },
      end: { x: this.x + cos * halfLen, y: this.y + sin * halfLen },
    };
  }
}
