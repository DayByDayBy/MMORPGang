import { Graphics, Container } from "pixi.js";
import { CLASSIC_PADDLE_WIDTH_RATIO, PLAYER_COLORS, getPaddleEndpoints } from "shared";
import type { Edge } from "shared";

export class ClassicPaddle extends Container {
  public position_t = 0.5;
  public velocity_t = 0;
  public edgeIndex: number;
  public colorIndex: number;
  public widthRatio: number;

  private gfx = new Graphics();
  private edge!: Edge;
  private tangentVelocity = { x: 0, y: 0 };
  private serverPosition_t = 0.5;

  constructor(edgeIndex: number, colorIndex: number, widthRatio = CLASSIC_PADDLE_WIDTH_RATIO) {
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

  public getTangentVelocity(): Readonly<{ x: number; y: number }> {
    if (!this.edge) {
      this.tangentVelocity.x = 0;
      this.tangentVelocity.y = 0;
      return this.tangentVelocity;
    }
    const speed = this.velocity_t * this.edge.length;
    this.tangentVelocity.x = Math.cos(this.edge.angle) * speed;
    this.tangentVelocity.y = Math.sin(this.edge.angle) * speed;
    return this.tangentVelocity;
  }

  public getEndpoints() {
    return getPaddleEndpoints(this.position_t, this.edge, this.widthRatio);
  }

  public syncPosition(serverPosition: number) {
    this.serverPosition_t = serverPosition;
  }

  public interpolate() {
    this.position_t += (this.serverPosition_t - this.position_t) * 0.5;
    this.updatePosition();
  }
}


