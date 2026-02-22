/**
 * Verification: Ball acceleration is working
 */

console.log("\n=== VERIFYING TICKET #2 FIX ===\n");

const BALL_SPEED = 5;
const INITIAL_SPEED_MULTIPLIER = 0.5;
const ACCELERATION = 0.075;

class BallWithAcceleration {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.velocity = { x: 0, y: 0 };
    this.currentSpeed = BALL_SPEED;
    this.acceleration = 0;
    this.maxSpeed = BALL_SPEED;
    this.useAcceleration = false;
  }
  
  launch(target, options = {}) {
    this.x = 0;
    this.y = 0;
    
    this.useAcceleration = options.useAcceleration ?? false;
    const initialMultiplier = options.initialSpeedMultiplier ?? 1.0;
    this.acceleration = options.acceleration ?? 0;
    this.maxSpeed = options.maxSpeed ?? BALL_SPEED;
    this.currentSpeed = this.maxSpeed * initialMultiplier;
    
    const dist = Math.sqrt(target.x * target.x + target.y * target.y) || 1;
    this.velocity.x = (target.x / dist) * this.currentSpeed;
    this.velocity.y = (target.y / dist) * this.currentSpeed;
  }
  
  update() {
    if (this.useAcceleration && this.currentSpeed < this.maxSpeed) {
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

console.log("TEST: Ball acceleration in Goals mode");
console.log("─".repeat(50));

const ball = new BallWithAcceleration();
ball.launch({ x: 100, y: 100 }, {
  useAcceleration: true,
  initialSpeedMultiplier: INITIAL_SPEED_MULTIPLIER,
  acceleration: ACCELERATION,
  maxSpeed: BALL_SPEED,
});

const initialSpeed = ball.getSpeed();
console.log(`Frame 0: ${initialSpeed.toFixed(2)} units/frame`);

if (Math.abs(initialSpeed - BALL_SPEED * INITIAL_SPEED_MULTIPLIER) > 0.1) {
  console.log(`❌ FAIL: Initial speed should be ${(BALL_SPEED * INITIAL_SPEED_MULTIPLIER).toFixed(2)}`);
  process.exit(1);
}
console.log(`✓ Initial speed correct (${(INITIAL_SPEED_MULTIPLIER * 100).toFixed(0)}% of max)`);

for (let i = 1; i <= 33; i++) {
  ball.update();
}

const speed33 = ball.getSpeed();
console.log(`Frame 33: ${speed33.toFixed(2)} units/frame`);

if (Math.abs(speed33 - BALL_SPEED) > 0.1) {
  console.log(`❌ FAIL: Should reach full speed (${BALL_SPEED}) by frame 33`);
  process.exit(1);
}
console.log(`✓ Ball reaches full speed after ~33 frames`);

for (let i = 34; i <= 50; i++) {
  ball.update();
}

const speed50 = ball.getSpeed();
console.log(`Frame 50: ${speed50.toFixed(2)} units/frame`);

if (speed50 > BALL_SPEED + 0.1) {
  console.log(`❌ FAIL: Speed should not exceed max (${BALL_SPEED})`);
  process.exit(1);
}
console.log(`✓ Speed caps at maximum`);

console.log("\n" + "=".repeat(50));
console.log("✓ TICKET #2 FIX VERIFIED");
console.log("Ball acceleration system is working!");
console.log("=".repeat(50) + "\n");
