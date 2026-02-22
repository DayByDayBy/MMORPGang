import { ClassicPlayerSchema, ClassicGameRoomState } from "../schema/classic";
import { BaseGameRoom } from "./BaseGameRoom";
import {
  computeEdges,
  getArenaConfig,
  classicPhysicsStep,
  BALL_SPEED,
  DEFAULT_LIVES,
  CLASSIC_ARENA_RADIUS,
} from "shared";
import type { Edge, ArenaConfig, ClassicSimPlayer } from "shared";

export class ClassicGameRoom extends BaseGameRoom {
  state = new ClassicGameRoomState();

  protected get typedState() { return this.state; }

  private edges: Edge[] = [];
  private arenaConfig!: ArenaConfig;
  private prevPaddlePositions = new Map<string, number>();

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

    const simPlayers: ClassicSimPlayer[] = [];
    const sessionIds: string[] = [];
    this.state.players.forEach((player, sid) => {
      simPlayers.push({
        edgeIndex: player.edgeIndex,
        paddlePosition: player.paddlePosition,
        prevPaddlePosition: this.prevPaddlePositions.get(sid) ?? player.paddlePosition,
        eliminated: player.eliminated,
      });
      sessionIds.push(sid);
    });

    const result = classicPhysicsStep({
      ball: { x: this.state.ball.x, y: this.state.ball.y, vx: this.ballVx, vy: this.ballVy },
      edges: this.edges,
      players: simPlayers,
      arenaRadius: this.state.arenaRadius,
    });

    for (const event of result.events) {
      const sid = sessionIds[event.playerIndex];
      if (event.type === "paddle_hit") {
        this.broadcast("paddle_hit", { sessionId: sid });
      } else if (event.type === "scored") {
        const player = this.state.players.get(sid)!;
        player.lives--;
        this.broadcast("player_scored", { scoredOnId: sid });
        if (player.lives <= 0) {
          player.eliminated = true;
          this.checkWinCondition();
        }
      }
    }

    if (result.ballReset) {
      this.resetBall();
    } else {
      this.state.ball.x = result.ball.x;
      this.state.ball.y = result.ball.y;
      this.ballVx = result.ball.vx;
      this.ballVy = result.ball.vy;
    }

    this.state.ball.vx = this.ballVx;
    this.state.ball.vy = this.ballVy;

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
}
