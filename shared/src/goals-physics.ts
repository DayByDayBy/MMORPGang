import type { Vector2 } from "./types.js";
import { BALL_RADIUS } from "./constants.js";

export function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function normalize(v: Vector2): Vector2 {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2);
  return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
}

function reflect(vel: Vector2, normal: Vector2): Vector2 {
  const nx = normal.x, ny = normal.y;
  const dot = vel.x * nx + vel.y * ny;
  return { x: vel.x - 2 * dot * nx, y: vel.y - 2 * dot * ny };
}

export interface GoalsBallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Bounce ball off the circular arena wall.
 * Returns true if a bounce occurred.
 */
export function bounceOffCircularWall(
  ball: GoalsBallState,
  arenaRadius: number,
  ballRadius: number = BALL_RADIUS,
): boolean {
  const dist = Math.sqrt(ball.x ** 2 + ball.y ** 2);
  if (dist + ballRadius < arenaRadius) return false;

  const nx = ball.x / dist;
  const ny = ball.y / dist;
  const vel = reflect({ x: ball.vx, y: ball.vy }, { x: nx, y: ny });
  ball.vx = vel.x;
  ball.vy = vel.y;

  const safe = arenaRadius - ballRadius;
  ball.x = nx * safe;
  ball.y = ny * safe;
  return true;
}

/**
 * Check if the ball hits a player's arc paddle.
 * Returns true if reflected (save).
 */
export function checkGoalsPaddleCollision(
  ball: GoalsBallState,
  paddleAngle: number,
  paddleArc: number,
  goalX: number,
  goalY: number,
  orbitRadius: number,
  ballRadius: number = BALL_RADIUS,
): boolean {
  const dx = ball.x - goalX;
  const dy = ball.y - goalY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const collisionThreshold = ballRadius * 2;
  if (dist < orbitRadius - collisionThreshold || dist > orbitRadius + collisionThreshold) {
    return false;
  }

  const ballAngle = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ballAngle, paddleAngle)) > paddleArc / 2) {
    return false;
  }

  const normal = normalize({ x: dx, y: dy });
  const moveDot = ball.vx * normal.x + ball.vy * normal.y;
  
  if (moveDot >= 0) return false;

  const vel = reflect({ x: ball.vx, y: ball.vy }, normal);
  ball.vx = vel.x;
  ball.vy = vel.y;

  const pushDistance = orbitRadius + ballRadius + 1;
  ball.x = goalX + normal.x * pushDistance;
  ball.y = goalY + normal.y * pushDistance;

  return true;
}

/**
 * Check if the ball entered a player's goal circle.
 * Returns true if scored (life lost).
 */
export function checkGoalsGoalCollision(
  ball: GoalsBallState,
  goalX: number,
  goalY: number,
  goalRadius: number,
  orbitRadius: number,
  ballRadius: number = BALL_RADIUS,
): boolean {
  const dx = ball.x - goalX;
  const dy = ball.y - goalY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist >= goalRadius + ballRadius) return false;
  if (dist >= orbitRadius) return false;

  return true;
}

/**
 * Get evenly distributed slot angles around the arena.
 */
export function getGoalsSlotAngles(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (2 * Math.PI * i) / count);
}
