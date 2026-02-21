import { Application, Container, Text, TextStyle, Ticker } from "pixi.js";
import { DEFAULT_LIVES, PLAYER_COLORS, ARENA_RADIUS, ballNearSegment, ballPassedEdge } from "shared";
import type { Edge } from "shared";
import { Arena } from "./Arena";
import { Paddle } from "./Paddle";
import { Ball } from "./Ball";
import { AudioManager } from "./AudioManager";

interface AIState {
  aggressiveness: number; // 0..1 — how much they overshoot to apply spin
  speed: number;          // paddle move speed per frame
  roamTarget: number;     // where to drift when ball is far away
  roamTimer: number;      // frames until picking a new roam target
}

interface PlayerState {
  paddle: Paddle;
  lives: number;
  eliminated: boolean;
  edgeIndex: number;
  name: string;
  ai?: AIState;
}

export class Game {
  private app: Application;
  private arena!: Arena;
  private ball!: Ball;
  private players: PlayerState[] = [];
  private playersByEdge = new Map<number, PlayerState>();
  private world = new Container();
  private hud = new Container();
  private hudTexts: Text[] = [];
  private keys = new Set<string>();
  private tickAccumulator = 0;
  private running = false;
  private onGameOver?: (winnerName: string | null) => void;
  private ballHitDistSq = 0;
  private hudDirty = true;
  private audio = new AudioManager();

  constructor(app: Application) {
    this.app = app;
  }

  async init(playerCount: number, playerName: string, onGameOver: (winnerName: string | null) => void) {
    this.onGameOver = onGameOver;
    this.app.stage.addChild(this.world);
    this.app.stage.addChild(this.hud);

    this.world.x = this.app.screen.width / 2;
    this.world.y = this.app.screen.height / 2;

    const maxFitRadius = Math.min(this.app.screen.width, this.app.screen.height) * 0.38;
    const scale = Math.min(1, maxFitRadius / ARENA_RADIUS);
    this.world.scale.set(scale, scale);

    this.arena = new Arena(playerCount, ARENA_RADIUS);
    this.world.addChild(this.arena);

    this.ball = new Ball();
    this.world.addChild(this.ball);
    this.ballHitDistSq = (this.ball.radius + 4) ** 2;

    const { edgeAssignments } = this.arena.config;

    for (let i = 0; i < playerCount; i++) {
      const edgeIdx = edgeAssignments[i];
      const paddle = new Paddle(i, i);
      paddle.setEdge(this.arena.edges[edgeIdx]);
      this.world.addChild(paddle);

      const player: PlayerState = {
        paddle,
        lives: DEFAULT_LIVES,
        eliminated: false,
        edgeIndex: edgeIdx,
        name: i === 0 ? playerName : `Bot ${i}`,
        ai: i === 0 ? undefined : {
          aggressiveness: 0.3 + Math.random() * 0.7,
          speed: 0.02,
          roamTarget: 0.5,
          roamTimer: 0,
        },
      };
      this.players.push(player);
      this.playersByEdge.set(edgeIdx, player);
    }

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.buildHud();
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
        this.updateHud();
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
    const speed = 0.02;
    if (this.keys.has("a") || this.keys.has("arrowleft")) player.paddle.move(-speed);
    if (this.keys.has("d") || this.keys.has("arrowright")) player.paddle.move(speed);
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
        this.audio.playBoop();
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

  private buildHud() {
    const style = new TextStyle({
      fontFamily: "Segoe UI, system-ui, sans-serif",
      fontSize: 14,
      fontWeight: "bold",
    });

    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      const text = new Text({
        text: `${p.name}: ${"♥".repeat(p.lives)}`,
        style: { ...style, fill: PLAYER_COLORS[i % PLAYER_COLORS.length] },
      });
      text.x = 16;
      text.y = 16 + i * 24;
      this.hud.addChild(text);
      this.hudTexts.push(text);
    }
  }

  private updateHud() {
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      this.hudTexts[i].text = `${p.name}: ${p.eliminated ? "OUT" : "♥".repeat(p.lives)}`;
    }
  }

  destroy() {
    this.running = false;
    this.app.ticker.remove(this.gameLoop);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.world.destroy({ children: true });
    this.hud.destroy({ children: true });
    this.audio.destroy();
  }
}
