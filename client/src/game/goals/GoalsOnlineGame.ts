import { Application, Container, Ticker } from "pixi.js";
import {
  GOALS_ARENA_RADIUS,
  GOALS_GOAL_RING_RADIUS,
  GOALS_GOAL_RADIUS,
  GOALS_ORBIT_RADIUS,
  GOALS_PADDLE_ARC,
  BALL_RADIUS,
  angleDiff,
} from "shared";
import type { GoalsGameState, GoalsPlayerState, BallState } from "shared";
import type { Room } from "@colyseus/sdk";
import type { HudPlayer } from "../GameHud";
import { SERVER_URL } from "../../network/client";
import { GoalsArena } from "./GoalsArena";
import { GoalsGoal } from "./GoalsGoal";
import { GoalsPaddle } from "./GoalsPaddle";
import { Ball } from "../Ball";
import { AudioManager } from "../AudioManager";

const SNAP_DIST_SQ = 400;
const CORRECTION_DECAY = 6;

interface RemotePlayer {
  sessionId: string;
  name: string;
  emoji: string;
  colorIndex: number;
  goalAngle: number;
  paddleAngle: number;
  orbitRadius: number;
  lives: number;
  eliminated: boolean;
  paddle: GoalsPaddle;
  goal: GoalsGoal;
}

export class GoalsOnlineGame {
  private app: Application;
  private room: Room<GoalsGameState>;
  private arena!: GoalsArena;
  private ball!: Ball;
  private players = new Map<string, RemotePlayer>();
  private world = new Container();
  private keys = new Set<string>();
  private onGameOver?: (winnerName: string) => void;
  private onEliminated?: () => void;
  private localEliminated = false;
  private destroyed = false;
  private audio = new AudioManager();
  private playerSounds = new Map<string, AudioBuffer>();
  private localInput = { left: false, right: false, up: false, down: false };
  private onHudUpdate: (players: HudPlayer[]) => void;

  private predictedBall: BallState = { x: 0, y: 0, vx: 0, vy: 0 };
  private correctionX = 0;
  private correctionY = 0;
  private tickAccumulator = 0;

  constructor(app: Application, room: Room<GoalsGameState>, onHudUpdate: (players: HudPlayer[]) => void) {
    this.app = app;
    this.room = room;
    this.onHudUpdate = onHudUpdate;
  }

  async init(onGameOver: (winnerName: string) => void, onEliminated?: () => void) {
    this.onGameOver = onGameOver;
    this.onEliminated = onEliminated;
    this.app.stage.addChild(this.world);

    this.world.x = this.app.screen.width / 2;
    this.world.y = this.app.screen.height / 2;

    const state = this.room.state;
    const arenaRadius = state.arenaRadius || GOALS_ARENA_RADIUS;

    const maxFitRadius = Math.min(this.app.screen.width, this.app.screen.height) * 0.38;
    const scale = Math.min(1, maxFitRadius / arenaRadius);
    this.world.scale.set(scale, scale);

    this.arena = new GoalsArena(arenaRadius);
    this.world.addChild(this.arena);

    this.ball = new Ball();
    this.world.addChild(this.ball);

    state.players.forEach((p: GoalsPlayerState, sessionId: string) => {
      this.addPlayer(sessionId, p);
    });

    this.emitHud();

    this.room.onStateChange(() => {
      if (this.destroyed) return;
      this.syncState();
    });

    this.room.onMessage("game_over", (data: { winnerId: string; winnerName: string }) => {
      this.audio.stopSoundtrack();
      const isMe = data.winnerId === this.room.sessionId;
      if (isMe) {
        this.audio.playWin();
      } else if (!this.localEliminated) {
        this.audio.playGameEnd();
      }
      this.onGameOver?.(data.winnerName);
    });

    this.room.onMessage("audio_ready", async (data: { sessionId: string }) => {
      await this.fetchPlayerAudio(data.sessionId);
    });

    this.room.onMessage("paddle_hit", (data: { sessionId: string }) => {
      this.playPaddleSound(data.sessionId);
    });

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);

    this.app.ticker.add(this.renderLoop);

    await this.audio.init();
    await this.audio.resume();
    this.audio.startSoundtrack();

    state.players.forEach((_p: GoalsPlayerState, sessionId: string) => {
      this.fetchPlayerAudio(sessionId);
    });
  }

  private addPlayer(sessionId: string, p: GoalsPlayerState) {
    const goalRingRadius = (this.room.state as any).goalRingRadius || GOALS_GOAL_RING_RADIUS;
    const goalRadius = (this.room.state as any).goalRadius || GOALS_GOAL_RADIUS;
    const playerOrbitRadius = (p as any).orbitRadius || GOALS_ORBIT_RADIUS;

    const paddle = new GoalsPaddle(p.colorIndex, p.paddleAngle, playerOrbitRadius);
    this.world.addChild(paddle);

    const goal = new GoalsGoal(goalRadius);
    this.world.addChild(goal);

    const goalX = Math.cos(p.goalAngle) * goalRingRadius;
    const goalY = Math.sin(p.goalAngle) * goalRingRadius;

    const isLocal = sessionId === this.room.sessionId;
    goal.render(goalX, goalY, !p.eliminated);
    paddle.render(goalX, goalY, isLocal);

    this.players.set(sessionId, {
      sessionId,
      name: p.name,
      emoji: p.emoji,
      colorIndex: p.colorIndex,
      goalAngle: p.goalAngle,
      paddleAngle: p.paddleAngle,
      orbitRadius: playerOrbitRadius,
      lives: p.lives,
      eliminated: p.eliminated,
      paddle,
      goal,
    });
  }

  private syncState() {
    const state = this.room.state;
    const goalRingRadius = (state as any).goalRingRadius || GOALS_GOAL_RING_RADIUS;

    const errX = state.ball.x - this.predictedBall.x;
    const errY = state.ball.y - this.predictedBall.y;
    const distSq = errX * errX + errY * errY;

    const dot = this.predictedBall.vx * state.ball.vx + this.predictedBall.vy * state.ball.vy;
    const bounced = dot < 0;

    this.predictedBall.vx = state.ball.vx;
    this.predictedBall.vy = state.ball.vy;

    if (distSq > SNAP_DIST_SQ || bounced) {
      this.predictedBall.x = state.ball.x;
      this.predictedBall.y = state.ball.y;
      this.correctionX = 0;
      this.correctionY = 0;
    } else {
      this.correctionX = errX;
      this.correctionY = errY;
    }

    state.players.forEach((p: GoalsPlayerState, sessionId: string) => {
      const rp = this.players.get(sessionId);
      if (!rp) return;

      rp.goalAngle = p.goalAngle;
      rp.paddleAngle = p.paddleAngle;
      rp.orbitRadius = (p as any).orbitRadius || GOALS_ORBIT_RADIUS;
      rp.lives = p.lives;
      rp.eliminated = p.eliminated;

      // Update paddle orbit radius and angle
      rp.paddle.orbitRadius = rp.orbitRadius;
      rp.paddle.paddleAngle = p.paddleAngle;

      const goalX = Math.cos(rp.goalAngle) * goalRingRadius;
      const goalY = Math.sin(rp.goalAngle) * goalRingRadius;

      const isLocal = sessionId === this.room.sessionId;
      rp.goal.render(goalX, goalY, !rp.eliminated);
      rp.paddle.visible = !rp.eliminated;
      if (!rp.eliminated) {
        rp.paddle.render(goalX, goalY, isLocal);
      }
    });

    this.emitHud();

    if (!this.localEliminated) {
      const me = this.players.get(this.room.sessionId);
      if (me?.eliminated) {
        this.localEliminated = true;
        if (state.phase === "playing") {
          this.audio.playGameEnd();
          this.onEliminated?.();
        }
      }
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    this.keys.add(key);
    this.updateInput();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    this.keys.delete(key);
    this.updateInput();
  };

  private updateInput() {
    const left = this.keys.has("a") || this.keys.has("arrowleft");
    const right = this.keys.has("d") || this.keys.has("arrowright");
    const up = this.keys.has("w") || this.keys.has("arrowup");
    const down = this.keys.has("s") || this.keys.has("arrowdown");
    if (left !== this.localInput.left || right !== this.localInput.right || up !== this.localInput.up || down !== this.localInput.down) {
      this.localInput.left = left;
      this.localInput.right = right;
      this.localInput.up = up;
      this.localInput.down = down;
      this.room.send("paddle_input", { left, right, up, down });
    }
  }

  private renderLoop = (ticker: Ticker) => {
    if (this.destroyed) return;
    const dt = ticker.deltaMS / 1000;
    const arenaRadius = (this.room.state as any).arenaRadius || GOALS_ARENA_RADIUS;
    const goalRingRadius = (this.room.state as any).goalRingRadius || GOALS_GOAL_RING_RADIUS;
    const orbitRadius = (this.room.state as any).orbitRadius || GOALS_ORBIT_RADIUS;

    this.tickAccumulator += ticker.deltaTime;
    while (this.tickAccumulator >= 1) {
      this.tickAccumulator -= 1;
      const b = this.predictedBall;
      b.x += b.vx;
      b.y += b.vy;

      // Circular wall bounce (inline, zero alloc)
      const dist = Math.sqrt(b.x * b.x + b.y * b.y);
      if (dist + BALL_RADIUS >= arenaRadius) {
        const nx = b.x / dist;
        const ny = b.y / dist;
        const dot = b.vx * nx + b.vy * ny;
        b.vx -= 2 * dot * nx;
        b.vy -= 2 * dot * ny;
        const safe = arenaRadius - BALL_RADIUS;
        b.x = nx * safe;
        b.y = ny * safe;
      }

      // Paddle bounce (inline, zero alloc)
      for (const [, rp] of this.players) {
        if (rp.eliminated) continue;
        const gx = Math.cos(rp.goalAngle) * goalRingRadius;
        const gy = Math.sin(rp.goalAngle) * goalRingRadius;
        const dx = b.x - gx;
        const dy = b.y - gy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const threshold = BALL_RADIUS * 2;
        const playerOrbitRadius = rp.orbitRadius;
        if (d < playerOrbitRadius - threshold || d > playerOrbitRadius + threshold) continue;
        const bAngle = Math.atan2(dy, dx);
        if (Math.abs(angleDiff(bAngle, rp.paddleAngle)) > GOALS_PADDLE_ARC / 2) continue;
        const len = d || 1;
        const pnx = dx / len;
        const pny = dy / len;
        if (b.vx * pnx + b.vy * pny >= 0) continue;
        const dot = b.vx * pnx + b.vy * pny;
        b.vx -= 2 * dot * pnx;
        b.vy -= 2 * dot * pny;
        const push = playerOrbitRadius + BALL_RADIUS + 1;
        b.x = gx + pnx * push;
        b.y = gy + pny * push;
        break;
      }
    }

    const decay = Math.exp(-CORRECTION_DECAY * dt);
    this.correctionX *= decay;
    this.correctionY *= decay;

    const t = this.tickAccumulator;
    this.ball.x = this.predictedBall.x + this.predictedBall.vx * t + this.correctionX;
    this.ball.y = this.predictedBall.y + this.predictedBall.vy * t + this.correctionY;
  };

  private emitHud() {
    const players: HudPlayer[] = [];
    for (const [, rp] of this.players) {
      players.push({
        name: rp.name,
        emoji: rp.emoji,
        lives: rp.lives,
        eliminated: rp.eliminated,
        colorIndex: rp.colorIndex,
        isLocal: rp.sessionId === this.room.sessionId,
      });
    }
    this.onHudUpdate(players);
  }

  private async fetchPlayerAudio(sessionId: string) {
    try {
      const ctx = this.audio.audioContext;
      if (!ctx) return;

      const resp = await fetch(`${SERVER_URL}/api/audio/${this.room.roomId}/${sessionId}`);
      if (!resp.ok) return;

      const { audio } = await resp.json();
      const binResp = await fetch(audio);
      const buf = await binResp.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);
      this.playerSounds.set(sessionId, decoded);
    } catch {
      // ignore fetch/decode errors
    }
  }

  private playPaddleSound(sessionId: string) {
    const buffer = this.playerSounds.get(sessionId);
    const ctx = this.audio.audioContext;

    if (buffer && ctx) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } else {
      this.audio.playBoomp();
    }
  }

  destroy() {
    this.destroyed = true;
    this.app.ticker.remove(this.renderLoop);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.world.destroy({ children: true });
    this.room.removeAllListeners();
    this.audio.destroy();
  }
}
