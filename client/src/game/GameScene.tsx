import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import type { Room } from "@colyseus/sdk";
import { Game } from "./Game";
import { OnlineGame } from "./OnlineGame";
import "./GameScene.css";

interface LocalGameProps {
  mode: "local";
  playerCount: number;
  playerName: string;
  onExit: () => void;
}

interface OnlineGameProps {
  mode: "online";
  room: Room;
  onExit: () => void;
}

type GameSceneProps = LocalGameProps | OnlineGameProps;

export const GameScene = (props: GameSceneProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [winner, setWinner] = useState<string | null>(null);

  const onExit = props.onExit;
  const mode = props.mode;
  const playerCount = mode === "local" ? props.playerCount : 0;
  const playerName = mode === "local" ? props.playerName : "";
  const room = mode === "online" ? props.room : null;

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    const app = new Application();
    let game: Game | OnlineGame | null = null;

    setWinner(null);

    const setup = async () => {
      const el = containerRef.current!;
      await app.init({
        background: 0x0a0a1a,
        width: el.clientWidth || window.innerWidth,
        height: el.clientHeight || window.innerHeight,
        resizeTo: el,
        antialias: true,
      });
      if (cancelled) return;

      el.appendChild(app.canvas);

      if (mode === "local") {
        game = new Game(app);
        await game.init(playerCount, playerName, setWinner);
      } else {
        game = new OnlineGame(app, room!);
        await game.init(setWinner);
      }
    };

    setup();

    return () => {
      cancelled = true;
      game?.destroy();
      if (app.renderer) {
        app.canvas?.parentNode?.removeChild(app.canvas);
        app.destroy(true, { children: true });
      }
    };
  }, [mode, playerCount, playerName, room]);

  return (
    <div className="game">
      <div ref={containerRef} className="game__canvas" />

      <div className="game__controls">
        <span className="game__hint">A / D or Arrow Keys to move</span>
        <button onClick={onExit} className="game__exit-btn">
          Exit
        </button>
      </div>

      {winner && (
        <div className="game__overlay">
          <div className="game__win-card">
            <h2 className="game__win-title">Game Over!</h2>
            <p className="game__win-text">{winner} wins!</p>
            <button
              onClick={() => { setWinner(null); onExit(); }}
              className="game__exit-btn"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
