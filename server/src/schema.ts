import { Schema, type, MapSchema } from "@colyseus/schema";

export class BallSchema extends Schema {
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
}

export class PlayerSchema extends Schema {
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
  @type("uint8") colorIndex: number = 0;
  @type("uint8") edgeIndex: number = 0;
  @type("uint8") lives: number = 3;
  @type("boolean") eliminated: boolean = false;
  @type("boolean") ready: boolean = false;
  @type("float32") paddlePosition: number = 0.5;
}

export class GameRoomState extends Schema {
  @type("string") phase: string = "waiting";
  @type("string") winnerId: string = "";
  @type("string") winnerName: string = "";
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type(BallSchema) ball: BallSchema = new BallSchema();
  @type("float32") arenaRadius: number = 350;
  @type("uint8") numSides: number = 0;
  @type("uint8") maxPlayers: number = 4;
}
