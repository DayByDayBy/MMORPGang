import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/home/HomePage";
import { HostPage } from "./pages/host/HostPage";
import { LocalPage } from "./pages/local/LocalPage";
import { RoomPage } from "./pages/room/RoomPage";
import { PlayPage } from "./pages/play/PlayPage";
import { LocalPlayPage } from "./pages/local-play/LocalPlayPage";

export const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/host" element={<HostPage />} />
      <Route path="/local" element={<LocalPage />} />
      <Route path="/local/play" element={<LocalPlayPage />} />
      <Route path="/:id" element={<RoomPage />} />
      <Route path="/:id/play" element={<PlayPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
