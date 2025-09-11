// src/pages/chat.tsx
import React, { useState } from "react";
import { useTheme } from "../themeContext";
import BrandLogo from "@/components/VS_BrandButton";

// Reuse the Pianista logos you already use on Home
import logoLightBg from "../assets/pianista_logo_black.png";
import logoDarkBg  from "../assets/pianista_logo_white.png";
import Textarea from "@/components/Inputbox/TextArea";

const ChatPage: React.FC = () => {
  const { name } = useTheme();
  const pianistaLogo = name === "light" ? logoLightBg : logoDarkBg;

  // Shift amount after centering (tweak as you like)
  const SHIFT_UP = "-10vh";

  // Input state + handlers
  const [text, setText] = useState("");

  return (
    <main
      role="main"
      aria-label="Chat"
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",  // center first…
        textAlign: "center",
        zIndex: 5,
        padding: "1rem",
      }}
    >
      {/* Top-left VisionSpace branding */}
      <BrandLogo />

      {/* Centered stack, then shifted upward */}
      <div
        style={{
          display: "grid",
          justifyItems: "center",
          gap: "1rem",
          width: "min(900px, 92vw)",
          transform: `translateY(${SHIFT_UP})`, // …then shift up
        }}
      >
        {/* Smaller Pianista logo */}
        <img
          src={pianistaLogo}
          alt="Pianista logo"
          draggable={false}
          style={{
            width: "clamp(160px, 28vw, 280px)",
            height: "auto",
            userSelect: "none",
            filter: "drop-shadow(0 3px 10px var(--color-shadow))",
          }}
        />
        <Textarea
        value={text}
        onChange={setText}
        placeholder="Type here…"
        minRows={3}
        maxRows={5}
        width="42vw"
        maxWidth={900}
        />

      </div>
    </main>
  );
};

export default ChatPage;
