import { Room, Client } from "colyseus";
import { GameRoomState, PlayerSchema } from "../schema";
import { clearRoom } from "../audioStore";
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
  MAX_BALL_SPEED,
  DEFAULT_LIVES,
  ARENA_RADIUS,
  TICK_RATE,
  PADDLE_WIDTH_RATIO,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "shared";
import type { Edge, Vector2, ArenaConfig } from "shared";

export class GameRoom extends Room {
  state = new GameRoomState();
  maxClients = MAX_PLAYERS;

  private edges: Edge[] = [];
  private arenaConfig!: ArenaConfig;
  private ballRadius = BALL_RADIUS;
  private ballHitDistSq = (BALL_RADIUS + 4) ** 2;
  private prevPaddlePositions = new Map<string, number>();
  private audioSessionIds = new Set<string>();
  private playersByEdge = new Map<number, PlayerSchema>();
  private ballVx = 0;
  private ballVy = 0;

  messages = {
    "paddle_input": (client: Client, data: { position: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && !player.eliminated && this.state.phase === "playing") {
        player.paddlePosition = Math.max(0, Math.min(1, data.position));
      }
    },

    "player_ready": (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (player && this.state.phase === "waiting") {
        player.ready = !player.ready;
        this.checkAllReady();
      }
    },

    "audio_uploaded": (client: Client) => {
      this.audioSessionIds.add(client.sessionId);
      this.broadcast("audio_ready", { sessionId: client.sessionId }, { except: client });
    },
  };

  onCreate(_options: any) {
    this.state.maxPlayers = MAX_PLAYERS;
    this.maxClients = MAX_PLAYERS;
    console.log(`[GameRoom] Created (up to ${MAX_PLAYERS} players)`);
  }

  onJoin(client: Client, options: { name?: string }) {
    const idx = this.state.players.size;
    const player = new PlayerSchema();
    player.sessionId = client.sessionId;
    player.name = options.name || `Player ${idx + 1}`;
    player.colorIndex = idx;
    player.lives = DEFAULT_LIVES;
    player.paddlePosition = 0.5;

    this.state.players.set(client.sessionId, player);

    this.audioSessionIds.forEach((sid) => {
      client.send("audio_ready", { sessionId: sid });
    });

    console.log(`[GameRoom] ${player.name} joined (${this.state.players.size}/${this.state.maxPlayers})`);
  }

  onLeave(client: Client, code?: number) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    console.log(`[GameRoom] ${player.name} left (code: ${code})`);

    if (this.state.phase === "playing") {
      player.eliminated = true;
      player.lives = 0;
      this.checkWinCondition();
    } else {
      this.state.players.delete(client.sessionId);
    }
  }

  onDispose() {
    clearRoom(this.roomId);
    console.log("[GameRoom] Disposed");
  }

  private checkAllReady() {
    if (this.state.players.size < MIN_PLAYERS) return;

    let allReady = true;
    this.state.players.forEach((player) => {
      if (!player.ready) allReady = false;
    });

    if (allReady) {
      this.startGame();
    }
  }

  private startGame() {
    this.arenaConfig = getArenaConfig(this.state.players.size);
    this.state.numSides = this.arenaConfig.numSides;
    this.state.arenaRadius = ARENA_RADIUS;
    this.state.phase = "playing";

    this.edges = computeEdges(this.arenaConfig.numSides, this.state.arenaRadius);

    let idx = 0;
    this.state.players.forEach((player) => {
      player.edgeIndex = this.arenaConfig.edgeAssignments[idx];
      idx++;
    });

    this.resetBall();

    console.log(`[GameRoom] Game started with ${this.state.players.size} players on ${this.arenaConfig.numSides}-sided arena`);
    this.setSimulationInterval(() => this.gameLoop(), 1000 / TICK_RATE);
  }

  private gameLoop() {
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
    this.state.ball.x = 0;
    this.state.ball.y = 0;

    const alivePlayers: PlayerSchema[] = [];
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
      const angle = Math.random() * Math.PI * 2;
      this.ballVx = Math.cos(angle) * BALL_SPEED;
      this.ballVy = Math.sin(angle) * BALL_SPEED;
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

      const endpoints = getPaddleEndpoints(player.paddlePosition, edge, PADDLE_WIDTH_RATIO);
      if (ballNearSegment(bx, by, endpoints.start, endpoints.end, this.ballHitDistSq)) {
        this.reflectBall(edge.normal);
        this.applyPaddleSpin(player, edge);
        this.pushBallIn(edge);
        this.broadcast("paddle_hit", { sessionId: player.sessionId });
        continue;
      }

      if (ballPassedEdge(bx, by, this.ballRadius, edge)) {
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
    const clamped = clampSpeed(v.x, v.y, MAX_BALL_SPEED);
    this.ballVx = clamped.x;
    this.ballVy = clamped.y;
  }

  private applyPaddleSpin(player: PlayerSchema, edge: Edge) {
    const prev = this.prevPaddlePositions.get(player.sessionId) ?? player.paddlePosition;
    const velocity_t = player.paddlePosition - prev;
    const speed = velocity_t * edge.length;
    const influence = 0.6;
    this.ballVx += Math.cos(edge.angle) * speed * influence;
    this.ballVy += Math.sin(edge.angle) * speed * influence;
    const clamped = clampSpeed(this.ballVx, this.ballVy, MAX_BALL_SPEED);
    this.ballVx = clamped.x;
    this.ballVy = clamped.y;
  }

  private pushBallIn(edge: { normal: Vector2 }) {
    this.state.ball.x -= edge.normal.x * 2;
    this.state.ball.y -= edge.normal.y * 2;
  }

  private checkWinCondition() {
    const alivePlayers: PlayerSchema[] = [];
    this.state.players.forEach((player) => {
      if (!player.eliminated) alivePlayers.push(player);
    });

    if (alivePlayers.length <= 1) {
      const lastAlive = alivePlayers[0] ?? null;
      this.state.phase = "ended";
      this.state.winnerId = lastAlive?.sessionId ?? "";
      this.state.winnerName = lastAlive?.name ?? "Nobody";
      console.log(`[GameRoom] Game over — ${this.state.winnerName} wins!`);

      this.broadcast("game_over", {
        winnerId: this.state.winnerId,
        winnerName: this.state.winnerName,
      });
    }
  }
}
