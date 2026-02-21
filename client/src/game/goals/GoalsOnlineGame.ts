import { Application, Container, Text, TextStyle } from "pixi.js";
import {
  PLAYER_COLORS,
  GOALS_ARENA_RADIUS,
  GOALS_GOAL_RING_RADIUS,
  GOALS_GOAL_RADIUS,
  GOALS_ORBIT_RADIUS,
  GOALS_ORBIT_SPEED,
} from "shared";
import type { GoalsGameState, GoalsPlayerState } from "shared";
import type { Room } from "@colyseus/sdk";
import { SERVER_URL } from "../../network/client";
import { GoalsArena } from "./GoalsArena";
import { GoalsGoal } from "./GoalsGoal";
import { GoalsPaddle } from "./GoalsPaddle";
import { Ball } from "../Ball";
import { AudioManager } from "../AudioManager";

interface RemotePlayer {
  sessionId: string;
  name: string;
  colorIndex: number;
  goalAngle: number;
  paddleAngle: number;
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
  private hud = new Container();
  private hudTexts: Text[] = [];
  private keys = new Set<string>();
  private onGameOver?: (winnerName: string) => void;
  private onEliminated?: () => void;
  private localEliminated = false;
  private destroyed = false;
  private audio = new AudioManager();
  private playerSounds = new Map<string, AudioBuffer>();
  private localInput = { left: false, right: false };

  constructor(app: Application, room: Room<GoalsGameState>) {
    this.app = app;
    this.room = room;
  }

  async init(onGameOver: (winnerName: string) => void, onEliminated?: () => void) {
    this.onGameOver = onGameOver;
    this.onEliminated = onEliminated;
    this.app.stage.addChild(this.world);
    this.app.stage.addChild(this.hud);

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

    this.buildHud();

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
    const orbitRadius = (this.room.state as any).orbitRadius || GOALS_ORBIT_RADIUS;

    const paddle = new GoalsPaddle(p.colorIndex, p.paddleAngle, orbitRadius);
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
      colorIndex: p.colorIndex,
      goalAngle: p.goalAngle,
      paddleAngle: p.paddleAngle,
      lives: p.lives,
      eliminated: p.eliminated,
      paddle,
      goal,
    });
  }

  private syncState() {
    const state = this.room.state;
    const goalRingRadius = (state as any).goalRingRadius || GOALS_GOAL_RING_RADIUS;

    this.ball.syncState(state.ball);

    state.players.forEach((p: GoalsPlayerState, sessionId: string) => {
      const rp = this.players.get(sessionId);
      if (!rp) return;

      rp.lives = p.lives;
      rp.eliminated = p.eliminated;
      rp.paddleAngle = p.paddleAngle;
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

    this.updateHud();

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
    if (left !== this.localInput.left || right !== this.localInput.right) {
      this.localInput.left = left;
      this.localInput.right = right;
      this.room.send("paddle_input", { left, right });
    }
  }

  private renderLoop = () => {
    if (this.destroyed) return;
    this.ball.interpolate();
  };

  private buildHud() {
    const style = new TextStyle({
      fontFamily: "Segoe UI, system-ui, sans-serif",
      fontSize: 14,
      fontWeight: "bold",
    });

    let i = 0;
    for (const [, rp] of this.players) {
      const label = rp.sessionId === this.room.sessionId
        ? `${rp.name} (you)`
        : rp.name;

      const text = new Text({
        text: `${label}: ${"♥".repeat(rp.lives)}`,
        style: { ...style, fill: PLAYER_COLORS[rp.colorIndex % PLAYER_COLORS.length] },
      });
      text.x = 16;
      text.y = 16 + i * 24;
      this.hud.addChild(text);
      this.hudTexts.push(text);
      i++;
    }
  }

  private updateHud() {
    let i = 0;
    for (const [, rp] of this.players) {
      if (i >= this.hudTexts.length) break;
      const label = rp.sessionId === this.room.sessionId
        ? `${rp.name} (you)`
        : rp.name;
      this.hudTexts[i].text = `${label}: ${rp.eliminated ? "OUT" : "♥".repeat(rp.lives)}`;
      i++;
    }
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
    this.hud.destroy({ children: true });
    this.room.removeAllListeners();
    this.audio.destroy();
  }
}
