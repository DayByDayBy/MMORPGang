---
name: Performance Optimization
overview: Systematic performance improvements across server physics, client rendering, and network communication to eliminate perceived lag. The biggest win will be client-side ball interpolation (smooth 60fps motion from 30Hz server ticks) and reducing GC pressure from per-tick allocations on the server.
todos:
  - id: interpolation
    content: Add ball lerp interpolation in OnlineGame (prev/target positions + renderLoop lerp)
    status: completed
  - id: throttle-input
    content: Throttle paddle_input sends to ~30Hz or on meaningful change
    status: completed
  - id: server-gc
    content: Eliminate per-tick allocations in GameRoom (reuse Map, endpoints, rel vector, cache ballHitDistSq)
    status: completed
  - id: client-gc
    content: Eliminate per-frame allocations in Game.ts, Paddle.ts, Ball.ts (reuse objects, mutate in place)
    status: pending
  - id: sync-optimize
    content: Optimize OnlineGame.syncState and updateHud to skip unchanged state
    status: pending
  - id: waitingroom
    content: Add shallow comparison in WaitingRoom before calling setPlayers
    status: pending
  - id: gamescene-deps
    content: Fix GameScene useEffect dependencies to avoid full teardown on parent re-render
    status: pending
isProject: false
---

# Performance Optimization Plan

The perceived lag likely comes from two main sources: (1) the ball visually jumping every ~33ms because the client snaps to server positions at 30Hz with no interpolation, and (2) GC pauses from object allocations in the server's per-tick hot loop. Here are all issues ranked by impact.

## 1. Ball interpolation in OnlineGame (highest visual impact)

The server runs physics at 30Hz (`TICK_RATE = 30`). The client renders at 60fps but snaps ball position directly from state on each Colyseus patch:

```55:56:client/src/game/OnlineGame.ts
    this.ball.x = state.ball.x;
    this.ball.y = state.ball.y;
```

This causes the ball to teleport every ~33ms instead of moving smoothly. Fix by storing the previous and target ball positions, then **lerping** in the render loop:

- Add `ballPrev`, `ballTarget`, `lerpT` fields to `OnlineGame`
- In `syncState()`: copy current ball pos to `ballPrev`, set `ballTarget` from server state, reset `lerpT = 0`
- In `renderLoop`: increment `lerpT` based on delta time and tick interval, lerp ball x/y between prev and target

This single change will make the game feel dramatically smoother.

## 2. Throttle paddle input sends

In [OnlineGame.ts](client/src/game/OnlineGame.ts), `handleInput()` runs every frame (~60Hz) and sends a network message each time a key is held:

```96:99:client/src/game/OnlineGame.ts
    if (moved) {
      this.room.send("paddle_input", { position: me.paddle.position_t });
    }
```

The server only processes at 30Hz, so half the messages are wasted. Fix:

- Track `lastSendTime` and only send if >= 33ms (~30Hz) has elapsed since last send, OR
- Track `lastSentPosition` and only send when position changed by more than a small epsilon (e.g. 0.001)

## 3. Server hot-loop GC pressure ([GameRoom.ts](server/src/rooms/GameRoom.ts))

Several methods called every tick allocate new objects:

- `**getPlayersByEdge()**` (called every tick from `checkCollisions`): creates a **new Map** every frame. Fix: keep a reusable `Map` as an instance field, clear and refill it each tick.
- `**getPaddleEndpoints()**` (called per-edge per tick): returns `{ start: { x, y }, end: { x, y } }` — 3 new objects per call. Fix: store a reusable endpoints object on the instance, mutate and return it.
- `**ballPassedThroughEdge()**` (called per-edge per tick): allocates `rel = { x, y }`. Fix: use two local number variables instead of an object.
- `**resetBall()**`: allocates `alive: PlayerSchema[]` with filter+push. Fix: iterate `players` directly and pick a random one in a single pass (reservoir sampling or two-pass count+pick).
- **Cache `(this.ballRadius + 4) ** 2**` as `this.ballHitDistSq` in constructor, reuse in `ballNearLineSegment`.

## 4. Client-side local game GC pressure ([Game.ts](client/src/game/Game.ts))

Same patterns in the local game loop:

- `**getPaddleEndpoints()**` in [Paddle.ts](client/src/game/Paddle.ts): allocates per call in collision check. Fix: add a reusable `_endpoints` object on Paddle, mutate and return it.
- `**getTangentVelocity()**` in Paddle.ts: allocates `{ x, y }` per call. Fix: reuse a cached object.
- `**updateHud()` every frame**: text updates are cheap but unnecessary when lives haven't changed. Fix: only call `updateHud()` when a life is lost or a player is eliminated (move the call into `checkCollisions` where lives change).
- `**launchBall()` / `checkWin()**`: use `this.players.filter()` allocating new arrays. Fix: iterate in-place.
- `**Ball.launch()**` in [Ball.ts](client/src/game/Ball.ts): replaces `this.velocity` with a new object. Fix: mutate `this.velocity.x/y` in place.

## 5. OnlineGame syncState optimization

`syncState()` runs on every Colyseus state patch and iterates ALL players + updates ALL HUD text regardless of what changed:

```112:130:client/src/game/OnlineGame.ts
// Full iteration on every patch
state.players.forEach(...)
this.updateHud();
```

Fix: track dirty state per-player and only update what changed, or at minimum only update HUD when lives/elimination changes (compare previous values).

## 6. WaitingRoom re-render churn ([WaitingRoom.tsx](client/src/lobby/WaitingRoom.tsx))

`onStateChange` fires on every Colyseus patch and rebuilds the entire player list + triggers React setState:

```26:37:client/src/lobby/WaitingRoom.tsx
const sync = () => {
  const list: PlayerInfo[] = [];
  room.state.players.forEach(...)
  setPlayers(list);
```

Fix: compare with previous player state before calling `setPlayers()` — only update when player count, names, or ready states actually changed.

## 7. GameScene useEffect dependency

```71:71:client/src/game/GameScene.tsx
  }, [props]);
```

Depends on the full `props` object which is a new reference every parent render, causing the entire Pixi app to teardown and recreate. Fix: depend on stable individual values (`props.mode`, etc.) and memoize props in the parent or destructure stable deps.

## Priority order

The items are already listed in order of impact. Items 1-3 will address nearly all perceived lag. Items 4-7 are polish that reduce GC pressure and unnecessary work.