import { mmorpong, reflect, normalize } from 'shared'

function angleDiff(a: number, b: number): number {
  let d = a - b
  while (d >  Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}

export function checkPaddleCollision(
  ball: mmorpong.BallState,
  player: mmorpong.PlayerState,
  goalX: number,
  goalY: number,
): boolean {
  const dx   = ball.x - goalX
  const dy   = ball.y - goalY
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist < mmorpong.ORBIT_RADIUS - mmorpong.BALL_RADIUS || dist > mmorpong.ORBIT_RADIUS + mmorpong.BALL_RADIUS) {
    return false
  }

  const ballAngle = Math.atan2(dy, dx)
  if (Math.abs(angleDiff(ballAngle, player.angle)) > player.paddleArc / 2) {
    return false
  }

  const normal  = normalize({ x: dx, y: dy })
  const moveDot = ball.vx * normal.x + ball.vy * normal.y
  if (moveDot >= 0) return false

  const vel = reflect({ x: ball.vx, y: ball.vy }, normal)
  ball.vx = vel.x
  ball.vy = vel.y

  const safe = mmorpong.ORBIT_RADIUS + mmorpong.BALL_RADIUS
  ball.x = goalX + normal.x * safe
  ball.y = goalY + normal.y * safe

  return true
}

export function checkGoalCollision(
  ball: mmorpong.BallState,
  player: mmorpong.PlayerState,
  goalX: number,
  goalY: number,
): boolean {
  const dx   = ball.x - goalX
  const dy   = ball.y - goalY
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist >= mmorpong.GOAL_RADIUS + mmorpong.BALL_RADIUS) return false
  if (dist >= mmorpong.ORBIT_RADIUS) return false

  if (player.lives > 0) {
    player.lives--
  }

  const angle = Math.random() * Math.PI * 2
  ball.x  = 0
  ball.y  = 0
  ball.vx = Math.cos(angle) * mmorpong.BALL_BASE_SPEED
  ball.vy = Math.sin(angle) * mmorpong.BALL_BASE_SPEED

  return true
}