import { Schema, type } from "@colyseus/schema";
import type { BallState, BasePlayerState, BaseGameState } from "shared";

export class BaseBallSchema extends Schema implements BallState {
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
}

export class BasePlayerSchema extends Schema implements BasePlayerState {
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
  @type("uint8") lives: number = 3;
  @type("boolean") eliminated: boolean = false;
  @type("boolean") ready: boolean = false;
}

export class BaseGameRoomState extends Schema implements BaseGameState {
  @type("string") phase: string = "waiting";
  @type("string") mode: string = "classic";
  @type("string") winnerId: string = "";
  @type("string") winnerName: string = "";
  @type("uint8") maxPlayers: number = 12;
  @type(BaseBallSchema) ball: BaseBallSchema = new BaseBallSchema();
}
