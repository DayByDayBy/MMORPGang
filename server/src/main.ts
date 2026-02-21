// @ts-ignore
import express from "express";
import path from "path";
import { defineServer, defineRoom } from "colyseus";
import { playground } from "@colyseus/playground";
import { ClassicGameRoom } from "./rooms/ClassicGameRoom";
import { GoalsGameRoom } from "./rooms/GoalsGameRoom";
import { audioStore } from "./audioStore";

const port = parseInt(process.env.PORT || "2567", 10);
const clientBuildPath = path.resolve(__dirname, "../../client/dist");

const server = defineServer({
  rooms: {
    classic_room: defineRoom(ClassicGameRoom),
    goals_room: defineRoom(GoalsGameRoom),
  },
  express: (app) => {
    app.use(express.json({ limit: "1mb" }));

    app.post("/api/audio", (req: any, res: any) => {
      const { roomId, sessionId, audio } = req.body;
      if (!roomId || !sessionId || !audio || typeof audio !== "string") {
        res.status(400).json({ error: "missing fields" });
        return;
      }
      audioStore.set(`${roomId}:${sessionId}`, audio);
      res.json({ ok: true });
    });

    app.get("/api/audio/:roomId/:sessionId", (req: any, res: any) => {
      const key = `${req.params.roomId}:${req.params.sessionId}`;
      const data = audioStore.get(key);
      if (!data) {
        res.status(404).json({ error: "not found" });
        return;
      }
      res.json({ audio: data });
    });

    app.use("/playground", playground());
    app.get("/health", (_req: any, res: any) => {
      res.json({ status: "ok" });
    });

    app.use(express.static(clientBuildPath));

    app.get("/{*splat}", (_req: any, res: any) => {
      res.sendFile(path.join(clientBuildPath, "index.html"));
    });
  },
});

server.listen(port);
console.log(`[GameServer] Listening on port ${port}`);
