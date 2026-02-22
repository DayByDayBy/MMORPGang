import { GoalsPlayerSchema, GoalsGameRoomState } from "../schema/goals";
import { BaseGameRoom } from "./BaseGameRoom";
import {
  bounceOffCircularWall,
  checkGoalsPaddleCollision,
  checkGoalsGoalCollision,
  getGoalsSlotAngles,
  clampSpeed,
  BALL_SPEED,
  BALL_RADIUS,
  GOALS_ARENA_RADIUS,
  GOALS_GOAL_RING_RADIUS,
  GOALS_GOAL_RADIUS,
  GOALS_ORBIT_RADIUS,
  GOALS_PADDLE_ARC,
  GOALS_ORBIT_SPEED,
  GOALS_ORBIT_ACCEL,
  GOALS_MAX_BALL_SPEED,
  GOALS_LIVES,
} from "shared";
import type { BallState } from "shared";

export class GoalsGameRoom extends BaseGameRoom {
  state = new GoalsGameRoomState();

  protected get typedState() { return this.state; }

  private inputs = new Map<string, { left: boolean; right: boolean }>();

  protected getPlayers() {
    return this.state.players;
  }

  protected createPlayer(sessionId: string, name: string, index: number): GoalsPlayerSchema {
    const player = new GoalsPlayerSchema();
    player.sessionId = sessionId;
    player.name = name;
    player.colorIndex = index;
    player.lives = GOALS_LIVES;
    return player;
  }

  protected handlePaddleInput(_player: GoalsPlayerSchema, data: { left?: boolean; right?: boolean }) {
    if (
      typeof data !== "object" || data === null ||
      typeof data.left !== "boolean" ||
      typeof data.right !== "boolean"
    ) return;
    this.inputs.set(_player.sessionId, { left: data.left, right: data.right });
  }

  onCreate(options: any) {
    super.onCreate(options);
    this.state.mode = "goals";
    this.state.arenaRadius = GOALS_ARENA_RADIUS;
    this.state.goalRingRadius = GOALS_GOAL_RING_RADIUS;
    this.state.goalRadius = GOALS_GOAL_RADIUS;
    this.state.orbitRadius = GOALS_ORBIT_RADIUS;
  }

  protected startGame() {
    this.state.phase = "playing";

    const slots = getGoalsSlotAngles(this.state.players.size);
    let idx = 0;
    this.state.players.forEach((player) => {
      player.goalAngle = slots[idx];
      player.paddleAngle = slots[idx];
      idx++;
    });

    this.resetBall();

    console.log(`[GoalsGameRoom] Game started with ${this.state.players.size} players`);
    this.startSimulation();
  }

  protected gameLoop() {
    if (this.state.phase !== "playing") return;

    this.applyInputs();

    this.state.ball.x += this.ballVx;
    this.state.ball.y += this.ballVy;

    const ballState: BallState = {
      x: this.state.ball.x,
      y: this.state.ball.y,
      vx: this.ballVx,
      vy: this.ballVy,
    };

    bounceOffCircularWall(ballState, GOALS_ARENA_RADIUS, BALL_RADIUS);

    this.state.players.forEach((player) => {
      if (player.eliminated) return;

      const goalX = Math.cos(player.goalAngle) * GOALS_GOAL_RING_RADIUS;
      const goalY = Math.sin(player.goalAngle) * GOALS_GOAL_RING_RADIUS;

      const saved = checkGoalsPaddleCollision(
        ballState, player.paddleAngle, GOALS_PADDLE_ARC,
        goalX, goalY, GOALS_ORBIT_RADIUS, BALL_RADIUS,
      );

      if (saved) {
        this.broadcast("paddle_hit", { sessionId: player.sessionId });
      } else if (checkGoalsGoalCollision(ballState, goalX, goalY, GOALS_GOAL_RADIUS, GOALS_ORBIT_RADIUS, BALL_RADIUS)) {
        player.lives--;
        this.broadcast("player_scored", { scoredOnId: player.sessionId });

        if (player.lives <= 0) {
          player.eliminated = true;
          this.checkWinCondition();
        }
        this.resetBall();
        ballState.x = this.state.ball.x;
        ballState.y = this.state.ball.y;
        ballState.vx = this.ballVx;
        ballState.vy = this.ballVy;
        return;
      }
    });

    const clamped = clampSpeed(ballState.vx, ballState.vy, GOALS_MAX_BALL_SPEED);
    this.ballVx = clamped.x;
    this.ballVy = clamped.y;
    this.state.ball.x = ballState.x;
    this.state.ball.y = ballState.y;
    this.state.ball.vx = this.ballVx;
    this.state.ball.vy = this.ballVy;
  }

  private applyInputs() {
    this.state.players.forEach((player) => {
      if (player.eliminated) return;
      const input = this.inputs.get(player.sessionId);
      if (!input) return;

      let target = player.paddleAngle;
      if (input.left) target -= GOALS_ORBIT_SPEED;
      if (input.right) target += GOALS_ORBIT_SPEED;
      player.paddleAngle += (target - player.paddleAngle) * GOALS_ORBIT_ACCEL;
    });
  }

  private resetBall() {
    this.resetBallToCenter();

    const alivePlayers: GoalsPlayerSchema[] = [];
    this.state.players.forEach((p) => {
      if (!p.eliminated) alivePlayers.push(p);
    });

    if (alivePlayers.length > 0) {
      const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      const goalX = Math.cos(target.goalAngle) * GOALS_GOAL_RING_RADIUS;
      const goalY = Math.sin(target.goalAngle) * GOALS_GOAL_RING_RADIUS;
      const dist = Math.sqrt(goalX * goalX + goalY * goalY) || 1;
      this.ballVx = (goalX / dist) * BALL_SPEED;
      this.ballVy = (goalY / dist) * BALL_SPEED;
    } else {
      this.launchBallRandom();
    }
  }
}
