import { Application, Container, Ticker } from "pixi.js";
import { DEFAULT_LIVES, CLASSIC_ARENA_RADIUS, CLASSIC_PADDLE_SPEED, BOT_EMOJI, ballNearSegment, ballPassedEdge } from "shared";
import type { Edge } from "shared";
import type { HudPlayer } from "../GameHud";
import { ClassicArena } from "./ClassicArena";
import { ClassicPaddle } from "./ClassicPaddle";
import { Ball } from "../Ball";
import { AudioManager } from "../AudioManager";

interface AIState {
  aggressiveness: number;
  speed: number;
  roamTarget: number;
  roamTimer: number;
}

interface PlayerState {
  paddle: ClassicPaddle;
  lives: number;
  eliminated: boolean;
  edgeIndex: number;
  name: string;
  emoji: string;
  ai?: AIState;
}

export class ClassicGame {
  private app: Application;
  private arena!: ClassicArena;
  private ball!: Ball;
  private players: PlayerState[] = [];
  private playersByEdge = new Map<number, PlayerState>();
  private world = new Container();
  private keys = new Set<string>();
  private tickAccumulator = 0;
  private running = false;
  private onGameOver?: (winnerName: string | null) => void;
  private ballHitDistSq = 0;
  private hudDirty = true;
  private audio = new AudioManager();
  private onHudUpdate: (players: HudPlayer[]) => void;

  constructor(app: Application, onHudUpdate: (players: HudPlayer[]) => void) {
    this.app = app;
    this.onHudUpdate = onHudUpdate;
  }

  async init(playerCount: number, playerName: string, playerEmoji: string, onGameOver: (winnerName: string | null) => void) {
    this.onGameOver = onGameOver;
    this.app.stage.addChild(this.world);

    this.world.x = this.app.screen.width / 2;
    this.world.y = this.app.screen.height / 2;

    const maxFitRadius = Math.min(this.app.screen.width, this.app.screen.height) * 0.38;
    const scale = Math.min(1, maxFitRadius / CLASSIC_ARENA_RADIUS);
    this.world.scale.set(scale, scale);

    this.arena = new ClassicArena(playerCount, CLASSIC_ARENA_RADIUS);
    this.world.addChild(this.arena);

    this.ball = new Ball();
    this.world.addChild(this.ball);
    this.ballHitDistSq = (this.ball.radius + 4) ** 2;

    const { edgeAssignments } = this.arena.config;

    for (let i = 0; i < playerCount; i++) {
      const edgeIdx = edgeAssignments[i];
      const paddle = new ClassicPaddle(i, i);
      paddle.setEdge(this.arena.edges[edgeIdx]);
      this.world.addChild(paddle);

      const player: PlayerState = {
        paddle,
        lives: DEFAULT_LIVES,
        eliminated: false,
        edgeIndex: edgeIdx,
        name: i === 0 ? playerName : `Bot ${i}`,
        emoji: i === 0 ? playerEmoji : BOT_EMOJI,
        ai: i === 0 ? undefined : {
          aggressiveness: 0.3 + Math.random() * 0.7,
          speed: CLASSIC_PADDLE_SPEED,
          roamTarget: 0.5,
          roamTimer: 0,
        },
      };
      this.players.push(player);
      this.playersByEdge.set(edgeIdx, player);
    }

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.emitHud();
    this.launchBall();
    this.running = true;
    this.app.ticker.add(this.gameLoop);

    await this.audio.init();
    await this.audio.resume();
    this.audio.startSoundtrack();
  }

  private onKeyDown = (e: KeyboardEvent) => this.keys.add(e.key.toLowerCase());
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());

  private gameLoop = (ticker: Ticker) => {
    if (!this.running) return;
    this.tickAccumulator += ticker.deltaTime;
    if (this.tickAccumulator >= 1) {
      this.tickAccumulator -= 1;
      this.handleInput();
      this.updateAI();
      this.ball.update();
      this.checkCollisions();
      this.checkOutOfBounds();
      if (this.hudDirty) {
        this.emitHud();
        this.hudDirty = false;
      }
    }
  };

  private checkOutOfBounds() {
    const dist = Math.sqrt(this.ball.x ** 2 + this.ball.y ** 2);
    if (dist > this.arena.radius * 1.5) {
      this.launchBall();
    }
  }

  private handleInput() {
    const player = this.players[0];
    if (player.eliminated) return;
    if (this.keys.has("a") || this.keys.has("arrowleft")) player.paddle.move(-CLASSIC_PADDLE_SPEED);
    if (this.keys.has("d") || this.keys.has("arrowright")) player.paddle.move(CLASSIC_PADDLE_SPEED);
  }

  private updateAI() {
    for (let i = 1; i < this.players.length; i++) {
      const player = this.players[i];
      if (player.eliminated || !player.ai) continue;
      const ai = player.ai;

      const edge = this.arena.edges[player.edgeIndex];
      const edgeDx = edge.end.x - edge.start.x;
      const edgeDy = edge.end.y - edge.start.y;

      const ballRelX = this.ball.x - edge.start.x;
      const ballRelY = this.ball.y - edge.start.y;
      const ballProj = Math.max(0, Math.min(1,
        (ballRelX * edgeDx + ballRelY * edgeDy) / (edge.length * edge.length),
      ));

      const distToEdge = -(ballRelX * edge.normal.x + ballRelY * edge.normal.y);
      const approachSpeed = -(this.ball.velocity.x * edge.normal.x + this.ball.velocity.y * edge.normal.y);

      const close = distToEdge > 0 && distToEdge < this.arena.radius * 0.7;
      const approaching = approachSpeed > 0 && distToEdge > 0;
      const defend = close || approaching;

      let goalT: number;

      if (defend) {
        const offset = (ballProj > 0.5 ? 1 : -1) * 0.06 * ai.aggressiveness;
        goalT = ballProj + offset;
      } else {
        ai.roamTimer--;
        if (ai.roamTimer <= 0) {
          ai.roamTarget = 0.25 + Math.random() * 0.5;
          ai.roamTimer = 40 + Math.floor(Math.random() * 80);
        }
        goalT = ai.roamTarget;
      }

      goalT = Math.max(0.05, Math.min(0.95, goalT));
      const diff = goalT - player.paddle.position_t;
      const moveSpeed = ai.speed;

      if (Math.abs(diff) > 0.005) {
        player.paddle.move(Math.sign(diff) * Math.min(moveSpeed, Math.abs(diff)));
      }
    }
  }

  private checkCollisions() {
    const bx = this.ball.x;
    const by = this.ball.y;

    for (let i = 0; i < this.arena.edges.length; i++) {
      const edge = this.arena.edges[i];
      const player = this.playersByEdge.get(i);

      if (!player || player.eliminated) {
        if (ballNearSegment(bx, by, edge.start, edge.end, this.ballHitDistSq)) {
          this.ball.reflect(edge.normal);
          this.pushBallIn(edge);
        }
        continue;
      }

      const endpoints = player.paddle.getEndpoints();
      if (ballNearSegment(bx, by, endpoints.start, endpoints.end, this.ballHitDistSq)) {
        this.ball.reflect(edge.normal);
        this.ball.addSpin(player.paddle.getTangentVelocity());
        this.pushBallIn(edge);
        this.audio.playBoomp();
        continue;
      }

      if (ballPassedEdge(bx, by, this.ball.radius, edge)) {
        player.lives--;
        this.hudDirty = true;
        if (player.lives <= 0) {
          player.eliminated = true;
          player.paddle.visible = false;

          if (player === this.players[0]) {
            this.running = false;
            this.audio.stopSoundtrack();
            this.audio.playGameEnd();
            this.onGameOver?.(null);
            return;
          }

          this.checkWinCondition();
        }
        this.launchBall();
        break;
      }
    }
  }

  private pushBallIn(edge: Edge) {
    this.ball.x -= edge.normal.x * 2;
    this.ball.y -= edge.normal.y * 2;
  }

  private launchBall() {
    let aliveCount = 0;
    let picked: PlayerState | undefined;
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].eliminated) continue;
      aliveCount++;
      if (Math.random() < 1 / aliveCount) picked = this.players[i];
    }
    if (picked) {
      const edge = this.arena.edges[picked.edgeIndex];
      this.ball.launch(edge.midpoint);
    }
  }

  private checkWinCondition() {
    let aliveCount = 0;
    let lastAlive: PlayerState | undefined;
    for (let i = 0; i < this.players.length; i++) {
      if (!this.players[i].eliminated) {
        aliveCount++;
        lastAlive = this.players[i];
      }
    }
    if (aliveCount <= 1) {
      this.running = false;
      this.audio.stopSoundtrack();
      const isLocalPlayerWin = lastAlive === this.players[0];
      if (isLocalPlayerWin) {
        this.audio.playWin();
      } else {
        this.audio.playGameEnd();
      }
      this.onGameOver?.(lastAlive?.name ?? "Nobody");
    }
  }

  private emitHud() {
    this.onHudUpdate(this.players.map((p, i) => ({
      name: p.name,
      emoji: p.emoji,
      lives: p.lives,
      eliminated: p.eliminated,
      colorIndex: i,
      isLocal: i === 0,
    })));
  }

  destroy() {
    this.running = false;
    this.app.ticker.remove(this.gameLoop);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.world.destroy({ children: true });
    this.audio.destroy();
  }
}
