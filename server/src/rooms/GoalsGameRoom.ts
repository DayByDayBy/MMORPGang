import { GoalsPlayerSchema, GoalsGameRoomState } from "../schema/goals";
import { BaseGameRoom } from "./BaseGameRoom";
import {
  goalsPhysicsStep,
  getGoalsSlotAngles,
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
  GOALS_LIVES,
  GOALS_BALL_INITIAL_SPEED_MULTIPLIER,
  GOALS_BALL_ACCELERATION,
} from "shared";
import type { GoalsSimPlayer } from "shared";

export class GoalsGameRoom extends BaseGameRoom {
  state = new GoalsGameRoomState();

  protected get typedState() { return this.state; }

  private inputs = new Map<string, { left: boolean; right: boolean; up: boolean; down: boolean }>();
  private ballCurrentSpeed = BALL_SPEED;
  private ballAcceleration = GOALS_BALL_ACCELERATION;
  private ballMaxSpeed = BALL_SPEED;

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

  protected handlePaddleInput(_player: GoalsPlayerSchema, data: { left?: boolean; right?: boolean; up?: boolean; down?: boolean }) {
    if (
      typeof data !== "object" || data === null ||
      typeof data.left !== "boolean" ||
      typeof data.right !== "boolean"
    ) return;
    this.inputs.set(_player.sessionId, {
      left: data.left,
      right: data.right,
      up: data.up ?? false,
      down: data.down ?? false,
    });
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
      player.paddleAngle = slots[idx] + Math.PI;
      player.orbitRadius = GOALS_ORBIT_RADIUS;
      idx++;
    });

    this.resetBall();

    console.log(`[GoalsGameRoom] Game started with ${this.state.players.size} players`);
    this.startSimulation();
  }

  protected gameLoop() {
    if (this.state.phase !== "playing") return;

    this.applyInputs();

    // Apply ball acceleration
    if (this.ballCurrentSpeed < this.ballMaxSpeed) {
      this.ballCurrentSpeed = Math.min(this.ballCurrentSpeed + this.ballAcceleration, this.ballMaxSpeed);
      const speed = Math.sqrt(this.ballVx ** 2 + this.ballVy ** 2);
      if (speed > 0) {
        this.ballVx = (this.ballVx / speed) * this.ballCurrentSpeed;
        this.ballVy = (this.ballVy / speed) * this.ballCurrentSpeed;
      }
    }

    const simPlayers: GoalsSimPlayer[] = [];
    const sessionIds: string[] = [];
    this.state.players.forEach((player, sid) => {
      simPlayers.push({
        goalAngle: player.goalAngle,
        paddleAngle: player.paddleAngle,
        paddleAngleVelocity: player.paddleAngleVelocity,
        orbitRadius: player.orbitRadius,
        eliminated: player.eliminated,
      });
      sessionIds.push(sid);
    });

    const result = goalsPhysicsStep({
      ball: { x: this.state.ball.x, y: this.state.ball.y, vx: this.ballVx, vy: this.ballVy },
      players: simPlayers,
      arenaRadius: GOALS_ARENA_RADIUS,
      goalRingRadius: GOALS_GOAL_RING_RADIUS,
      goalRadius: GOALS_GOAL_RADIUS,
      orbitRadius: GOALS_ORBIT_RADIUS,
      paddleArc: GOALS_PADDLE_ARC,
    });

    for (const event of result.events) {
      const sid = sessionIds[event.playerIndex];
      if (event.type === "paddle_hit") {
        this.broadcast("paddle_hit", { sessionId: sid });
      } else if (event.type === "scored") {
        const player = this.state.players.get(sid)!;
        player.lives--;
        this.broadcast("player_scored", { scoredOnId: sid });
        if (player.lives <= 0) {
          player.eliminated = true;
          this.checkWinCondition();
        }
      }
    }

    if (result.ballReset) {
      this.resetBall();
    } else {
      this.state.ball.x = result.ball.x;
      this.state.ball.y = result.ball.y;
      this.ballVx = result.ball.vx;
      this.ballVy = result.ball.vy;
    }

    this.state.ball.vx = this.ballVx;
    this.state.ball.vy = this.ballVy;
  }

  private applyInputs() {
    this.state.players.forEach((player) => {
      if (player.eliminated) return;
      const input = this.inputs.get(player.sessionId);
      if (!input) return;

      const prevAngle = player.paddleAngle;

      let target = player.paddleAngle;
      if (input.left) target -= GOALS_ORBIT_SPEED;
      if (input.right) target += GOALS_ORBIT_SPEED;
      player.paddleAngle += (target - player.paddleAngle) * GOALS_ORBIT_ACCEL;

      player.paddleAngleVelocity = player.paddleAngle - prevAngle;

      // Handle orbit radius control
      if (input.up) {
        player.orbitRadius = Math.min(player.orbitRadius + GOALS_ORBIT_RADIUS_SPEED, GOALS_ORBIT_RADIUS_MAX);
      }
      if (input.down) {
        player.orbitRadius = Math.max(player.orbitRadius - GOALS_ORBIT_RADIUS_SPEED, GOALS_ORBIT_RADIUS_MIN);
      }
    });
  }

  private resetBall() {
    this.resetBallToCenter();

    // Reset ball acceleration
    this.ballCurrentSpeed = BALL_SPEED * GOALS_BALL_INITIAL_SPEED_MULTIPLIER;

    const alivePlayers: GoalsPlayerSchema[] = [];
    this.state.players.forEach((p) => {
      if (!p.eliminated) alivePlayers.push(p);
    });

    if (alivePlayers.length > 0) {
      const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      const goalX = Math.cos(target.goalAngle) * GOALS_GOAL_RING_RADIUS;
      const goalY = Math.sin(target.goalAngle) * GOALS_GOAL_RING_RADIUS;
      const dist = Math.sqrt(goalX * goalX + goalY * goalY) || 1;
      this.ballVx = (goalX / dist) * this.ballCurrentSpeed;
      this.ballVy = (goalY / dist) * this.ballCurrentSpeed;
    } else {
      this.launchBallRandom();
    }
  }
}
