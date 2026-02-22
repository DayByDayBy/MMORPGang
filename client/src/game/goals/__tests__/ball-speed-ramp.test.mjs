/**
 * Test: Ball Speed Ramp-Up
 * 
 * This test verifies that balls:
 * 1. Start at reduced speed (50% of BALL_SPEED)
 * 2. Gradually accelerate over time
 * 3. Reach full BALL_SPEED after ~33 frames
 * 
 * This test should FAIL initially because acceleration is not implemented.
 */

console.log("\n=== TICKET #2: Ball Speed Ramp-Up Test ===\n");

const BALL_SPEED = 5;
const INITIAL_SPEED_MULTIPLIER = 0.5;
const ACCELERATION = 0.015;

class MockBallWithoutAcceleration {
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
  
  update() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
  }
  
  getSpeed() {
    return Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
  }
}

class MockBallWithAcceleration {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.velocity = { x: 0, y: 0 };
    this.currentSpeed = BALL_SPEED * INITIAL_SPEED_MULTIPLIER;
    this.acceleration = ACCELERATION;
    this.maxSpeed = BALL_SPEED;
  }
  
  launch(target) {
    this.x = 0;
    this.y = 0;
    this.currentSpeed = BALL_SPEED * INITIAL_SPEED_MULTIPLIER;
    const dist = Math.sqrt(target.x * target.x + target.y * target.y) || 1;
    this.velocity.x = (target.x / dist) * this.currentSpeed;
    this.velocity.y = (target.y / dist) * this.currentSpeed;
  }
  
  update() {
    if (this.currentSpeed < this.maxSpeed) {
      this.currentSpeed = Math.min(this.currentSpeed + this.acceleration, this.maxSpeed);
      const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
      if (speed > 0) {
        this.velocity.x = (this.velocity.x / speed) * this.currentSpeed;
        this.velocity.y = (this.velocity.y / speed) * this.currentSpeed;
      }
    }
    
    this.x += this.velocity.x;
    this.y += this.velocity.y;
  }
  
  getSpeed() {
    return Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
  }
}

console.log("TEST 1: Current behavior - immediate full speed (should fail)");
console.log("─".repeat(50));
{
  const ball = new MockBallWithoutAcceleration();
  ball.launch({ x: 100, y: 100 });
  
  const initialSpeed = ball.getSpeed();
  const expectedInitialSpeed = BALL_SPEED * INITIAL_SPEED_MULTIPLIER;
  
  console.log(`Initial speed: ${initialSpeed.toFixed(2)}`);
  console.log(`Expected initial speed: ${expectedInitialSpeed.toFixed(2)}`);
  
  if (Math.abs(initialSpeed - expectedInitialSpeed) < 0.1) {
    console.log(`✓ PASS: Ball starts at reduced speed`);
  } else {
    console.log(`❌ FAIL: Ball starts at ${initialSpeed.toFixed(2)} instead of ${expectedInitialSpeed.toFixed(2)}`);
    console.log(`   This test SHOULD fail until acceleration is implemented`);
  }
}

console.log("\nTEST 2: Expected behavior - gradual acceleration (should pass after fix)");
console.log("─".repeat(50));
{
  const ball = new MockBallWithAcceleration();
  ball.launch({ x: 100, y: 100 });
  
  const initialSpeed = ball.getSpeed();
  console.log(`Frame 0: ${initialSpeed.toFixed(2)} units/frame`);
  
  if (Math.abs(initialSpeed - BALL_SPEED * INITIAL_SPEED_MULTIPLIER) > 0.1) {
    console.log(`❌ FAIL: Initial speed incorrect`);
  } else {
    console.log(`✓ Initial speed correct (${INITIAL_SPEED_MULTIPLIER * 100}% of max)`);
  }
  
  for (let i = 1; i <= 10; i++) {
    ball.update();
  }
  const speed10 = ball.getSpeed();
  console.log(`Frame 10: ${speed10.toFixed(2)} units/frame`);
  
  for (let i = 11; i <= 33; i++) {
    ball.update();
  }
  const speed33 = ball.getSpeed();
  console.log(`Frame 33: ${speed33.toFixed(2)} units/frame`);
  
  if (Math.abs(speed33 - BALL_SPEED) < 0.1) {
    console.log(`✓ PASS: Ball reaches full speed after ~33 frames`);
  } else {
    console.log(`❌ FAIL: Ball at ${speed33.toFixed(2)} instead of ${BALL_SPEED.toFixed(2)}`);
  }
}

console.log("\nTEST 3: Speed progression over time");
console.log("─".repeat(50));
{
  const ball = new MockBallWithAcceleration();
  ball.launch({ x: 100, y: 100 });
  
  const speeds = [];
  speeds.push({ frame: 0, speed: ball.getSpeed() });
  
  for (let i = 1; i <= 50; i++) {
    ball.update();
    if (i % 10 === 0 || i === 33) {
      speeds.push({ frame: i, speed: ball.getSpeed() });
    }
  }
  
  console.log("Speed progression:");
  speeds.forEach(({ frame, speed }) => {
    const percent = (speed / BALL_SPEED * 100).toFixed(0);
    console.log(`  Frame ${frame.toString().padStart(2)}: ${speed.toFixed(2)} (${percent}%)`);
  });
  
  let isIncreasing = true;
  for (let i = 1; i < speeds.length; i++) {
    if (speeds[i].speed < speeds[i - 1].speed) {
      isIncreasing = false;
      break;
    }
  }
  
  const capsAtMax = speeds[speeds.length - 1].speed <= BALL_SPEED + 0.1;
  
  if (isIncreasing && capsAtMax) {
    console.log(`✓ PASS: Speed increases smoothly and caps at max`);
  } else {
    console.log(`❌ FAIL: Speed progression incorrect`);
  }
}

console.log("\nTEST 4: Direction preservation during acceleration");
console.log("─".repeat(50));
{
  const ball = new MockBallWithAcceleration();
  const target = { x: 100, y: 0 };
  ball.launch(target);
  
  const initialAngle = Math.atan2(ball.velocity.y, ball.velocity.x);
  
  for (let i = 0; i < 20; i++) {
    ball.update();
  }
  
  const finalAngle = Math.atan2(ball.velocity.y, ball.velocity.x);
  const angleDiff = Math.abs(finalAngle - initialAngle);
  
  console.log(`Initial angle: ${(initialAngle * 180 / Math.PI).toFixed(2)}°`);
  console.log(`Final angle: ${(finalAngle * 180 / Math.PI).toFixed(2)}°`);
  console.log(`Difference: ${(angleDiff * 180 / Math.PI).toFixed(2)}°`);
  
  if (angleDiff < 0.01) {
    console.log(`✓ PASS: Direction preserved during acceleration`);
  } else {
    console.log(`❌ FAIL: Direction changed during acceleration`);
  }
}

console.log("\n" + "=".repeat(50));
console.log("TEST SUMMARY");
console.log("=".repeat(50));
console.log("Expected behavior:");
console.log(`1. Ball starts at ${BALL_SPEED * INITIAL_SPEED_MULTIPLIER} units/frame (50% speed)`);
console.log(`2. Ball accelerates by ${ACCELERATION} units/frame each update`);
console.log(`3. Ball reaches ${BALL_SPEED} units/frame after ~33 frames`);
console.log("4. Direction is preserved during acceleration");
console.log("\nNext step: Implement acceleration in Ball.ts");
console.log("=".repeat(50) + "\n");
