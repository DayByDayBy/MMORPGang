import { ClassicPlayerSchema, ClassicGameRoomState } from "../schema/classic";
import { BaseGameRoom } from "./BaseGameRoom";
import {
  computeEdges,
  getArenaConfig,
  ballNearSegment,
  ballPassedEdge,
  reflectVelocity,
  clampSpeed,
  getPaddleEndpoints,
  BALL_SPEED,
  BALL_RADIUS,
  CLASSIC_MAX_BALL_SPEED,
  DEFAULT_LIVES,
  CLASSIC_ARENA_RADIUS,
  CLASSIC_PADDLE_WIDTH_RATIO,
} from "shared";
import type { Edge, Vector2, ArenaConfig } from "shared";

export class ClassicGameRoom extends BaseGameRoom {
  state = new ClassicGameRoomState();

  protected get typedState() { return this.state; }

  private edges: Edge[] = [];
  private arenaConfig!: ArenaConfig;
  private ballHitDistSq = (BALL_RADIUS + 4) ** 2;
  private prevPaddlePositions = new Map<string, number>();
  private playersByEdge = new Map<number, ClassicPlayerSchema>();

  protected getPlayers() {
    return this.state.players;
  }

  protected createPlayer(sessionId: string, name: string, index: number): ClassicPlayerSchema {
    const player = new ClassicPlayerSchema();
    player.sessionId = sessionId;
    player.name = name;
    player.colorIndex = index;
    player.lives = DEFAULT_LIVES;
    player.paddlePosition = 0.5;
    return player;
  }

  protected handlePaddleInput(player: ClassicPlayerSchema, data: { position: number }) {
    player.paddlePosition = Math.max(0, Math.min(1, data.position));
  }

  onCreate(options: any) {
    super.onCreate(options);
    this.state.mode = "classic";
  }

  protected startGame() {
    this.arenaConfig = getArenaConfig(this.state.players.size);
    this.state.numSides = this.arenaConfig.numSides;
    this.state.arenaRadius = CLASSIC_ARENA_RADIUS;
    this.state.phase = "playing";

    this.edges = computeEdges(this.arenaConfig.numSides, this.state.arenaRadius);

    let idx = 0;
    this.state.players.forEach((player) => {
      player.edgeIndex = this.arenaConfig.edgeAssignments[idx];
      idx++;
    });

    this.resetBall();

    console.log(`[ClassicGameRoom] Game started with ${this.state.players.size} players on ${this.arenaConfig.numSides}-sided arena`);
    this.startSimulation();
  }

  protected gameLoop() {
    if (this.state.phase !== "playing") return;

    this.state.ball.x += this.ballVx;
    this.state.ball.y += this.ballVy;

    this.checkCollisions();

    const dist = Math.sqrt(this.state.ball.x ** 2 + this.state.ball.y ** 2);
    if (dist > this.state.arenaRadius * 1.5) {
      this.resetBall();
    }

    this.state.players.forEach((player, id) => {
      this.prevPaddlePositions.set(id, player.paddlePosition);
    });
  }

  private resetBall() {
    this.resetBallToCenter();

    const alivePlayers: ClassicPlayerSchema[] = [];
    this.state.players.forEach((p) => {
      if (!p.eliminated) alivePlayers.push(p);
    });

    const target = alivePlayers.length > 0
      ? alivePlayers[Math.floor(Math.random() * alivePlayers.length)]
      : null;

    if (target) {
      const edge = this.edges[target.edgeIndex];
      const mx = edge.midpoint.x;
      const my = edge.midpoint.y;
      const dist = Math.sqrt(mx * mx + my * my) || 1;
      this.ballVx = (mx / dist) * BALL_SPEED;
      this.ballVy = (my / dist) * BALL_SPEED;
    } else {
      this.launchBallRandom();
    }
  }

  private checkCollisions() {
    this.buildPlayersByEdge();
    const { x: bx, y: by } = this.state.ball;

    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i];
      const player = this.playersByEdge.get(i);

      if (!player || player.eliminated) {
        if (ballNearSegment(bx, by, edge.start, edge.end, this.ballHitDistSq)) {
          this.reflectBall(edge.normal);
          this.pushBallIn(edge);
        }
        continue;
      }

      const endpoints = getPaddleEndpoints(player.paddlePosition, edge, CLASSIC_PADDLE_WIDTH_RATIO);
      if (ballNearSegment(bx, by, endpoints.start, endpoints.end, this.ballHitDistSq)) {
        this.reflectBall(edge.normal);
        this.applyPaddleSpin(player, edge);
        this.pushBallIn(edge);
        this.broadcast("paddle_hit", { sessionId: player.sessionId });
        continue;
      }

      if (ballPassedEdge(bx, by, BALL_RADIUS, edge)) {
        player.lives--;
        this.broadcast("player_scored", { scoredOnId: player.sessionId });

        if (player.lives <= 0) {
          player.eliminated = true;
          this.checkWinCondition();
        }
        this.resetBall();
        break;
      }
    }
  }

  private buildPlayersByEdge() {
    this.playersByEdge.clear();
    this.state.players.forEach((player) => {
      this.playersByEdge.set(player.edgeIndex, player);
    });
  }

  private reflectBall(normal: Vector2) {
    const v = reflectVelocity(this.ballVx, this.ballVy, normal);
    const clamped = clampSpeed(v.x, v.y, CLASSIC_MAX_BALL_SPEED);
    this.ballVx = clamped.x;
    this.ballVy = clamped.y;
  }

  private applyPaddleSpin(player: ClassicPlayerSchema, edge: Edge) {
    const prev = this.prevPaddlePositions.get(player.sessionId) ?? player.paddlePosition;
    const velocity_t = player.paddlePosition - prev;
    const speed = velocity_t * edge.length;
    const influence = 0.6;
    this.ballVx += Math.cos(edge.angle) * speed * influence;
    this.ballVy += Math.sin(edge.angle) * speed * influence;
    const clamped = clampSpeed(this.ballVx, this.ballVy, CLASSIC_MAX_BALL_SPEED);
    this.ballVx = clamped.x;
    this.ballVy = clamped.y;
  }

  private pushBallIn(edge: { normal: Vector2 }) {
    this.state.ball.x -= edge.normal.x * 2;
    this.state.ball.y -= edge.normal.y * 2;
  }
}
