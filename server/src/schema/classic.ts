import { type, MapSchema } from "@colyseus/schema";
import { BasePlayerSchema, BaseGameRoomState } from "./base";
import type { ClassicPlayerState, ClassicGameState } from "shared";

export class ClassicPlayerSchema extends BasePlayerSchema implements ClassicPlayerState {
  @type("uint8") colorIndex: number = 0;
  @type("uint8") edgeIndex: number = 0;
  @type("float32") paddlePosition: number = 0.5;
}

export class ClassicGameRoomState extends BaseGameRoomState implements ClassicGameState {
  @type({ map: ClassicPlayerSchema }) players = new MapSchema<ClassicPlayerSchema>();
  @type("float32") arenaRadius: number = 350;
  @type("uint8") numSides: number = 0;
}
