// src/pages/chat.tsx
import React from "react";
import { useTheme } from "../themeContext";
import BrandLogo from "@/components/VS_BrandButton";
import Textarea from "@/components/Inputbox/TextArea";

// Logos
import logoLightBg from "../assets/pianista_logo_black.png";
import logoDarkBg from "../assets/pianista_logo_white.png";

// Controls
import useModeDetection from "@/hooks/useModeDetection";
import ModeSlider from "@/components/Inputbox/Controls/ModeSlider";

// Carry to editor (for P+D / Domain branches)
import { useNavigate } from "react-router-dom";
import { savePddl, saveChatFirstInput } from "@/lib/pddlStore";

// Mermaid → PDDL
import { convertMermaid } from "@/api/pianista/convertMermaid";

// NL → Domain(+Problem)
import { generateDomainFromNL } from "@/api/pianista/generateDomain";
import PillButton from "@/components/PillButton";
import ArrowUp from "@/components/icons/Send";

import useShortcuts from "@/hooks/useShortcuts";
import SlashMenu from "@/components/SlashMenu";
import AddShortcutModal from "@/components/AddShortcutModal";


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

  // Track saving the very first user input
  const firstSavedRef = React.useRef(false);

  // Save PDDL to store if present in a blob
  const persistIfPddl = (text: string) => {
    const kind = detectPddlKind(text);
    if (kind === "AI") return;
    const { domain, problem } = splitPddl(text);
    if (domain || problem) {
      savePddl({ domain, problem });
    }
  };

  /* ------------------------------- Submission ----------------------------- */
  const submit = async () => {
    const payload = output.trim();
    if (!payload) return;

    // Save the *first* chat input + its type
    if (!firstSavedRef.current) {
      const inputType =
        mode === "Mermaid" ? "mermaid" :
        mode === "AI"      ? "nl"      :
        mode === "Domain"  ? "domain"  :
        mode === "Domain+Problem" ? "pddl" : "unknown";
      saveChatFirstInput(payload, inputType);
      firstSavedRef.current = true;
    }

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
        persistIfPddl(converted); // store domain/problem if present
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
        persistIfPddl(combined); // store generated domain/problem
        setAiStatus("idle");
      } catch {
        setAiStatus("error");
      }
      return;
    }
  };

  // ===== Slash Shortcuts =====
  const { all: shortcuts, addShortcut } = useShortcuts();

  const [slashOpen,   setSlashOpen]   = React.useState(false);
  const [slashQuery,  setSlashQuery]  = React.useState("");
  const [slashStart,  setSlashStart]  = React.useState<number | null>(null);
  const [selIdx,      setSelIdx]      = React.useState(0);
  const [showCreate,  setShowCreate]  = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = slashQuery.trim().toLowerCase();
    const list = q ? shortcuts.filter(s => s.name.toLowerCase().startsWith(q)) : shortcuts;
    return list.slice(0, 8);
  }, [slashQuery, shortcuts]);

  // caret-anchored menu position (relative to textarea padding box)
  const textareaRef = React.useRef<{ textarea: HTMLTextAreaElement | null }>(null);
  const [menuPos, setMenuPos] = React.useState<{ left: number; top: number } | null>(null);



// Replace the detectSlashAtCaret function with this improved version:

function detectSlashAtCaret(value: string, caret: number) {
  // Only open menu if caret is AFTER a "/" (not when typing the "/" itself)
  if (caret === 0) return { active: false as const };
  
  // Look backwards to find start of current word
  let wordStart = caret;
  while (wordStart > 0 && /\S/.test(value[wordStart - 1])) {
    wordStart--;
  }
  
  // Check if this word starts with "/" AND we're past the "/"
  if (wordStart < value.length && value[wordStart] === "/" && caret > wordStart) {
    const query = value.slice(wordStart + 1, caret);
    return { 
      active: true as const, 
      start: wordStart, 
      query: query 
    };
  }
  
  return { active: false as const };
}

// Update the updateMenuUnderCaret function to use the query:

function updateMenuUnderCaret() {
  const el = textareaRef.current?.textarea;
  if (!el) return;

  const caretIndex = el.selectionStart ?? el.value.length;
  const state = detectSlashAtCaret(el.value, caretIndex);

  if (!state.active) {
    setSlashOpen(false);
    setSlashStart(null);
    setSlashQuery("");
    setMenuPos(null);
    return;
  }

  setSlashOpen(true);
  setSlashStart(state.start);
  setSlashQuery(state.query); // Use the extracted query

  // --- caret positioning (same as before) ---
  const cs = getComputedStyle(el);
  const mirror = document.createElement("div");
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  (mirror.style as any).wordWrap = "break-word";
  [
    "fontFamily","fontSize","fontWeight","fontStyle","letterSpacing","textTransform",
    "lineHeight","textAlign","paddingTop","paddingRight","paddingBottom","paddingLeft",
    "borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth",
    "boxSizing"
  ].forEach((k) => (mirror.style as any)[k] = (cs as any)[k]);
  mirror.style.width = el.clientWidth + "px";
  mirror.textContent = el.value.slice(0, caretIndex);
  const caretSpan = document.createElement("span");
  caretSpan.textContent = "\u200b";
  mirror.appendChild(caretSpan);
  document.body.appendChild(mirror);

  const mRect = mirror.getBoundingClientRect();
  const cRect = caretSpan.getBoundingClientRect();
  const left = cRect.left - mRect.left - el.scrollLeft;
  const top  = cRect.top  - mRect.top  - el.scrollTop + (parseFloat(cs.lineHeight || "16") || 16) + 6;

  document.body.removeChild(mirror);

  const maxLeft = el.clientWidth - 360 - 12;
  const clampedLeft = Math.max(8, Math.min(left, Math.max(8, maxLeft)));
  setMenuPos({ left: clampedLeft, top });
}

// Also update the insertShortcutText function to properly replace the slash and query:

function insertShortcutText(text: string) {
  const el = textareaRef.current?.textarea;
  if (!el) return;
  const caret = el.selectionStart ?? output.length;

  const start = slashStart ?? caret;
  const end   = caret;
  const before = output.slice(0, start);
  const after  = output.slice(end);

  const next = before + text + after;
  setOutput(next);

  requestAnimationFrame(() => {
    const node = textareaRef.current?.textarea;
    if (!node) return;
    const pos = (before + text).length;
    node.focus();
    node.setSelectionRange(pos, pos);
  });

  setSlashOpen(false);
  setSlashQuery("");
  setSlashStart(null);
  setSelIdx(0);
}

  // Recompute on text change and on selection/scroll
  React.useEffect(() => {
    const el = textareaRef.current?.textarea;
    if (!el) return;

    const onMove = () => updateMenuUnderCaret();
    const onInputDelayed = () => setTimeout(updateMenuUnderCaret, 0);

    onMove(); // run once
    el.addEventListener("focus", onMove);
    el.addEventListener("keyup", onMove);
    el.addEventListener("click", onMove);
    el.addEventListener("scroll", onMove);
    el.addEventListener("input", onInputDelayed);

    return () => {
      el.removeEventListener("focus", onMove);
      el.removeEventListener("keyup", onMove);
      el.removeEventListener("click", onMove);
      el.removeEventListener("scroll", onMove);
      el.removeEventListener("input", onInputDelayed);
    };
  }, [output]);

  // Cmd/Ctrl + Enter sends; plus menu nav when open
  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (slashOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx(i => Math.min(filtered.length - 1, i + 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelIdx(i => Math.max(0, i - 1)); return; }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        if (filtered[selIdx]) insertShortcutText(filtered[selIdx].text);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashOpen(false);
        return;
      }
    }

    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  // 🔑 Placeholder changes with mode
  const getPlaceholder = () => {
    switch (mode) {
      case "AI":
        return "Describe your Domain and Problem and get it in PDDL. Type / for shortcuts";
      case "Domain+Problem":
        return "Enter your P+D syntax.  Type / for shortcuts";
      case "Mermaid":
        return "Enter your Mermaid syntax to be converted to PDDL.  Type / for shortcuts";
      case "Domain":
        return "Enter your Domain syntax.  Type / for shortcuts";
      default:
        return "Type natural language";
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

        {/* Textarea + caret-anchored SlashMenu */}
        <div style={{ position: "relative", width: "42vw", maxWidth: 900 }}>
          <Textarea
            ref={textareaRef as any}
            value={output}
            onChange={setOutput}
            onKeyDown={onKeyDown}
            onSubmit={submit}
            placeholder={getPlaceholder()}
            minRows={3}
            maxRows={8}
            width="100%"
            maxWidth={900}
            showStatusPill
            status={
              mmStatus !== "idle"
                ? mmStatus
                : aiStatus !== "idle"
                ? aiStatus
                : "idle"
            }
          />

          {slashOpen && filtered.length > 0 && menuPos && (
            <div style={{ position: "absolute", left: menuPos.left, top: menuPos.top, zIndex: 1000 }}>
              <SlashMenu
                items={filtered}
                selected={selIdx}
                onSelect={(it) => insertShortcutText(it.text)}
                onCreateShortcut={() => setShowCreate(true)}
              />
            </div>
          )}
        </div>

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
          <PillButton
            iconOnly
            ariaLabel="Send"
            onClick={submit}
            leftIcon={<ArrowUp />}
            disabled={
              !output.trim() ||
              mmStatus === "verification" ||
              aiStatus === "ai-thinking"
            }
          />
        </div>
      </div>

      {/* Create Shortcut modal */}
      <AddShortcutModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={addShortcut}
      />
    </main>
  );
};

export default ChatPage;
