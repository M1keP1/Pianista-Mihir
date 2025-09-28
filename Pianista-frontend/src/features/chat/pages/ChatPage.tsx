import React from "react";
import { useTheme } from "@/app/providers/ThemeProvider";

import BrandLogo from "@/shared/components/VS_BrandButton";
import Textarea from "@/shared/components/Inputbox/TextArea";
import ModeSlider from "@/shared/components/Inputbox/Controls/ModeSlider";
import PillButton from "@/shared/components/PillButton";
import ArrowUp from "@/shared/components/icons/Send";
import ActionBar from "@/shared/components/layout/ActionBar";

import logoLightBg from "@/assets/pianista_logo_black.png";
import logoDarkBg from "@/assets/pianista_logo_white.png";

import useModeDetection from "@/features/chat/hooks/useModeDetection";
import useShortcuts from "@/features/chat/hooks/useShortcuts";
import SlashMenu from "@/features/chat/components/SlashMenu";
import AddShortcutModal from "@/features/chat/components/AddShortcutModal";
import { useSlashMenu } from "@/features/chat/hooks/useSlashMenu";
import { useChatComposer } from "@/features/chat/hooks/useChatComposer";
import type { Mode } from "@/features/chat/hooks/useChatComposer";

const ChatPage: React.FC = () => {
  const { name } = useTheme();
  const pianistaLogo = name === "light" ? logoLightBg : logoDarkBg;
  const SHIFT_UP = "-10vh";

  // 1) Composer first — we need `text` for auto-detect
  const { text, setText, resetIfCleared, submit, status, statusHint } = useChatComposer();

  // 2) Auto-detection reads the live textarea text
  const { mode, setManual } = useModeDetection(text, { initial: "AI", autoDetect: true, manualPriorityMs: 1200 });

  // 3) Shortcuts + slash menu (DOM-caret anchored)
  const { all: shortcuts, addShortcut } = useShortcuts();
  const textareaRef = React.useRef<{ textarea: HTMLTextAreaElement | null }>(null!);
  const slash = useSlashMenu(textareaRef, text, (next) => setText(next), shortcuts as any);
  const [showCreate, setShowCreate] = React.useState(false);

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    slash.onKeyDown(e);
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "Enter") { e.preventDefault(); submit(mode as Mode); }
  };

  const getPlaceholder = () =>
    mode === "AI" ? "Describe your Domain and Problem and get it in PDDL. Type / for shortcuts" :
    mode === "Domain+Problem" ? "Enter your P+D syntax.  Type / for shortcuts" :
    mode === "Mermaid" ? "Enter your Mermaid syntax to be converted to PDDL.  Type / for shortcuts" :
    mode === "Domain" ? "Enter your Domain syntax.  Type / for shortcuts" :
    "Type natural language";

  return (
    <main
      role="main"
      aria-label="Chat"
      style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", zIndex: 5, padding: "1rem" }}
    >
      <BrandLogo />
      <div style={{ display: "grid", justifyItems: "center", gap: "1rem", width: "min(900px, 92vw)", transform: `translateY(${SHIFT_UP})` }}>
        <img
          src={pianistaLogo}
          alt="Pianista logo"
          draggable={false}
          style={{ width: "clamp(160px, 28vw, 280px)", height: "auto", userSelect: "none", filter: "drop-shadow(0 3px 10px var(--color-shadow))" }}
        />

        <div style={{ position: "relative", width: "42vw", maxWidth: 900 }}>
          <Textarea
            ref={textareaRef as any}
            value={text}
            onKeyDown={onKeyDown}
            onSubmit={() => submit(mode as Mode)}
            placeholder={getPlaceholder()}
            minRows={3}
            maxRows={8}
            width="100%"
            maxWidth={900}
            showStatusPill
            onChange={(next) => resetIfCleared(next)}
            status={status as any}
            statusHint={statusHint}
          />
          {slash.open && slash.filtered.length > 0 && slash.pos && (
            <div style={{ position: "absolute", left: slash.pos.left, top: slash.pos.top, zIndex: 1000 }}>
              <SlashMenu
                items={slash.filtered as any}
                selected={slash.selIdx}
                onSelect={(it: any) => {
                  const idx = slash.filtered.findIndex((x) => x.id === it.id);
                  slash.insertSelected(idx);
                }}
                onCreateShortcut={() => setShowCreate(true)}
              />
            </div>
          )}
        </div>

        <div style={{ width: "42vw", maxWidth: 900, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <ModeSlider value={mode} onChange={setManual} size="xs" />
          <PillButton iconOnly ariaLabel="Send" onClick={() => submit(mode as Mode)} leftIcon={<ArrowUp />} />
        </div>
      </div>

      <AddShortcutModal open={showCreate} onClose={() => setShowCreate(false)} onCreate={addShortcut} />

      <ActionBar>
        <PillButton to="/minizinc" ariaLabel="Go to MiniZinc Solver" label="Go to Solvers" />
      </ActionBar>
    </main>
  );
};

export default ChatPage;
