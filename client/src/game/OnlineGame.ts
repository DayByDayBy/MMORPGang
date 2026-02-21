import { Application, Container, Text, TextStyle } from "pixi.js";
import { PLAYER_COLORS, ARENA_RADIUS } from "shared";
import type { Room } from "@colyseus/sdk";
import { SERVER_URL } from "../network/client";
import { Arena } from "./Arena";
import { Paddle } from "./Paddle";
import { Ball } from "./Ball";
import { AudioManager } from "./AudioManager";

interface RemotePlayer {
  sessionId: string;
  name: string;
  colorIndex: number;
  edgeIndex: number;
  lives: number;
  eliminated: boolean;
  paddle: Paddle;
}

export class OnlineGame {
  private app: Application;
  private room: Room;
  private arena!: Arena;
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
  private lastSentPaddlePosition = -1;

  constructor(app: Application, room: Room) {
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
    const serverRadius = (state.arenaRadius as number) || ARENA_RADIUS;

    const playerCount = state.players.size;
    this.arena = new Arena(playerCount, serverRadius);

    const maxFitRadius = Math.min(this.app.screen.width, this.app.screen.height) * 0.38;
    const scale = Math.min(1, maxFitRadius / serverRadius);
    this.world.scale.set(scale, scale);
    this.world.addChild(this.arena);

    this.ball = new Ball();
    this.world.addChild(this.ball);

    state.players.forEach((p: any, sessionId: string) => {
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

    state.players.forEach((_p: any, sessionId: string) => {
      this.fetchPlayerAudio(sessionId);
    });

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);

    this.app.ticker.add(this.renderLoop);

    await this.audio.init();
    await this.audio.resume();
    this.audio.startSoundtrack();
  }

  private addPlayer(sessionId: string, p: any) {
    const edgeIdx = p.edgeIndex as number;
    const colorIdx = p.colorIndex as number;
    const paddle = new Paddle(edgeIdx, colorIdx);
    paddle.setEdge(this.arena.edges[edgeIdx]);
    paddle.position_t = p.paddlePosition;
    paddle.updatePosition();
    this.world.addChild(paddle);

    this.players.set(sessionId, {
      sessionId,
      name: p.name,
      colorIndex: colorIdx,
      edgeIndex: edgeIdx,
      lives: p.lives,
      eliminated: p.eliminated,
      paddle,
    });
  }

  private syncState() {
    const state = this.room.state;

    this.ball.syncState(state.ball);

    state.players.forEach((p: any, sessionId: string) => {
      const rp = this.players.get(sessionId);
      if (!rp) return;

      rp.lives = p.lives;
      rp.eliminated = p.eliminated;
      rp.paddle.position_t = p.paddlePosition;
      rp.paddle.updatePosition();
      rp.paddle.visible = !p.eliminated;
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

  private onKeyDown = (e: KeyboardEvent) => this.keys.add(e.key.toLowerCase());
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());

  private renderLoop = () => {
    if (this.destroyed) return;
    this.ball.interpolate();
    this.handleInput();
  };

  private handleInput() {
    const me = this.players.get(this.room.sessionId);
    if (!me || me.eliminated) return;

    const speed = 0.02;
    let moved = false;

    if (this.keys.has("a") || this.keys.has("arrowleft")) {
      me.paddle.move(-speed);
      moved = true;
    }
    if (this.keys.has("d") || this.keys.has("arrowright")) {
      me.paddle.move(speed);
      moved = true;
    }

    if (moved && Math.abs(me.paddle.position_t - this.lastSentPaddlePosition) > 0.001) {
      this.lastSentPaddlePosition = me.paddle.position_t;
      this.room.send("paddle_input", { position: me.paddle.position_t });
    }
  }

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
      this.audio.playBoop();
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
