import { Application, Container, Ticker } from "pixi.js";
import { CLASSIC_ARENA_RADIUS, CLASSIC_PADDLE_SPEED } from "shared";
import type { ClassicGameState, ClassicPlayerState } from "shared";
import type { Room } from "@colyseus/sdk";
import type { HudPlayer } from "../GameHud";
import { SERVER_URL } from "../../network/client";
import { ClassicArena } from "./ClassicArena";
import { ClassicPaddle } from "./ClassicPaddle";
import { Ball } from "../Ball";
import { AudioManager } from "../AudioManager";

interface RemotePlayer {
  sessionId: string;
  name: string;
  emoji: string;
  colorIndex: number;
  edgeIndex: number;
  lives: number;
  eliminated: boolean;
  paddle: ClassicPaddle;
}

export class ClassicOnlineGame {
  private app: Application;
  private room: Room<ClassicGameState>;
  private arena!: ClassicArena;
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
  private lastSentPaddlePosition = -1;
  private onHudUpdate: (players: HudPlayer[]) => void;

  constructor(app: Application, room: Room<ClassicGameState>, onHudUpdate: (players: HudPlayer[]) => void) {
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
    const serverRadius = state.arenaRadius || CLASSIC_ARENA_RADIUS;

    const playerCount = state.players.size;
    this.arena = new ClassicArena(playerCount, serverRadius);

    const maxFitRadius = Math.min(this.app.screen.width, this.app.screen.height) * 0.38;
    const scale = Math.min(1, maxFitRadius / serverRadius);
    this.world.scale.set(scale, scale);
    this.world.addChild(this.arena);

    this.ball = new Ball();
    this.world.addChild(this.ball);

    state.players.forEach((p: ClassicPlayerState, sessionId: string) => {
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

    state.players.forEach((_p: ClassicPlayerState, sessionId: string) => {
      this.fetchPlayerAudio(sessionId);
    });
  }

  private addPlayer(sessionId: string, p: ClassicPlayerState) {
    const paddle = new ClassicPaddle(p.edgeIndex, p.colorIndex);
    paddle.setEdge(this.arena.edges[p.edgeIndex]);
    paddle.position_t = p.paddlePosition;
    paddle.updatePosition();
    this.world.addChild(paddle);

    this.players.set(sessionId, {
      sessionId,
      name: p.name,
      emoji: p.emoji,
      colorIndex: p.colorIndex,
      edgeIndex: p.edgeIndex,
      lives: p.lives,
      eliminated: p.eliminated,
      paddle,
    });
  }

  private syncState() {
    const state = this.room.state;

    this.ball.syncState(state.ball);

    state.players.forEach((p: ClassicPlayerState, sessionId: string) => {
      const rp = this.players.get(sessionId);
      if (!rp) return;

      rp.lives = p.lives;
      rp.eliminated = p.eliminated;
      rp.paddle.syncPosition(p.paddlePosition);
      rp.paddle.visible = !p.eliminated;
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

  private onKeyDown = (e: KeyboardEvent) => this.keys.add(e.key.toLowerCase());
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());

  private renderLoop = (ticker: Ticker) => {
    if (this.destroyed) return;
    const dt = ticker.deltaMS / 1000;
    this.ball.interpolate(dt);
    
    for (const [sessionId, rp] of this.players) {
      if (sessionId !== this.room.sessionId) {
        rp.paddle.interpolate(dt);
      }
    }
    
    this.handleInput();
  };

  private handleInput() {
    const me = this.players.get(this.room.sessionId);
    if (!me || me.eliminated) return;

    let moved = false;

    if (this.keys.has("a") || this.keys.has("arrowleft")) {
      me.paddle.move(-CLASSIC_PADDLE_SPEED);
      moved = true;
    }
    if (this.keys.has("d") || this.keys.has("arrowright")) {
      me.paddle.move(CLASSIC_PADDLE_SPEED);
      moved = true;
    }

    if (moved && Math.abs(me.paddle.position_t - this.lastSentPaddlePosition) > 0.001) {
      this.lastSentPaddlePosition = me.paddle.position_t;
      this.room.send("paddle_input", { position: me.paddle.position_t });
    }
  }

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
