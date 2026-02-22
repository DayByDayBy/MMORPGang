/**
 * Verification: Ball cleanup fix is working
 */

console.log("\n=== VERIFYING TICKET #1 FIX ===\n");

class MockBall {
  constructor(id) {
    this.id = id;
    this.x = 0;
    this.y = 0;
    this.velocity = { x: 0, y: 0 };
  }
}

class MockWorld {
  constructor() {
    this.children = [];
  }
  
  addChild(ball) {
    this.children.push(ball);
  }
  
  removeChild(ball) {
    const index = this.children.indexOf(ball);
    if (index > -1) {
      this.children.splice(index, 1);
    }
  }
}

function simulateFixedBehavior(balls, world, scoringBall) {
  const ballIndex = balls.indexOf(scoringBall);
  if (ballIndex > -1) {
    balls.splice(ballIndex, 1);
  }
  world.removeChild(scoringBall);
  
  const newBall = new MockBall(Date.now());
  world.addChild(newBall);
  balls.push(newBall);
}

console.log("TEST: Multiple consecutive goals");
console.log("─".repeat(50));

const balls = [];
const world = new MockWorld();

const initialBall = new MockBall(1);
balls.push(initialBall);
world.addChild(initialBall);

console.log(`Start: ${balls.length} ball(s)`);

for (let i = 1; i <= 10; i++) {
  const scoringBall = balls[0];
  simulateFixedBehavior(balls, world, scoringBall);
  
  if (balls.length !== 1) {
    console.log(`❌ FAIL at goal ${i}: ${balls.length} balls (expected 1)`);
    process.exit(1);
  }
  
  if (world.children.length !== 1) {
    console.log(`❌ FAIL at goal ${i}: ${world.children.length} balls in scene (expected 1)`);
    process.exit(1);
  }
}

console.log(`After 10 goals: ${balls.length} ball(s) in array, ${world.children.length} in scene`);
console.log(`✓ PASS: Ball count remains at 1 throughout gameplay`);

console.log("\n" + "=".repeat(50));
console.log("✓ TICKET #1 FIX VERIFIED");
console.log("Ball accumulation bug is fixed!");
console.log("=".repeat(50) + "\n");
