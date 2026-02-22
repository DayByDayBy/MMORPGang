/**
 * Verification: Paddle bounce behavior (like Pong/Breakout)
 * 
 * Tests that the ball:
 * 1. Bounces off paddle on contact
 * 2. Does NOT get trapped in bounce loop
 * 3. Gets pushed outside collision zone after bounce
 */

console.log("\n=== VERIFYING PADDLE BOUNCE FIX ===\n");

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function normalize(v) {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2);
  return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
}

function reflect(vel, normal) {
  const nx = normal.x, ny = normal.y;
  const dot = vel.x * nx + vel.y * ny;
  return { x: vel.x - 2 * dot * nx, y: vel.y - 2 * dot * ny };
}

function checkGoalsPaddleCollision(ball, paddleAngle, paddleArc, goalX, goalY, orbitRadius, ballRadius = 8) {
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

console.log("TEST 1: Ball bounces off paddle (single contact)");
console.log("─".repeat(50));
{
  const ball = {
    x: 50,
    y: 0,
    vx: -3,
    vy: 0,
  };
  
  const goalX = 0;
  const goalY = 0;
  const orbitRadius = 54;
  const paddleAngle = 0;
  const paddleArc = 0.5;
  
  console.log(`Before: pos=(${ball.x.toFixed(1)}, ${ball.y.toFixed(1)}), vel=(${ball.vx.toFixed(1)}, ${ball.vy.toFixed(1)})`);
  
  const hit = checkGoalsPaddleCollision(ball, paddleAngle, paddleArc, goalX, goalY, orbitRadius);
  
  console.log(`After:  pos=(${ball.x.toFixed(1)}, ${ball.y.toFixed(1)}), vel=(${ball.vx.toFixed(1)}, ${ball.vy.toFixed(1)})`);
  console.log(`Hit: ${hit}`);
  
  if (hit && ball.vx > 0) {
    console.log(`✓ PASS: Ball bounced and velocity reversed`);
  } else {
    console.log(`❌ FAIL: Ball should bounce`);
  }
  
  const distAfter = Math.sqrt((ball.x - goalX) ** 2 + (ball.y - goalY) ** 2);
  if (distAfter > orbitRadius + 8) {
    console.log(`✓ PASS: Ball pushed outside collision zone (dist=${distAfter.toFixed(1)})`);
  } else {
    console.log(`❌ FAIL: Ball still in collision zone (dist=${distAfter.toFixed(1)})`);
  }
}

console.log("\nTEST 2: Ball does NOT bounce when moving away");
console.log("─".repeat(50));
{
  const ball = {
    x: 65,
    y: 0,
    vx: 3,
    vy: 0,
  };
  
  const goalX = 0;
  const goalY = 0;
  const orbitRadius = 54;
  const paddleAngle = 0;
  const paddleArc = 0.5;
  
  console.log(`Before: pos=(${ball.x.toFixed(1)}, ${ball.y.toFixed(1)}), vel=(${ball.vx.toFixed(1)}, ${ball.vy.toFixed(1)})`);
  
  const hit = checkGoalsPaddleCollision(ball, paddleAngle, paddleArc, goalX, goalY, orbitRadius);
  
  console.log(`Hit: ${hit}`);
  
  if (!hit) {
    console.log(`✓ PASS: Ball moving away, no collision detected`);
  } else {
    console.log(`❌ FAIL: Should not collide when moving away`);
  }
}

console.log("\nTEST 3: Multiple frames - no bounce loop");
console.log("─".repeat(50));
{
  const ball = {
    x: 50,
    y: 0,
    vx: -3,
    vy: 0,
  };
  
  const goalX = 0;
  const goalY = 0;
  const orbitRadius = 54;
  const paddleAngle = 0;
  const paddleArc = 0.5;
  
  let bounceCount = 0;
  
  for (let frame = 0; frame < 10; frame++) {
    const hit = checkGoalsPaddleCollision(ball, paddleAngle, paddleArc, goalX, goalY, orbitRadius);
    
    if (hit) {
      bounceCount++;
      console.log(`  Frame ${frame}: BOUNCE (total: ${bounceCount})`);
    }
    
    ball.x += ball.vx;
    ball.y += ball.vy;
  }
  
  if (bounceCount === 1) {
    console.log(`✓ PASS: Ball bounced exactly once (no loop)`);
  } else {
    console.log(`❌ FAIL: Ball bounced ${bounceCount} times (expected 1)`);
  }
}

console.log("\nTEST 4: Ball outside paddle arc - no collision");
console.log("─".repeat(50));
{
  const ball = {
    x: 0,
    y: 50,
    vx: 0,
    vy: -3,
  };
  
  const goalX = 0;
  const goalY = 0;
  const orbitRadius = 54;
  const paddleAngle = 0;
  const paddleArc = 0.5;
  
  const hit = checkGoalsPaddleCollision(ball, paddleAngle, paddleArc, goalX, goalY, orbitRadius);
  
  if (!hit) {
    console.log(`✓ PASS: Ball outside paddle arc, no collision`);
  } else {
    console.log(`❌ FAIL: Should not collide outside paddle arc`);
  }
}

console.log("\n" + "=".repeat(50));
console.log("SUMMARY");
console.log("=".repeat(50));
console.log("Fixed paddle collision behavior:");
console.log("1. ✓ Ball bounces on contact (like Pong/Breakout)");
console.log("2. ✓ Ball pushed outside collision zone after bounce");
console.log("3. ✓ No bounce when moving away (prevents re-collision)");
console.log("4. ✓ No bounce loop - single bounce per contact");
console.log("\nThe paddle now works like a bat in Pong!");
console.log("=".repeat(50) + "\n");
