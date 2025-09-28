import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import type { SVGProps } from "react";

import Backdrop from "@/app/BackDrop";
import HomePage from "@/features/home/pages/HomePage";
import ChatPage from "@/features/chat/pages/ChatPage";
import PddlEditPage from "@/features/pddl/pages/PddlEditPage";
import PlanPage from "@/features/planning/pages/PlanPage";
import MiniZincPage from "@/features/minizinc/pages/MiniZincPage";
import AppShell, { type AppShellTab } from "@/shared/components/layout/AppShell";

const tabs: AppShellTab[] = [
  { to: "/home", label: "Home", icon: <HomeIcon /> },
  { to: "/chat", label: "Chat", icon: <ChatIcon /> },
  { to: "/pddl-edit", label: "PDDL", icon: <PencilIcon /> },
  { to: "/plan", label: "Plans", icon: <TimelineIcon /> },
  { to: "/minizinc", label: "MiniZinc", icon: <PuzzleIcon /> },
];

function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M4.5 10.5 12 4l7.5 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-4.5h-4.5V19a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-8.5Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H9.8L5 19.5v-13a1.5 1.5 0 0 1 1.5-1.5Z"
        strokeLinejoin="round"
      />
      <path d="M8 10h8M8 13h5" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M5 15.5 16.5 4 20 7.5 8.5 19H5v-3.5Z" strokeLinejoin="round" />
      <path d="m14.5 6 3.5 3.5" strokeLinecap="round" />
    </svg>
  );
}

function TimelineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 6h16M4 12h10M4 18h7" strokeLinecap="round" />
      <circle cx="18" cy="12" r="2" />
      <circle cx="13" cy="18" r="2" />
    </svg>
  );
}

function PuzzleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M8.5 3.5a2.5 2.5 0 0 1 5 0V5H16a1 1 0 0 1 1 1v2.5h1.5a2.5 2.5 0 1 1 0 5H17V16a1 1 0 0 1-1 1h-2.5v1.5a2.5 2.5 0 0 1-5 0V17H6a1 1 0 0 1-1-1v-2.5H3.5a2.5 2.5 0 1 1 0-5H5V6a1 1 0 0 1 1-1h2.5V3.5Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  return (
    <>
      <Backdrop />
      <AppShell tabs={tabs}>
        <Routes>
          <Route path="/" element={<Navigate replace to="/home" />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/pddl-edit" element={<PddlEditPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/minizinc" element={<MiniZincPage />} />
        </Routes>
      </AppShell>
      <Toaster position="bottom-right" />
    </>
  );
}
