import { Graphics, Container } from "pixi.js";
import { PLAYER_COLORS, ARENA_RADIUS, computeEdges, computeVertices, getArenaConfig } from "shared";
import type { Vector2, Edge, ArenaConfig } from "shared";

export class Arena extends Container {
  public edges: Edge[] = [];
  public config: ArenaConfig;
  public radius: number;
  private bg = new Graphics();

  constructor(playerCount: number, radius: number = ARENA_RADIUS) {
    super();
    this.config = getArenaConfig(playerCount);
    this.radius = radius;
    this.edges = computeEdges(this.config.numSides, this.radius);
    this.addChild(this.bg);
    this.draw(playerCount);
  }

  private draw(playerCount: number) {
    this.bg.clear();

    const assigned = new Set(this.config.edgeAssignments);

    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i];
      const playerIdx = this.config.edgeAssignments.indexOf(i);
      const isWall = playerIdx === -1;

      const color = isWall ? "#444444" : PLAYER_COLORS[playerIdx % PLAYER_COLORS.length];
      this.bg.moveTo(edge.start.x, edge.start.y);
      this.bg.lineTo(edge.end.x, edge.end.y);
      this.bg.stroke({ width: isWall ? 2 : 3, color, alpha: isWall ? 0.3 : 0.6 });
    }

    const v = computeVertices(this.config.numSides, this.radius);
    this.bg.moveTo(v[0].x, v[0].y);
    for (let i = 1; i < v.length; i++) {
      this.bg.lineTo(v[i].x, v[i].y);
    }
    this.bg.closePath();
    this.bg.fill({ color: 0x111122, alpha: 0.4 });
  }

  public pointToEdge(edgeIndex: number, t: number): Vector2 {
    const edge = this.edges[edgeIndex];
    return {
      x: edge.start.x + (edge.end.x - edge.start.x) * t,
      y: edge.start.y + (edge.end.y - edge.start.y) * t,
    };
  }
}
