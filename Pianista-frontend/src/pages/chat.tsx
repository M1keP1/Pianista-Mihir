// src/pages/chat.tsx
import React from "react";
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

// Carry to editor (for P+D / Domain branches)
import { useNavigate } from "react-router-dom";
import { savePddl } from "@/lib/pddlStore";

// Mermaid → PDDL
import { convertMermaid } from "@/api/pianista/convertMermaid";

// NL → Domain(+Problem)
import { generateDomainFromNL } from "@/api/pianista/generateDomain";

/* ---------------- Helpers ---------------- */

// Finds the next "(define (" occurrence after a given index
function nextDefineIndex(text: string, from: number) {
  const re = /\(define\s*\(/g;
  re.lastIndex = Math.max(0, from);
  const m = re.exec(text);
  return m ? m.index : -1;
}

// Split a combined PDDL blob into domain/problem parts
function splitPddl(text: string) {
  const dIdx = text.indexOf("(define (domain");
  const pIdx = text.indexOf("(define (problem");

  // none found
  if (dIdx < 0 && pIdx < 0) return { domain: "", problem: "" };

  const cutAfter = (start: number) => {
    if (start < 0) return -1;
    const next = nextDefineIndex(text, start + 1);
    return next === -1 ? text.length : next;
  };

  const domain = dIdx >= 0 ? text.slice(dIdx, cutAfter(dIdx)).trim() : "";
  const problem = pIdx >= 0 ? text.slice(pIdx, cutAfter(pIdx)).trim() : "";
  return { domain, problem };
}

// Detect which mode a PDDL blob corresponds to
function detectPddlKind(text: string): "Domain+Problem" | "Domain" | "Problem" | "AI" {
  const hasD = text.includes("(define (domain");
  const hasP = text.includes("(define (problem");
  if (hasD && hasP) return "Domain+Problem";
  if (hasD) return "Domain";
  if (hasP) return "Problem";
  return "AI";
}

const ChatPage: React.FC = () => {
  /* -------------------------- Theming / branding -------------------------- */
  const { name } = useTheme();
  const pianistaLogo = name === "light" ? logoLightBg : logoDarkBg;
  const SHIFT_UP = "-10vh";

  /* ----------------------- Local textarea state --------------------------- */
  const [output, setOutput] = React.useState("");

  /* ----------------------------- Mode handling ---------------------------- */
  const { mode, setManual } = useModeDetection(output, {
    initial: "AI",
    autoDetect: true,
    manualPriorityMs: 1200,
  });

  const navigate = useNavigate();

  // Spinner/error state for conversions/generation
  const [mmStatus, setMmStatus] = React.useState<"idle" | "verification" | "error">("idle");
  const [aiStatus, setAiStatus] = React.useState<"idle" | "ai-thinking" | "error">("idle");

  /* ------------------------------- Submission ----------------------------- */
  const submit = async () => {
    const payload = output.trim();
    if (!payload) return;

    if (mode === "Domain+Problem") {
      const { domain, problem } = splitPddl(payload);
      if (!domain && !problem) return;
      savePddl({ domain, problem });
      navigate("/pddl-edit");
      return;
    }

    if (mode === "Domain") {
      const { domain, problem } = splitPddl(payload);
      if (!domain) return;
      savePddl({ domain, problem });
      navigate("/pddl-edit");
      return;
    }

    if (mode === "Mermaid") {
      // Convert Mermaid -> PDDL and repopulate the textbox
      setMmStatus("verification");
      try {
        const res = await convertMermaid(payload, 1);
        if (res.result_status !== "success" || !res.conversion_result) {
          setMmStatus("error");
          return;
        }
        const converted = res.conversion_result.trim();
        setOutput(converted);
        setMmStatus("idle");
      } catch {
        setMmStatus("error");
      }
      return;
    }

    if (mode === "AI") {
      // Natural language → Domain (+ Problem) and repopulate
      setAiStatus("ai-thinking");
      try {
        const res = await generateDomainFromNL(payload, {
          attempts: 1,
          generate_both: true, // ← important
        });
        if (res.result_status !== "success" || !res.generated_domain) {
          setAiStatus("error");
          return;
        }
        const domain = res.generated_domain?.trim() ?? "";
        const problem = res.generated_problem?.trim() ?? "";
        const combined = problem ? `${domain}\n\n${problem}` : domain;

        setOutput(combined);
        setAiStatus("idle");
      } catch {
        setAiStatus("error");
      }
      return;
    }
  };

  // Cmd/Ctrl + Enter sends; Shift+Enter newline is handled by Textarea internally
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

        {/* Textarea */}
        <Textarea
          value={output}
          onChange={setOutput}
          onKeyDown={onKeyDown}
          onSubmit={submit}
          placeholder="Type natural language, Mermaid, or PDDL… (⌘/Ctrl + Enter)"
          minRows={3}
          maxRows={5}
          width="42vw"
          maxWidth={900}
          showStatusPill
          // Show conversion/generation spinner when active
          status={
            mmStatus !== "idle"
              ? mmStatus
              : aiStatus !== "idle"
              ? aiStatus
              : "idle"
          }
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
            disabled={
              !output.trim() ||
              mmStatus === "verification" ||
              aiStatus === "ai-thinking"
            }
            size="md"
          />
        </div>
      </div>
    </main>
  );
};

export default ChatPage;
