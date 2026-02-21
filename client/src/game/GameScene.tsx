import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import type { GameMode, BaseGameState } from "shared";
import type { Room } from "@colyseus/sdk";
import { ClassicGame } from "./classic/ClassicGame";
import { ClassicOnlineGame } from "./classic/ClassicOnlineGame";
import { GoalsGame } from "./goals/GoalsGame";
import { GoalsOnlineGame } from "./goals/GoalsOnlineGame";
import "./GameScene.css";

interface LocalGameProps {
  mode: "local";
  gameMode: GameMode;
  playerCount: number;
  playerName: string;
  onExit: () => void;
}

interface OnlineGameProps {
  mode: "online";
  gameMode: GameMode;
  room: Room<BaseGameState>;
  onExit: () => void;
}

type GameSceneProps = LocalGameProps | OnlineGameProps;

type EndState =
  | { kind: "win"; name: string }
  | { kind: "loss" }
  | { kind: "eliminated" }
  | null;

export const GameScene = (props: GameSceneProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [endState, setEndState] = useState<EndState>(null);

  const onExit = props.onExit;
  const mode = props.mode;
  const gameMode = props.gameMode;
  const playerCount = mode === "local" ? props.playerCount : 0;
  const playerName = mode === "local" ? props.playerName : "";
  const room = mode === "online" ? props.room : null;

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    const app = new Application();
    let game: ClassicGame | ClassicOnlineGame | GoalsGame | GoalsOnlineGame | null = null;

    setEndState(null);

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

      if (mode === "local" && gameMode === "classic") {
        game = new ClassicGame(app);
        await game.init(playerCount, playerName, (winnerName) => {
          setEndState(winnerName ? { kind: "win", name: winnerName } : { kind: "loss" });
        });
      } else if (mode === "local" && gameMode === "goals") {
        game = new GoalsGame(app);
        await game.init(playerCount, playerName, (winnerName) => {
          setEndState(winnerName ? { kind: "win", name: winnerName } : { kind: "loss" });
        });
      } else if (mode === "online" && gameMode === "classic") {
        game = new ClassicOnlineGame(app, room! as any);
        await game.init(
          (winnerName) => setEndState({ kind: "win", name: winnerName }),
          () => setEndState({ kind: "eliminated" }),
        );
      } else if (mode === "online" && gameMode === "goals") {
        game = new GoalsOnlineGame(app, room! as any);
        await game.init(
          (winnerName) => setEndState({ kind: "win", name: winnerName }),
          () => setEndState({ kind: "eliminated" }),
        );
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
  }, [mode, gameMode, playerCount, playerName, room]);

  const handleExit = () => {
    setEndState(null);
    onExit();
  };

  return (
    <div className="game">
      <div ref={containerRef} className="game__canvas" />

      <div className="game__controls">
        <span className="game__hint">A / D or Arrow Keys to move</span>
        <button onClick={onExit} className="game__exit-btn">
          Exit
        </button>
      </div>

      {endState?.kind === "eliminated" && (
        <div className="game__overlay">
          <div className="game__win-card">
            <h2 className="game__win-title">You were eliminated!</h2>
            <div className="game__eliminated-actions">
              <button
                onClick={() => setEndState(null)}
                className="game__spectate-btn"
              >
                Spectate
              </button>
              <button onClick={handleExit} className="game__exit-btn">
                Exit Game
              </button>
            </div>
          </div>
        </div>
      )}

      {endState?.kind === "loss" && (
        <div className="game__overlay">
          <div className="game__win-card">
            <h2 className="game__win-title">Game Over!</h2>
            <p className="game__win-text">You lost!</p>
            <button onClick={handleExit} className="game__exit-btn">
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {endState?.kind === "win" && (
        <div className="game__overlay">
          <div className="game__win-card">
            <h2 className="game__win-title">Game Over!</h2>
            <p className="game__win-text">{endState.name} wins!</p>
            <button onClick={handleExit} className="game__exit-btn">
              Back to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
