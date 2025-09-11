import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/home";
import ThemeSwitcherFab from "./components/themeSwitcher";
import Backdrop from "./BackDrop";
import PianistaFooter from "./components/footer";
import ChatPage from "./pages/chat";


export default function App() {
  return (
    <>
    <Backdrop/>
    <Routes>
      <Route path="/" element={<Navigate replace to="/home" />} />
      <Route path="/home" element={<Home />} />
      <Route path="/chat" element={<ChatPage />} />
    </Routes>
    <ThemeSwitcherFab/>
    <PianistaFooter/>

    </>
  );
}
