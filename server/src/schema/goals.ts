import { type, MapSchema } from "@colyseus/schema";
import { BasePlayerSchema, BaseGameRoomState } from "./base";
import type { GoalsPlayerState, GoalsGameState } from "shared";

export class GoalsPlayerSchema extends BasePlayerSchema implements GoalsPlayerState {
  @type("uint8") colorIndex: number = 0;
  @type("float32") goalAngle: number = 0;
  @type("float32") paddleAngle: number = 0;
  @type("float32") paddleAngleVelocity: number = 0;
}

export class GoalsGameRoomState extends BaseGameRoomState implements GoalsGameState {
  @type({ map: GoalsPlayerSchema }) players = new MapSchema<GoalsPlayerSchema>();
  @type("float32") arenaRadius: number = 360;
  @type("float32") goalRingRadius: number = 259;
  @type("float32") goalRadius: number = 18;
  @type("float32") orbitRadius: number = 54;
}
