import { useCallback, useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import type { GameMode, BaseGameState } from "shared";
import { PLAYER_BG_COLORS } from "shared";
import type { Room } from "@colyseus/sdk";
import { ClassicGame } from "./classic/ClassicGame";
import { ClassicOnlineGame } from "./classic/ClassicOnlineGame";
import { GoalsGame } from "./goals/GoalsGame";
import { GoalsOnlineGame } from "./goals/GoalsOnlineGame";
import { GameHud, type HudPlayer } from "./GameHud";
import { Button } from "@/components/Button";

interface LocalGameProps {
  mode: "local";
  gameMode: GameMode;
  playerCount: number;
  playerName: string;
  playerEmoji: string;
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
  const [hudPlayers, setHudPlayers] = useState<HudPlayer[]>([]);

  const onHudUpdate = useCallback((players: HudPlayer[]) => {
    setHudPlayers(players);
  }, []);

  const { mode, gameMode, onExit } = props;
  const playerCount = mode === "local" ? props.playerCount : 0;
  const playerName = mode === "local" ? props.playerName : "";
  const playerEmoji = mode === "local" ? props.playerEmoji : "";
  const room = mode === "online" ? props.room : null;

  const bgColor = (() => {
    if (mode === "online" && room) {
      const me = (room.state as any).players?.get(room.sessionId);
      const idx = me?.colorIndex ?? 0;
      return PLAYER_BG_COLORS[idx % PLAYER_BG_COLORS.length];
    }
    return "#0a0a1a";
  })();

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    const app = new Application();
    let game: ClassicGame | ClassicOnlineGame | GoalsGame | GoalsOnlineGame | null = null;

    setEndState(null);

    const setup = async () => {
      const el = containerRef.current!;
      await app.init({
        backgroundAlpha: 0,
        width: el.clientWidth || window.innerWidth,
        height: el.clientHeight || window.innerHeight,
        resizeTo: el,
        antialias: true,
      });
      if (cancelled) return;

      el.appendChild(app.canvas);

      if (mode === "local" && gameMode === "classic") {
        game = new ClassicGame(app, onHudUpdate);
        await game.init(playerCount, playerName, playerEmoji, (winnerName) => {
          setEndState(winnerName ? { kind: "win", name: winnerName } : { kind: "loss" });
        });
      } else if (mode === "local" && gameMode === "goals") {
        game = new GoalsGame(app, onHudUpdate);
        await game.init(playerCount, playerName, playerEmoji, (winnerName) => {
          setEndState(winnerName ? { kind: "win", name: winnerName } : { kind: "loss" });
        });
      } else if (mode === "online" && gameMode === "classic") {
        game = new ClassicOnlineGame(app, room! as any, onHudUpdate);
        await game.init(
          (winnerName) => setEndState({ kind: "win", name: winnerName }),
          () => setEndState({ kind: "eliminated" }),
        );
      } else if (mode === "online" && gameMode === "goals") {
        game = new GoalsOnlineGame(app, room! as any, onHudUpdate);
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
  }, [mode, gameMode, playerCount, playerName, playerEmoji, room, onHudUpdate]);

  const handleExit = () => {
    setEndState(null);
    onExit();
  };

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: bgColor }}>
      <div ref={containerRef} className="w-full h-full" />
      <GameHud players={hudPlayers} />

      <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-6">
        <span className="text-neutral-500">A / D or Arrow Keys to move</span>
        <Button variant="ghost" size="sm" onClick={onExit}>
          Exit
        </Button>
      </div>

      {endState?.kind === "eliminated" && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-[100]">
          <div className="p-10 text-center flex flex-col items-center gap-4">
            <h2 className="m-0 text-white text-2xl">You were eliminated!</h2>
            <div className="flex gap-3 mt-2">
              <Button variant="accent" size="sm" onClick={() => setEndState(null)}>
                Spectate
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExit}>
                Exit Game
              </Button>
            </div>
          </div>
        </div>
      )}

      {endState?.kind === "loss" && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-[100]">
          <div className="p-10 text-center flex flex-col items-center gap-4">
            <h2 className="m-0 text-white text-2xl">Game Over!</h2>
            <p className="m-0 text-sky-300">You lost!</p>
            <Button variant="ghost" size="sm" onClick={handleExit}>
              Back to Lobby
            </Button>
          </div>
        </div>
      )}

      {endState?.kind === "win" && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-[100]">
          <div className="p-10 text-center flex flex-col items-center gap-4">
            <h2 className="m-0 text-white text-2xl">Game Over!</h2>
            <p className="m-0 text-sky-300">{endState.name} wins!</p>
            <Button variant="ghost" size="sm" onClick={handleExit}>
              Back to Lobby
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
