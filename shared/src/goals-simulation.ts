import type { BallState } from "./types.js";
import { bounceOffCircularWall, checkGoalsPaddleCollision, checkGoalsGoalCollision } from "./goals-physics.js";
import { clampSpeed } from "./physics.js";
import {
  BALL_RADIUS,
  GOALS_ARENA_RADIUS,
  GOALS_GOAL_RING_RADIUS,
  GOALS_GOAL_RADIUS,
  GOALS_ORBIT_RADIUS,
  GOALS_PADDLE_ARC,
  GOALS_MAX_BALL_SPEED,
} from "./constants.js";

export interface GoalsSimPlayer {
  goalAngle: number;
  paddleAngle: number;
  paddleAngleVelocity?: number;
  orbitRadius?: number;
  eliminated: boolean;
}

export interface GoalsSimState {
  ball: BallState;
  players: GoalsSimPlayer[];
  arenaRadius?: number;
  goalRingRadius?: number;
  goalRadius?: number;
  orbitRadius?: number;
  paddleArc?: number;
}

export interface GoalsSimEvent {
  type: "paddle_hit" | "scored";
  playerIndex: number;
}

export interface GoalsSimResult {
  ball: BallState;
  events: GoalsSimEvent[];
  ballReset: boolean;
}

export function goalsPhysicsStep(state: GoalsSimState): GoalsSimResult {
  const arenaRadius = state.arenaRadius ?? GOALS_ARENA_RADIUS;
  const goalRingRadius = state.goalRingRadius ?? GOALS_GOAL_RING_RADIUS;
  const goalRadius = state.goalRadius ?? GOALS_GOAL_RADIUS;
  const orbitRadius = state.orbitRadius ?? GOALS_ORBIT_RADIUS;
  const paddleArc = state.paddleArc ?? GOALS_PADDLE_ARC;

  const ball: BallState = {
    x: state.ball.x + state.ball.vx,
    y: state.ball.y + state.ball.vy,
    vx: state.ball.vx,
    vy: state.ball.vy,
  };

  const events: GoalsSimEvent[] = [];
  let ballReset = false;

  bounceOffCircularWall(ball, arenaRadius, BALL_RADIUS);

  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];
    if (player.eliminated) continue;

    const goalX = Math.cos(player.goalAngle) * goalRingRadius;
    const goalY = Math.sin(player.goalAngle) * goalRingRadius;
    const playerOrbitRadius = player.orbitRadius ?? orbitRadius;

    const saved = checkGoalsPaddleCollision(
      ball, player.paddleAngle, paddleArc,
      goalX, goalY, playerOrbitRadius, BALL_RADIUS,
    );

    if (saved) {
      // Apply paddle spin if velocity is tracked
      if (player.paddleAngleVelocity !== undefined) {
        const goalDist = Math.sqrt(goalX * goalX + goalY * goalY) || 1;
        const tangentX = -(goalY / goalDist);
        const tangentY = (goalX / goalDist);
        const tangentSpeed = player.paddleAngleVelocity * playerOrbitRadius;

        // Apply spin influence (0.6 multiplier)
        ball.vx += tangentX * tangentSpeed * 0.6;
        ball.vy += tangentY * tangentSpeed * 0.6;

        // Clamp to max speed
        const clamped = clampSpeed(ball.vx, ball.vy, GOALS_MAX_BALL_SPEED);
        ball.vx = clamped.x;
        ball.vy = clamped.y;
      }

      events.push({ type: "paddle_hit", playerIndex: i });
    } else if (checkGoalsGoalCollision(ball, goalX, goalY, goalRadius, orbitRadius, BALL_RADIUS)) {
      events.push({ type: "scored", playerIndex: i });
      ballReset = true;
      break;
    }
  }

  if (!ballReset) {
    const clamped = clampSpeed(ball.vx, ball.vy, GOALS_MAX_BALL_SPEED);
    ball.vx = clamped.x;
    ball.vy = clamped.y;
  }

  return { ball, events, ballReset };
}
