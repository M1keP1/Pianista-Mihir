// src/pages/chat.tsx
import React, { useMemo } from "react";
import { useTheme } from "../themeContext";
import BrandLogo from "@/components/VS_BrandButton";
import Textarea from "@/components/Inputbox/TextArea";

// Logos
import logoLightBg from "../assets/pianista_logo_black.png";
import logoDarkBg from "../assets/pianista_logo_white.png";

// Controls
import SendButton from "@/components/Inputbox/Controls/SendButton";
import useModeDetection from "@/components/Inputbox/hooks/useModeDetection";
import ModeSlider from "@/components/Inputbox/Controls/ModeSlider";

// Pipeline
import { useMessagePipeline } from "@/hooks/useMessagePipeline";

// AI flow (real: NL→PDDL→Validate)
import { flowChatAI } from "@/flows/flow.chat.ai";

const ChatPage: React.FC = () => {
  /* -------------------------- Theming / branding -------------------------- */
  const { name } = useTheme();
  const pianistaLogo = name === "light" ? logoLightBg : logoDarkBg;
  const SHIFT_UP = "-10vh";

  /* ----------------------- Pipeline state for textarea -------------------- */
  // Pass an initial flow. We'll still gate execution by mode below.
  const { status, output, setOutput, run } = useMessagePipeline(flowChatAI);

  /* ----------------------------- Mode handling ---------------------------- */
  // Detect current mode (AI, Domain, Domain+Problem, Mermaid)
  const { mode, setManual } = useModeDetection(output, {
    initial: "AI",
    autoDetect: true,
    manualPriorityMs: 1200,
  });

  // Optionally keep this for future when multiple flows are active
  const isSending = status === "ai-thinking" || status === "verification";

  /* ------------------------------- Submission ----------------------------- */
  const submit = () => {
    const payload = output.trim();
    if (!payload) return;

    // For now, only AI mode triggers the real flow; others are blank/no-op
    if (mode !== "AI") return;

    // NOTE: useMessagePipeline.run accepts only the text argument (one arg).
    run(payload);
  };

  // Cmd/Ctrl + Enter sends; Shift+Enter = newline is handled by Textarea internally
  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  /* --------------------------------- UI ---------------------------------- */
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
      {/* VisionSpace brand button (top-left) */}
      <BrandLogo />

      {/* Center stack (shifted upward) */}
      <div
        style={{
          display: "grid",
          justifyItems: "center",
          gap: "1rem",
          width: "min(900px, 92vw)",
          transform: `translateY(${SHIFT_UP})`,
        }}
      >
        {/* Pianista logo */}
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

        {/* Textarea controlled by the pipeline */}
        <Textarea
          value={output}
          onChange={setOutput}
          onKeyDown={onKeyDown}
          onSubmit={submit}
          placeholder="Type here… (⌘/Ctrl + Enter)"
          minRows={3}
          maxRows={5}
          width="42vw"
          maxWidth={900}
          showStatusPill
          status={status} // ai-thinking / verification / verified / error
        />

        {/* Controls: mode switch + send */}
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
          <ModeSlider value={mode} onChange={setManual} size="xs" />
          <SendButton
            onClick={submit}
            disabled={!output.trim() || isSending}
            size="md"
          />
        </div>
      </div>
    </main>
  );
};

export default ChatPage;
