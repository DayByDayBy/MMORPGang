decided to build a react app (vite) to start building in 

i figure go modular, so we can easily split concerns and work in parallel



gonna make a dir for `client`, `server`, `shared`

client will be vite + react - front end and that
server will be node + ts + sockets.io -  backend and that
shared will be typescript + types, consts, math stuff, etc

at least thats the current plan (ongoing)



some thoughts on components:

/game
  Ball.ts       ← renders ball from BallState
  Player.ts     ← renders player/paddle from PlayerState  
  Goal.ts       ← renders goal from PlayerState
  Arena.ts      ← renders arena circle and background



each class takes a pixi container and state object, knows how to draw itself. no physics, no input, no networking etc in those, just rendering


eg sth like:

```
export class Ball {
  private gfx: Graphics
  private trailGfx: Graphics

  constructor(stage: Container) {
    this.gfx = new Graphics()
    this.trailGfx = new Graphics()
    stage.addChild(this.trailGfx, this.gfx)
  }

  render(state: BallState) {
    // draw from state
  }
}

```

---

server-side game logic is in:

- `server/src/index.ts` — 60hz tick loop, socket wiring, physics dispatch
- `server/src/game/Ball.ts` — ball state, movement, circular wall bounce
- `server/src/game/GameState.ts` — player add/remove, slot assignment, input map, `applyInputs()`
- `server/src/game/Physics.ts` — `checkPaddleCollision` + `checkGoalCollision`

server uses coordinate system, centred at (0,0) with `ARENA_RADIUS = 400 * ARENA_RADIUS_RATIO`. client still renders a mock state — wiring server state to the renderer is next up

note on `lives`: the goal collision logic decrements `player.lives` and resets the ball, but the lives mechanic might want rethinking?

shrinking paddle arc, definitely, but also maybe it's more fun to play til you diconnect, to make the goal grow until you lose, or sth else actually good that i am too tired to think of right now