import { defineServer, defineRoom } from "colyseus";
import { playground } from "@colyseus/playground";
import { GameRoom } from "./rooms/GameRoom";

const port = parseInt(process.env.PORT || "2567", 10);

const server = defineServer({
  rooms: {
    game_room: defineRoom(GameRoom),
  },
  express: (app) => {
    app.use("/playground", playground());
    app.get("/health", (_req, res) => {
      res.json({ status: "ok" });
    });
  },
});

server.listen(port);
console.log(`[GameServer] Listening on port ${port}`);
