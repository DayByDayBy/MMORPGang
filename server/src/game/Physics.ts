import { ORBIT_RADIUS, BALL_RADIUS, BALL_BASE_SPEED, GOAL_RADIUS, reflect, normalize } from 'shared'
import type { BallState, PlayerState } from 'shared'

function angleDiff(a: number, b: number): number {
  let d = a - b
  while (d >  Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}

export function checkPaddleCollision(
  ball: BallState,
  player: PlayerState,
  goalX: number,
  goalY: number,
): boolean {
  const dx   = ball.x - goalX
  const dy   = ball.y - goalY
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist < ORBIT_RADIUS - BALL_RADIUS || dist > ORBIT_RADIUS + BALL_RADIUS) {
    return false
  }

  const ballAngle = Math.atan2(dy, dx)
  if (Math.abs(angleDiff(ballAngle, player.angle)) > player.paddleArc / 2) {
    return false
  }

  const normal = normalize({ x: dx, y: dy })
  const vel    = reflect({ x: ball.vx, y: ball.vy }, normal)
  ball.vx = vel.x
  ball.vy = vel.y

  const safe = ORBIT_RADIUS + BALL_RADIUS
  ball.x = goalX + normal.x * safe
  ball.y = goalY + normal.y * safe

  return true
}

export function checkGoalCollision(
  ball: BallState,
  player: PlayerState,
  goalX: number,
  goalY: number,
): boolean {
  const dx   = ball.x - goalX
  const dy   = ball.y - goalY
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist >= GOAL_RADIUS + BALL_RADIUS) return false
  if (dist >= ORBIT_RADIUS) return false  // came from outside orbit — paddle missed it

  if (player.lives > 0) {
    player.lives--
  }

  const angle = Math.random() * Math.PI * 2
  ball.x  = 0
  ball.y  = 0
  ball.vx = Math.cos(angle) * BALL_BASE_SPEED
  ball.vy = Math.sin(angle) * BALL_BASE_SPEED

  return true
}
