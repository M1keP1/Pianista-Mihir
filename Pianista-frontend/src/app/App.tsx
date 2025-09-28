/**
 * Top-level router that stitches feature pages together while keeping global
 * chrome (backdrop, theme toggle, footer, notifications) in a single place.
 */
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Backdrop from "@/app/BackDrop";
import ThemeSwitcherFab from "@/shared/components/themeSwitcher";
import PianistaFooter from "@/shared/components/footer";
import HomePage from "@/features/home/pages/HomePage";
import ChatPage from "@/features/chat/pages/ChatPage";
import PddlEditPage from "@/features/pddl/pages/PddlEditPage";
import PlanPage from "@/features/planning/pages/PlanPage";
import MiniZincPage from "@/features/minizinc/pages/MiniZincPage";

export default function App() {
  const { pathname } = useLocation();

  return (
    <>
      <Backdrop />
      <Routes>
        <Route path="/" element={<Navigate replace to="/home" />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/pddl-edit" element={<PddlEditPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/minizinc" element={<MiniZincPage />} />
      </Routes>
      <ThemeSwitcherFab />
      {!pathname.startsWith("/pddl-edit") && <PianistaFooter />}
      <Toaster position="bottom-right" />
    </>
  );
}
