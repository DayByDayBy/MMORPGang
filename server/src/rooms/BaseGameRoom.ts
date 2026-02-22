import { Room, Client } from "colyseus";
import { clearRoom } from "../audioStore";
import { BasePlayerSchema, BaseGameRoomState } from "../schema/base";
import { MAX_PLAYERS, MIN_PLAYERS, BALL_SPEED, TICK_RATE } from "shared";

export abstract class BaseGameRoom extends Room {
  maxClients = MAX_PLAYERS;

  protected audioSessionIds = new Set<string>();
  protected ballVx = 0;
  protected ballVy = 0;

  protected abstract get typedState(): BaseGameRoomState;
  protected abstract createPlayer(sessionId: string, name: string, index: number): BasePlayerSchema;
  protected abstract getPlayers(): Map<string, BasePlayerSchema>;
  protected abstract startGame(): void;
  protected abstract gameLoop(): void;
  protected abstract handlePaddleInput(player: BasePlayerSchema, data: any): void;

  messages = {
    "paddle_input": (client: Client, data: any) => {
      const player = this.getPlayers().get(client.sessionId);
      if (player && !player.eliminated && this.typedState.phase === "playing") {
        this.handlePaddleInput(player, data);
      }
    },

    "player_ready": (client: Client) => {
      const player = this.getPlayers().get(client.sessionId);
      if (player && this.typedState.phase === "waiting") {
        player.ready = !player.ready;
        this.checkAllReady();
      }
    },

    "set_name": (client: Client, data: { name?: string }) => {
      const player = this.getPlayers().get(client.sessionId);
      if (!player || this.typedState.phase !== "waiting") return;
      const name = typeof data?.name === "string" ? data.name.trim().slice(0, 16) : "";
      if (name) player.name = name;
    },

    "audio_uploaded": (client: Client) => {
      this.audioSessionIds.add(client.sessionId);
      this.broadcast("audio_ready", { sessionId: client.sessionId }, { except: client });
    },
  };

  onCreate(_options: any) {
    this.typedState.maxPlayers = MAX_PLAYERS;
    this.maxClients = MAX_PLAYERS;
    console.log(`[${this.constructor.name}] Created (up to ${MAX_PLAYERS} players)`);
  }

  onJoin(client: Client, options: { name?: string }) {
    const players = this.getPlayers();
    const idx = players.size;
    const player = this.createPlayer(
      client.sessionId,
      options.name || `Player ${idx + 1}`,
      idx,
    );
    players.set(client.sessionId, player);

    this.audioSessionIds.forEach((sid) => {
      client.send("audio_ready", { sessionId: sid });
    });

    console.log(`[${this.constructor.name}] ${player.name} joined (${players.size}/${this.typedState.maxPlayers})`);
  }

  onLeave(client: Client, code?: number) {
    const players = this.getPlayers();
    const player = players.get(client.sessionId);
    if (!player) return;

    console.log(`[${this.constructor.name}] ${player.name} left (code: ${code})`);

    if (this.typedState.phase === "playing") {
      player.eliminated = true;
      player.lives = 0;
      this.checkWinCondition();
    } else {
      players.delete(client.sessionId);
    }
  }

  onDispose() {
    clearRoom(this.roomId);
    console.log(`[${this.constructor.name}] Disposed`);
  }

  protected checkAllReady() {
    const players = this.getPlayers();
    if (players.size < MIN_PLAYERS) return;

    let allReady = true;
    players.forEach((player) => {
      if (!player.ready) allReady = false;
    });

    if (allReady) {
      this.startGame();
    }
  }

  protected checkWinCondition() {
    const alivePlayers: BasePlayerSchema[] = [];
    this.getPlayers().forEach((player) => {
      if (!player.eliminated) alivePlayers.push(player);
    });

    if (alivePlayers.length <= 1) {
      const lastAlive = alivePlayers[0] ?? null;
      this.typedState.phase = "ended";
      this.typedState.winnerId = lastAlive?.sessionId ?? "";
      this.typedState.winnerName = lastAlive?.name ?? "Nobody";
      console.log(`[${this.constructor.name}] Game over — ${this.typedState.winnerName} wins!`);

      this.broadcast("game_over", {
        winnerId: this.typedState.winnerId,
        winnerName: this.typedState.winnerName,
      });
    }
  }

  protected resetBallToCenter() {
    this.typedState.ball.x = 0;
    this.typedState.ball.y = 0;
  }

  protected launchBallRandom() {
    const angle = Math.random() * Math.PI * 2;
    this.ballVx = Math.cos(angle) * BALL_SPEED;
    this.ballVy = Math.sin(angle) * BALL_SPEED;
  }

  protected startSimulation() {
    this.setSimulationInterval(() => this.gameLoop(), 1000 / TICK_RATE);
  }
}
