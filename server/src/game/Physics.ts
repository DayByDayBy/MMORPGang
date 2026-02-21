import { ORBIT_RADIUS, BALL_RADIUS, reflect, normalize } from 'shared'
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
