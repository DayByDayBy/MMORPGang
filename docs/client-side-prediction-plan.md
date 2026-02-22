# Client-Side Ball Physics Prediction Plan

## Goal
Run the same shared physics on the client between server patches to eliminate jitter and provide a near-local feel. When a server patch arrives, smoothly correct toward the authoritative position.

## Architecture

### 1. Extract simulation step functions into shared package

Create two new files in `shared/src/`:

#### `shared/src/classic-simulation.ts`

```typescript
export interface ClassicSimState {
  ballX: number;
  ballY: number;
  ballVx: number;
  ballVy: number;
  edges: Edge[];
  players: {
    edgeIndex: number;
    paddlePosition: number;
    prevPaddlePosition: number;
    eliminated: boolean;
  }[];
  arenaRadius: number;
}

export interface ClassicSimResult {
  ballX: number;
  ballY: number;
  ballVx: number;
  ballVy: number;
  scored?: { playerIndex: number };
  paddleHit?: { playerIndex: number };
}

export function classicPhysicsStep(state: ClassicSimState): ClassicSimResult {
  // 1. Move ball by velocity
  // 2. Check wall/paddle/goal collisions (reuse ballNearSegment, reflectVelocity, etc.)
  // 3. Clamp speed
  // Returns new ball state + events
}
```

This extracts lines 74-184 of `ClassicGameRoom.ts` into a pure function.

#### `shared/src/goals-simulation.ts`

```typescript
export interface GoalsSimState {
  ballX: number;
  ballY: number;
  ballVx: number;
  ballVy: number;
  players: {
    goalAngle: number;
    paddleAngle: number;
    eliminated: boolean;
  }[];
  arenaRadius: number;
  goalRingRadius: number;
  goalRadius: number;
  orbitRadius: number;
  paddleArc: number;
}

export interface GoalsSimResult {
  ballX: number;
  ballY: number;
  ballVx: number;
  ballVy: number;
  scored?: { playerIndex: number };
  paddleHit?: { playerIndex: number };
}

export function goalsPhysicsStep(state: GoalsSimState): GoalsSimResult {
  // 1. Move ball by velocity
  // 2. Bounce off circular wall
  // 3. Check each player's paddle collision
  // 4. Check each player's goal collision
  // 5. Clamp speed
}
```

### 2. Server rooms become thin wrappers

Each server room's `gameLoop()` becomes:
1. Read schema into a plain `SimState` object
2. Call the shared `physicsStep()` function
3. Write results back to schema
4. Handle game events (lives, elimination, broadcasts)

### 3. Client prediction loop

```typescript
// In ClassicOnlineGame.ts
private renderLoop = (ticker: Ticker) => {
  const dt = ticker.deltaTime / 60; // normalize to seconds

  // Run shared physics locally to predict
  const result = classicPhysicsStep({
    ballX: this.predictedBallX,
    ballY: this.predictedBallY,
    ballVx: this.localBallVx,
    ballVy: this.localBallVy,
    edges: this.edges,
    players: this.getPlayerSnapshots(),
    arenaRadius: this.arenaRadius,
  });

  this.predictedBallX = result.ballX;
  this.predictedBallY = result.ballY;
  this.localBallVx = result.ballVx;
  this.localBallVy = result.ballVy;

  // Render at predicted position
  this.ball.x = this.predictedBallX;
  this.ball.y = this.predictedBallY;
};

// When server patch arrives
private syncState() {
  const serverBall = this.room.state.ball;

  // Trust server velocity
  this.localBallVx = serverBall.vx;
  this.localBallVy = serverBall.vy;

  // Smooth-correct position toward server truth
  const dx = serverBall.x - this.predictedBallX;
  const dy = serverBall.y - this.predictedBallY;
  const distSq = dx * dx + dy * dy;

  if (distSq > SNAP_THRESHOLD_SQ) {
    // Large correction (bounce, reset) — snap
    this.predictedBallX = serverBall.x;
    this.predictedBallY = serverBall.y;
  } else {
    this.predictedBallX += dx * 0.3;
    this.predictedBallY += dy * 0.3;
  }
}
```

### 4. Local games also use shared step functions

Replace the physics code in `ClassicGame.ts` and `GoalsGame.ts` with calls to the same shared step functions. This eliminates the current duplication between local and server game logic.

## What can and can't be predicted

| Element | Predictable? | Notes |
|---------|-------------|-------|
| Ball-wall bounce | Yes, perfectly | Deterministic geometry |
| Ball-paddle bounce (own) | Yes | Client knows own paddle position |
| Ball-paddle bounce (others) | Approximate | Client has latest server paddle pos, good enough between patches |
| Ball-goal scoring | Yes | Deterministic geometry |
| Paddle movement (own) | Yes | Client has local input |
| Paddle movement (others) | Approximate | Extrapolate from last known position/velocity |

## Implementation order

1. Create `shared/src/classic-simulation.ts` with `classicPhysicsStep()`
2. Create `shared/src/goals-simulation.ts` with `goalsPhysicsStep()`
3. Refactor server `ClassicGameRoom.gameLoop()` to use shared step
4. Refactor server `GoalsGameRoom.gameLoop()` to use shared step
5. Update `ClassicOnlineGame` to run prediction + server correction
6. Update `GoalsOnlineGame` to run prediction + server correction
7. Update local games (`ClassicGame`, `GoalsGame`) to use shared step
8. Test both modes online and locally

## Estimated effort
- Shared simulation files: ~200 lines total (extracted from existing server code)
- Server refactor: net negative lines (thinner rooms)
- Client prediction: ~30-50 lines per online game class
- Local game refactor: net negative lines (remove duplicated physics)
