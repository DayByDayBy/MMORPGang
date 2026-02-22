import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { GameScene } from "../game/GameScene";

export const PlayPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { room, gameMode, clearAll } = useGame();

  const handleExit = () => {
    clearAll();
    navigate("/");
  };

  if (!room || room.roomId !== id) {
    return <Navigate to="/" replace />;
  }

  return (
    <GameScene
      mode="online"
      gameMode={gameMode}
      room={room}
      onExit={handleExit}
    />
  );
};
