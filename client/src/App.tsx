import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { HostPage } from "./pages/HostPage";
import { LocalPage } from "./pages/LocalPage";
import { RoomPage } from "./pages/RoomPage";
import { PlayPage } from "./pages/PlayPage";
import { LocalPlayPage } from "./pages/LocalPlayPage";

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
