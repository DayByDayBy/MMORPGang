# Plan 001 — Server-Side Game Logic

<objective>
Implement authoritative server-side game logic for MMORPGang: 60hz tick loop,
ball physics, arena bounce, player state management, input handling, paddle
collision, and goal collision. Each ticket is committed independently.
</objective>

<metadata>
  strategy: Segmented (commit checkpoint after each ticket)
  task_count: 7
  estimated_time: ~4.5 hours (core) + ~1.5 hours (stretch)
  complexity: Moderate
</metadata>

---

## Execution Context

- **Server**: Node + TypeScript + socket.io — `server/src/`
- **Shared**: types & constants already defined in `shared/src/index.ts`
  - `WORLD_SIZE` (800) — canonical logical coordinate space, arena centred at `(0,0)`
  - `ARENA_RADIUS = WORLD_SIZE * 0.45` (360), `GOAL_RING_RADIUS = ARENA_RADIUS * 0.72` (259.2), `GOAL_RADIUS = ARENA_RADIUS * 0.05` (18)
  - `ORBIT_RADIUS = ARENA_RADIUS * 0.15` (54), `BALL_RADIUS = WORLD_SIZE * 0.0125` (10)
  - `BALL_BASE_SPEED`, `BALL_MAX_SPEED` (world-units/sec), `ORBIT_SPEED`, `ORBIT_ACCEL`, `PADDLE_ARC`, `STARTING_LIVES`
  - `TICK_RATE` (60), `MAX_PLAYERS`, `getSlotAngles()`
  - `reflect()`, `normalize()`, `dot()` math utils
  - Types: `GameState`, `BallState`, `PlayerState`, `PlayerInput`
- **Client**: `GameCanvas.tsx` maps world → screen with `SCALE = Math.min(W,H) / WORLD_SIZE`; helpers `wx(x)`, `wy(y)`, `toScreen(v)` for all render calls
- **Arena geometry**: all physics in world space `(0,0)`-centred. No local recalculation of any geometry constant on server or client — import from shared.

---

<tasks>

<task id="S-01" type="checkpoint:human-verify" estimated_time="30 min">
  <title>Server game loop scaffold</title>
  <description>
    Add a fixed 60hz tick loop to server/src/index.ts using setInterval at
    1000/TICK_RATE ms. Each tick increments a counter and broadcasts a
    placeholder GameState (empty players, zeroed ball) to all clients via
    `io.emit('gameState', state)`. Client logs receipt to confirm ~60hz.
  </description>
  <requirements>
    - Use TICK_RATE from shared
    - Broadcast event name: 'gameState'
    - GameState shape must match the shared interface
    - Client-side: add a socket.io-client listener that console.logs received ticks
  </requirements>
  <files>
    - server/src/index.ts (modify)
    - client/src/GameCanvas.tsx (add socket listener for verification)
  </files>
  <verification>Open browser console — should see ~60 log lines/second with incrementing tick numbers.</verification>
  <commit>feat: 60hz game loop, broadcast placeholder state</commit>
</task>

<task id="S-02" type="checkpoint:human-verify" estimated_time="45 min">
  <title>Ball state and basic movement</title>
  <description>
    Create server/src/game/Ball.ts. Class owns authoritative BallState (x, y,
    vx, vy). Constructor places ball at arena center moving in a random
    direction at BALL_BASE_SPEED. update() advances position by velocity each
    tick. Server tick broadcasts BallState with changing x/y.
  </description>
  <requirements>
    - Use BALL_BASE_SPEED from shared for initial speed
    - Arena center: use a fixed logical ARENA_CENTER (e.g. 0,0 or a named const)
    - getState() returns current BallState
    - Integrate into server tick loop
  </requirements>
  <files>
    - server/src/game/Ball.ts (create)
    - server/src/index.ts (integrate Ball)
  </files>
  <verification>Broadcasted GameState shows ball x/y changing each tick in client console.</verification>
  <commit>feat: Ball class, basic movement</commit>
</task>

<task id="S-03" type="checkpoint:human-verify" estimated_time="30 min">
  <title>Arena wall bounce</title>
  <description>
    Extend Ball.update() to detect and resolve circular wall collisions.
    If dist(ball, center) + BALL_RADIUS >= ARENA_RADIUS, reflect velocity
    using the inward radial normal and push ball back inside boundary.
    Uses reflect() from shared.
  </description>
  <requirements>
    - Use `BALL_RADIUS` and `ARENA_RADIUS` from shared (both exported from `shared/src/index.ts`, no local redefinition needed)
    - Normal: nx = dx/dist, ny = dy/dist (points outward from center toward ball)
    - Reflect velocity against that normal, then push ball to dist = ARENA_RADIUS - BALL_RADIUS
    - Ball must never escape the arena
  </requirements>
  <files>
    - server/src/game/Ball.ts (modify update())
  </files>
  <verification>Ball visibly bounces around arena in client without escaping. Watch x/y stay within bounds.</verification>
  <commit>feat: circular arena wall bounce</commit>
</task>

<task id="S-04" type="checkpoint:human-verify" estimated_time="45 min">
  <title>Player state management</title>
  <description>
    Create server/src/game/GameState.ts owning the full authoritative GameState.
    Implements addPlayer(socketId), removePlayer(socketId), getState().
    addPlayer assigns a free slot from getSlotAngles(MAX_PLAYERS) and
    initialises PlayerState with STARTING_LIVES. Wire connect/disconnect in
    server/src/index.ts.
  </description>
  <requirements>
    - Use getSlotAngles(MAX_PLAYERS) from shared; pick first unoccupied slot
    - PlayerState.angle initialised to goalAngle (paddle starts at slot angle)
    - PlayerState.paddleArc initialised to PADDLE_ARC
    - PlayerState.score = 0, connected = true
    - On removePlayer: delete from players map
    - getState() returns { players, ball, tick, phase }
  </requirements>
  <files>
    - server/src/game/GameState.ts (create)
    - server/src/index.ts (wire addPlayer/removePlayer on socket events)
  </files>
  <verification>Two browser tabs connecting both appear in broadcasted state with different goalAngle values.</verification>
  <commit>feat: GameState, player add/remove</commit>
</task>

<task id="S-05" type="checkpoint:human-verify" estimated_time="30 min">
  <title>Player input application</title>
  <description>
    Server listens for 'playerInput' events (PlayerInput: {left, right}).
    Stores latest input per socketId in Map&lt;string, PlayerInput&gt;.
    Each tick, for each player, apply input: target angle ± ORBIT_SPEED,
    lerp current angle toward target using ORBIT_ACCEL.
  </description>
  <requirements>
    - Event name: 'playerInput'
    - Use ORBIT_SPEED and ORBIT_ACCEL from shared
    - Lerp: player.angle += (target - player.angle) * ORBIT_ACCEL
    - Client must emit 'playerInput' on keydown/keyup (ArrowLeft/ArrowRight or A/D)
    - Client-side input emission can be minimal — just enough to verify
  </requirements>
  <files>
    - server/src/game/GameState.ts or server/src/index.ts (add input map + tick application)
    - client/src/GameCanvas.tsx (add keydown/keyup emitter)
  </files>
  <verification>Pressing left/right in browser moves that player's paddle angle in broadcasted state.</verification>
  <commit>feat: player input → paddle angle</commit>
</task>

<task id="S-06" type="auto" estimated_time="1 hr (stretch)">
  <title>Paddle arc collision detection</title>
  <description>
    Create server/src/game/Physics.ts. Implement checkPaddleCollision(ball,
    player, goalX, goalY). Checks radial depth (dist from goal center within
    ORBIT_RADIUS ± BALL_RADIUS) and angular overlap (ball angle within
    player.angle ± player.paddleArc/2). On hit, reflect ball velocity using
    normal pointing away from goal center.
  </description>
  <requirements>
    - Use ORBIT_RADIUS, BALL_RADIUS from shared
    - Angle check: use Math.atan2; handle wrap-around with angle normalisation
    - Reflect using reflect() from shared; normal = normalize({dx, dy}) away from goal center
    - Call from server tick loop for each player
    - goalX/goalY: `Math.cos(goalAngle) * GOAL_RING_RADIUS`, `Math.sin(goalAngle) * GOAL_RING_RADIUS` — use `GOAL_RING_RADIUS` from shared (= `ARENA_RADIUS * 0.72` = 259.2); arena centre is `(0,0)` so no offset needed
  </requirements>
  <files>
    - server/src/game/Physics.ts (create)
    - server/src/index.ts or GameState.ts (integrate into tick)
  </files>
  <verification>Ball visibly bounces off a paddle arc in game.</verification>
  <commit>feat: paddle arc collision</commit>
</task>

<task id="S-07" type="auto" estimated_time="30 min (stretch)">
  <title>Goal collision detection</title>
  <description>
    In Physics.ts, implement checkGoalCollision(ball, player, goalX, goalY).
    If dist(ball, goalCenter) &lt; GOAL_RADIUS + BALL_RADIUS and ball came from
    inside the orbit path (dist from goal center &lt; ORBIT_RADIUS), decrement
    player.lives and reset ball to center. If lives === 0, set player to
    eliminated (connected: false or add eliminated flag).
  </description>
  <requirements>
    - `GOAL_RADIUS`: import from shared (`= ARENA_RADIUS * 0.05` = 18) — same value used by client, no local definition needed
    - Ball reset: position to arena center, new random direction at BALL_BASE_SPEED
    - Elimination: lives === 0 → mark player (e.g. lives stays 0, add note in state)
    - Call after paddle check in tick loop
  </requirements>
  <files>
    - server/src/game/Physics.ts (modify)
    - server/src/game/GameState.ts or index.ts (integrate, handle ball reset)
  </files>
  <verification>Ball hitting a goal circle decrements lives in broadcasted state.</verification>
  <commit>feat: goal collision, lives decrement</commit>
</task>

</tasks>

---

## Commit Discipline
Each ticket ends with `git add -A && git commit -m "<message>"` using the message in the task block. Keep messages under 10 words.

## Deviation Rules
- **Minor** (e.g. file reorganisation, constant naming): proceed, note in README
- **Major** (e.g. shared type changes, architecture shift): pause and flag to team

---

<success_criteria>
- S-01: Client console shows ~60 ticks/sec
- S-02: Ball x/y visibly changes in broadcasted state
- S-03: Ball bounces inside arena, never escapes
- S-04: Two tabs → two players with distinct goalAngles
- S-05: Keyboard input moves paddle angle in state
- S-06 (stretch): Ball bounces off paddle arc
- S-07 (stretch): Goal hit decrements lives in state
</success_criteria>
