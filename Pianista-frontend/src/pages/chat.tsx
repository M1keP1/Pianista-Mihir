// src/pages/chat.tsx
import React, { useState } from "react";
import { useTheme } from "../themeContext";
import BrandLogo from "@/components/VS_BrandButton";
import Textarea from "@/components/Inputbox/TextArea";


// Reuse the Pianista logos you already use on Home
import logoLightBg from "../assets/pianista_logo_black.png";
import logoDarkBg  from "../assets/pianista_logo_white.png";
import SendButton from "@/components/Inputbox/Controls/SendButton";
import useModeDetection from "@/components/Inputbox/hooks/useModeDetection";
import ModeSlider from "@/components/Inputbox/Controls/ModeSlider";

const ChatPage: React.FC = () => {
  const { name } = useTheme();
  const pianistaLogo = name === "light" ? logoLightBg : logoDarkBg;

  const SHIFT_UP = "-10vh";
  const [text, setText] = useState("");

  const submit = () => {
    const payload = text.trim();
    if (!payload) return;
    // TODO: wire to your chat/send pipeline
    console.log("[/chat] SEND:", payload);
    setText("");
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

    const { mode, setManual } = useModeDetection(text, {
    initial: "AI",
    autoDetect: true,
    manualPriorityMs: 1200,
  });

  return (
    <main
      role="main"
      aria-label="Chat"
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
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
          transform: `translateY(${SHIFT_UP})`,
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

        {/* Textarea */}
        <Textarea
          value={text}
          onChange={setText}
          onKeyDown={onKeyDown}
          onSubmit={submit}
          placeholder="Type here… (⌘/Ctrl + Enter)"
          minRows={3}
          maxRows={5}
          width="42vw"
          maxWidth={900}
        />


        {/* Controls BELOW the textarea */}
        <div
        style={{
            width: "42vw",
            maxWidth: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
        }}
        >
            {/* Slider below the box */}
            <ModeSlider value={mode} onChange={setManual} size="xs" />

            {/* SendButton below the box */}
            <SendButton
                onClick={submit}
                disabled={!text.trim()}
                size="md"
            />
          
        </div>
      </div>
    </main>
  );
};

export default ChatPage;
