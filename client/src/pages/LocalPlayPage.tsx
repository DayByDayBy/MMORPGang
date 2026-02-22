import { Navigate, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { GameScene } from "../game/GameScene";

export const LocalPlayPage = () => {
  const navigate = useNavigate();
  const { localState, clearAll } = useGame();

  const handleExit = () => {
    clearAll();
    navigate("/");
  };

  if (!localState) {
    return <Navigate to="/" replace />;
  }

  return (
    <GameScene
      mode="local"
      gameMode={localState.gameMode}
      playerCount={localState.playerCount}
      playerName={localState.playerName}
      onExit={handleExit}
    />
  );
};
