import { Application, Container, Text, TextStyle, Ticker } from "pixi.js";
import {
  PLAYER_COLORS,
  BALL_SPEED,
  GOALS_ARENA_RADIUS,
  GOALS_GOAL_RING_RADIUS,
  GOALS_GOAL_RADIUS,
  GOALS_ORBIT_RADIUS,
  GOALS_ORBIT_RADIUS_MIN,
  GOALS_ORBIT_RADIUS_MAX,
  GOALS_ORBIT_RADIUS_SPEED,
  GOALS_PADDLE_ARC,
  GOALS_ORBIT_SPEED,
  GOALS_ORBIT_ACCEL,
  GOALS_MAX_BALL_SPEED,
  GOALS_LIVES,
  GOALS_BALL_SPAWN_INTERVAL,
  bounceOffCircularWall,
  checkGoalsPaddleCollision,
  checkGoalsGoalCollision,
  getGoalsSlotAngles,
  clampSpeed,
  BALL_RADIUS,
} from "shared";
import type { GoalsBallState } from "shared";
import { GoalsArena } from "./GoalsArena";
import { GoalsGoal } from "./GoalsGoal";
import { GoalsPaddle } from "./GoalsPaddle";
import { Ball } from "../Ball";
import { AudioManager } from "../AudioManager";

interface AIState {
  speed: number;
  roamTarget: number;
  roamTimer: number;
}

interface PlayerState {
  paddle: GoalsPaddle;
  goal: GoalsGoal;
  goalAngle: number;
  paddleAngle: number;
  orbitRadius: number;
  lives: number;
  eliminated: boolean;
  name: string;
  ai?: AIState;
}

export class GoalsGame {
  private app: Application;
  private arena!: GoalsArena;
  private balls: Ball[] = [];
  private players: PlayerState[] = [];
  private world = new Container();
  private hud = new Container();
  private hudTexts: Text[] = [];
  private keys = new Set<string>();
  private tickAccumulator = 0;
  private running = false;
  private onGameOver?: (winnerName: string | null) => void;
  private hudDirty = true;
  private audio = new AudioManager();
  private ballSpawnTimer = 0;

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
    const scale = Math.min(1, maxFitRadius / GOALS_ARENA_RADIUS);
    this.world.scale.set(scale, scale);

    this.arena = new GoalsArena(GOALS_ARENA_RADIUS);
    this.world.addChild(this.arena);

    const slots = getGoalsSlotAngles(playerCount);

    for (let i = 0; i < playerCount; i++) {
      const goalAngle = slots[i];
      const paddle = new GoalsPaddle(i, goalAngle, GOALS_ORBIT_RADIUS, GOALS_PADDLE_ARC);
      const goal = new GoalsGoal(GOALS_GOAL_RADIUS);
      this.world.addChild(goal);
      this.world.addChild(paddle);

      const goalX = Math.cos(goalAngle) * GOALS_GOAL_RING_RADIUS;
      const goalY = Math.sin(goalAngle) * GOALS_GOAL_RING_RADIUS;
      goal.render(goalX, goalY, true);
      paddle.render(goalX, goalY, i === 0);

      const player: PlayerState = {
        paddle,
        goal,
        goalAngle,
        paddleAngle: goalAngle,
        orbitRadius: GOALS_ORBIT_RADIUS,
        lives: GOALS_LIVES,
        eliminated: false,
        name: i === 0 ? playerName : `Bot ${i}`,
        ai: i === 0 ? undefined : {
          speed: GOALS_ORBIT_SPEED,
          roamTarget: goalAngle,
          roamTimer: 0,
        },
      };
      this.players.push(player);
    }

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.buildHud();
    
    const initialBalls = Math.max(1, playerCount - 1);
    for (let i = 0; i < initialBalls; i++) {
      this.launchBall();
    }
    
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
      for (const ball of this.balls) {
        ball.update();
      }
      this.checkCollisions();
      this.renderPlayers();
      if (this.hudDirty) {
        this.updateHud();
        this.hudDirty = false;
      }
      
      this.ballSpawnTimer++;
      if (this.ballSpawnTimer >= GOALS_BALL_SPAWN_INTERVAL) {
        this.ballSpawnTimer = 0;
        this.launchBall();
      }
    }
  };

  private handleInput() {
    const player = this.players[0];
    if (player.eliminated) return;

    let target = player.paddleAngle;
    if (this.keys.has("a") || this.keys.has("arrowleft")) target -= GOALS_ORBIT_SPEED;
    if (this.keys.has("d") || this.keys.has("arrowright")) target += GOALS_ORBIT_SPEED;
    player.paddleAngle += (target - player.paddleAngle) * GOALS_ORBIT_ACCEL;
    player.paddle.paddleAngle = player.paddleAngle;

    if (this.keys.has("w") || this.keys.has("arrowup")) {
      player.orbitRadius = Math.min(player.orbitRadius + GOALS_ORBIT_RADIUS_SPEED, GOALS_ORBIT_RADIUS_MAX);
    }
    if (this.keys.has("s") || this.keys.has("arrowdown")) {
      player.orbitRadius = Math.max(player.orbitRadius - GOALS_ORBIT_RADIUS_SPEED, GOALS_ORBIT_RADIUS_MIN);
    }
    player.paddle.orbitRadius = player.orbitRadius;
  }

  private updateAI() {
    for (let i = 1; i < this.players.length; i++) {
      const player = this.players[i];
      if (player.eliminated || !player.ai) continue;

      const goalX = Math.cos(player.goalAngle) * GOALS_GOAL_RING_RADIUS;
      const goalY = Math.sin(player.goalAngle) * GOALS_GOAL_RING_RADIUS;

      let nearestDist = Infinity;
      let nearestBall: Ball | null = null;
      
      for (const ball of this.balls) {
        const dx = ball.x - goalX;
        const dy = ball.y - goalY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestBall = ball;
        }
      }

      if (nearestBall && nearestDist < GOALS_ARENA_RADIUS * 0.6) {
        const dx = nearestBall.x - goalX;
        const dy = nearestBall.y - goalY;
        const ballAngle = Math.atan2(dy, dx);
        let target = player.paddleAngle;
        target += (ballAngle - target) * 0.15;
        player.paddleAngle += (target - player.paddleAngle) * GOALS_ORBIT_ACCEL;
      } else {
        player.ai.roamTimer--;
        if (player.ai.roamTimer <= 0) {
          player.ai.roamTarget = player.goalAngle + (Math.random() - 0.5) * 1.0;
          player.ai.roamTimer = 40 + Math.floor(Math.random() * 80);
        }
        const target = player.ai.roamTarget;
        player.paddleAngle += (target - player.paddleAngle) * 0.05;
      }

      player.paddle.paddleAngle = player.paddleAngle;
    }
  }

  private checkCollisions() {
    for (const ball of this.balls) {
      const ballState: GoalsBallState = {
        x: ball.x,
        y: ball.y,
        vx: ball.velocity.x,
        vy: ball.velocity.y,
      };

      bounceOffCircularWall(ballState, GOALS_ARENA_RADIUS, BALL_RADIUS);

      for (let i = 0; i < this.players.length; i++) {
        const player = this.players[i];
        if (player.eliminated) continue;

        const goalX = Math.cos(player.goalAngle) * GOALS_GOAL_RING_RADIUS;
        const goalY = Math.sin(player.goalAngle) * GOALS_GOAL_RING_RADIUS;

        const saved = checkGoalsPaddleCollision(
          ballState, player.paddleAngle, GOALS_PADDLE_ARC,
          goalX, goalY, player.orbitRadius, BALL_RADIUS,
        );

        if (saved) {
          this.audio.playBoomp();
        } else if (checkGoalsGoalCollision(ballState, goalX, goalY, GOALS_GOAL_RADIUS, GOALS_ORBIT_RADIUS, BALL_RADIUS)) {
          player.lives--;
          this.hudDirty = true;

          if (player.lives <= 0) {
            player.eliminated = true;
            player.paddle.visible = false;
            player.goal.visible = false;

            if (player === this.players[0]) {
              this.running = false;
              this.audio.stopSoundtrack();
              this.audio.playGameEnd();
              this.onGameOver?.(null);
              this.applyBallState(ball, ballState);
              return;
            }

            this.checkWinCondition();
          }
          
          this.removeBall(ball);
          this.launchBall();
          break;
        }
      }

      const clamped = clampSpeed(ballState.vx, ballState.vy, GOALS_MAX_BALL_SPEED);
      ballState.vx = clamped.x;
      ballState.vy = clamped.y;

      this.applyBallState(ball, ballState);
    }
  }

  private applyBallState(ball: Ball, bs: GoalsBallState) {
    ball.x = bs.x;
    ball.y = bs.y;
    ball.velocity.x = bs.vx;
    ball.velocity.y = bs.vy;
  }

  private renderPlayers() {
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (player.eliminated) continue;

      const goalX = Math.cos(player.goalAngle) * GOALS_GOAL_RING_RADIUS;
      const goalY = Math.sin(player.goalAngle) * GOALS_GOAL_RING_RADIUS;

      player.goal.render(goalX, goalY, player.lives > 0);
      player.paddle.render(goalX, goalY, i === 0);
    }
  }

  private removeBall(ball: Ball) {
    const ballIndex = this.balls.indexOf(ball);
    if (ballIndex > -1) {
      this.balls.splice(ballIndex, 1);
    }
    this.world.removeChild(ball);
  }

  private launchBall() {
    const alive = this.players.filter((p) => !p.eliminated);
    if (alive.length === 0) return;
    const target = alive[Math.floor(Math.random() * alive.length)];
    const goalX = Math.cos(target.goalAngle) * GOALS_GOAL_RING_RADIUS;
    const goalY = Math.sin(target.goalAngle) * GOALS_GOAL_RING_RADIUS;
    
    const ball = new Ball();
    this.world.addChild(ball);
    this.balls.push(ball);
    ball.launch({ x: goalX, y: goalY });
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
