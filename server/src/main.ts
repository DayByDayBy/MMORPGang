import express from "express";
import { defineServer, defineRoom } from "colyseus";
import { playground } from "@colyseus/playground";
import { GameRoom } from "./rooms/GameRoom";
import { audioStore } from "./audioStore";

const port = parseInt(process.env.PORT || "2567", 10);

const server = defineServer({
  rooms: {
    game_room: defineRoom(GameRoom),
  },
  express: (app) => {
    app.use(express.json({ limit: "1mb" }));

    app.post("/api/audio", (req, res) => {
      const { roomId, sessionId, audio } = req.body;
      if (!roomId || !sessionId || !audio || typeof audio !== "string") {
        res.status(400).json({ error: "missing fields" });
        return;
      }
      audioStore.set(`${roomId}:${sessionId}`, audio);
      res.json({ ok: true });
    });

    app.get("/api/audio/:roomId/:sessionId", (req, res) => {
      const key = `${req.params.roomId}:${req.params.sessionId}`;
      const data = audioStore.get(key);
      if (!data) {
        res.status(404).json({ error: "not found" });
        return;
      }
      res.json({ audio: data });
    });

    app.use("/playground", playground());
    app.get("/health", (_req, res) => {
      res.json({ status: "ok" });
    });
  },
});

server.listen(port);
console.log(`[GameServer] Listening on port ${port}`);
