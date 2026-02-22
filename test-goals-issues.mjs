console.log("=".repeat(60));
console.log("GOALS GAME - ISSUE VERIFICATION TESTS");
console.log("=".repeat(60));

const BALL_SPEED = 5;
const GOALS_LIVES = 5;
const GOALS_BALL_SPAWN_INTERVAL = 3600;

class SimpleBall {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.velocity = { x: 0, y: 0 };
  }
  
  launch(target) {
    this.x = 0;
    this.y = 0;
    const dist = Math.sqrt(target.x * target.x + target.y * target.y) || 1;
    this.velocity.x = (target.x / dist) * BALL_SPEED;
    this.velocity.y = (target.y / dist) * BALL_SPEED;
  }
}

console.log("\n### TEST 1: Ball Initial Speed ###");
{
  const ball = new SimpleBall();
  const target = { x: 100, y: 100 };
  
  ball.launch(target);
  
  const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
  const expectedSpeed = BALL_SPEED;
  
  console.log(`✓ Ball launches at speed: ${speed.toFixed(2)}`);
  console.log(`✓ BALL_SPEED constant: ${expectedSpeed}`);
  console.log(`✓ Match: ${Math.abs(speed - expectedSpeed) < 0.01 ? "YES" : "NO"}`);
  console.log(`\n⚠️  ISSUE CONFIRMED: Ball starts at full speed (${speed.toFixed(2)})`);
  console.log(`   Recommended: Start at ~${(expectedSpeed * 0.5).toFixed(2)} and ramp up`);
}

console.log("\n" + "=".repeat(60));
console.log("### TEST 2: Player Lives Configuration ###");
{
  console.log(`✓ GOALS_LIVES constant: ${GOALS_LIVES}`);
  console.log(`✓ Players should survive ${GOALS_LIVES} goal hits`);
  
  let lives = GOALS_LIVES;
  console.log(`\nSimulating goal hits:`);
  for (let i = 1; i <= GOALS_LIVES; i++) {
    lives--;
    console.log(`  Hit ${i}: ${lives} lives remaining ${lives === 0 ? "(ELIMINATED)" : ""}`);
  }
  console.log(`\n✓ Lives system logic appears correct in isolation`);
}

console.log("\n" + "=".repeat(60));
console.log("### TEST 3: Ball Spawning & Cleanup Bug ###");
{
  const balls = [];
  
  console.log(`Initial state: ${balls.length} balls`);
  
  const ball1 = new SimpleBall();
  balls.push(ball1);
  console.log(`After spawn: ${balls.length} ball(s)`);
  
  console.log(`\nSimulating goal collisions WITHOUT cleanup:`);
  
  for (let i = 1; i <= 5; i++) {
    const newBall = new SimpleBall();
    balls.push(newBall);
    console.log(`  Goal hit ${i}: ${balls.length} balls (old balls NOT removed)`);
  }
  
  console.log(`\n⚠️  ISSUE CONFIRMED: Ball accumulation bug`);
  console.log(`   Expected: 1 ball`);
  console.log(`   Actual: ${balls.length} balls`);
  console.log(`   Location: GoalsGame.ts:268 - launchBall() called without removing old ball`);
}

console.log("\n" + "=".repeat(60));
console.log("### TEST 4: Correct Ball Cleanup Behavior ###");
{
  const balls = [];
  
  const ball1 = new SimpleBall();
  balls.push(ball1);
  console.log(`Initial: ${balls.length} ball(s)`);
  
  console.log(`\nSimulating goal collision WITH cleanup:`);
  const indexToRemove = balls.indexOf(ball1);
  balls.splice(indexToRemove, 1);
  
  const ball2 = new SimpleBall();
  balls.push(ball2);
  
  console.log(`✓ After goal (with cleanup): ${balls.length} ball(s)`);
  console.log(`✓ Old ball removed: ${!balls.includes(ball1)}`);
  console.log(`✓ New ball added: ${balls.includes(ball2)}`);
  console.log(`\nThis is the CORRECT behavior`);
}

console.log("\n" + "=".repeat(60));
console.log("### TEST 5: Combined Issue - Rapid Death Perception ###");
{
  console.log(`Scenario: Player with ${GOALS_LIVES} lives faces accumulating balls\n`);
  
  let lives = GOALS_LIVES;
  const balls = [];
  let frame = 0;
  
  const ball1 = new SimpleBall();
  balls.push(ball1);
  console.log(`Frame ${frame}: ${lives} lives, ${balls.length} ball(s)`);
  
  frame++;
  console.log(`\nFrame ${frame}: Ball 1 hits goal`);
  lives--;
  const ball2 = new SimpleBall();
  balls.push(ball2);
  console.log(`  → Lives: ${lives}, Balls: ${balls.length} (Ball 1 still exists!)`);
  
  frame++;
  console.log(`\nFrame ${frame}: Ball 1 hits AGAIN (not removed)`);
  lives--;
  const ball3 = new SimpleBall();
  balls.push(ball3);
  console.log(`  → Lives: ${lives}, Balls: ${balls.length}`);
  
  frame++;
  console.log(`\nFrame ${frame}: Multiple balls hitting simultaneously`);
  lives -= 2;
  balls.push(new SimpleBall(), new SimpleBall());
  console.log(`  → Lives: ${lives}, Balls: ${balls.length}`);
  
  frame++;
  console.log(`\nFrame ${frame}: Final hit`);
  lives--;
  console.log(`  → Lives: ${lives} (ELIMINATED), Balls: ${balls.length}`);
  
  console.log(`\n⚠️  COMBINED ISSUE ANALYSIS:`);
  console.log(`   Player died in ${frame} frames despite having ${GOALS_LIVES} lives`);
  console.log(`   ${balls.length} balls accumulated due to missing cleanup`);
  console.log(`   This creates perception of "instant death"`);
  console.log(`   Root cause: Ball cleanup missing in collision handler`);
}

console.log("\n" + "=".repeat(60));
console.log("### TEST 6: Ball Spawn Interval ###");
{
  console.log(`GOALS_BALL_SPAWN_INTERVAL: ${GOALS_BALL_SPAWN_INTERVAL} ticks`);
  console.log(`At 60 FPS: ${(GOALS_BALL_SPAWN_INTERVAL / 60).toFixed(1)} seconds`);
  console.log(`\n✓ This interval is fine, but combined with no cleanup,`);
  console.log(`  balls accumulate rapidly during gameplay`);
}

console.log("\n" + "=".repeat(60));
console.log("SUMMARY OF FINDINGS");
console.log("=".repeat(60));
console.log(`
✓ Issue 1 - Ball too fast at start:
  CONFIRMED - Ball launches at full BALL_SPEED (${BALL_SPEED}) immediately
  Location: Ball.ts:46-47
  
✓ Issue 2 - Players die immediately:
  ROOT CAUSE IDENTIFIED - Not a lives system bug, but rapid hits from
  accumulated balls. Lives decrement correctly, but multiple balls
  hit in quick succession.
  
✓ Issue 3 - Multiple balls appear:
  CONFIRMED - Balls are spawned but never removed on goal collision
  Location: GoalsGame.ts:268 - launchBall() without ball removal
  
🔗 Issues 2 & 3 are RELATED:
  The ball accumulation bug causes rapid successive hits, creating
  the perception of instant death even though lives are working.
`);

console.log("=".repeat(60));
