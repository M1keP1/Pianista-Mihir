/**
 * Auto-selects the right editor mode (AI/Domain/Problem) by inspecting the
 * current text while honouring recent manual overrides.
 */
import { useEffect, useRef, useCallback } from "react";

export type TwoMode = "AI" | "D" | "P";
export type BoxKind = "domain" | "problem";

const RE_DOMAIN = /\(\s*define\s*\(\s*domain\b/i;
const RE_PROBLEM = /\(\s*define\s*\(\s*problem\b/i;

// Strip comment noise so detection isn't tripped up by inline notes.
function stripLineComments(s: string) {
  return s.replace(/;[^\n\r]*/g, "");
}

// Ensure the snippet is syntactically closed before trusting the detection.
function isBalanced(s: string) {
  let bal = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") bal++;
    else if (s[i] === ")") {
      bal--;
      if (bal < 0) return false;
    }
  }
  return bal === 0;
}

// Treat stray text after the final form as natural language fallback.
function hasTextAfterFinalForm(raw: string) {
  const t = stripLineComments(raw);
  let bal = 0;
  let lastComplete = -1;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === "(") bal++;
    else if (ch === ")") {
      bal = Math.max(0, bal - 1);
      if (bal === 0) lastComplete = i;
    }
  }
  if (lastComplete < 0) return false;
  return /\S/.test(t.slice(lastComplete + 1));
}

export function useTwoModeAutoDetect(opts: {
  kind: BoxKind;
  text: string;
  value: TwoMode;
  onAuto: (m: TwoMode) => void;         // called when detection wants to change mode
  manualPriorityMs?: number;            // default 1200ms
}) {
  const { kind, text, value, onAuto, manualPriorityMs = 1200 } = opts;
  const lastManualAt = useRef(0);

  const setManual = useCallback((m: TwoMode) => {
    lastManualAt.current = Date.now();
    onAuto(m);
  }, [onAuto]);

  useEffect(() => {
    const since = Date.now() - lastManualAt.current;
    if (since <= manualPriorityMs) return; // honor recent manual choice

    const raw = text || "";
    const clean = stripLineComments(raw).trimStart();

    // Any stray text after a complete top-level form should keep the editor in AI mode.
    if (hasTextAfterFinalForm(raw)) {
      if (value !== "AI") onAuto("AI");
      return;
    }

    const balanced = isBalanced(clean);
    if (kind === "domain") {
      const desired: TwoMode = balanced && RE_DOMAIN.test(clean) ? "D" : "AI";
      if (desired !== value) onAuto(desired);
    } else {
      const desired: TwoMode = balanced && RE_PROBLEM.test(clean) ? "P" : "AI";
      if (desired !== value) onAuto(desired);
    }
  }, [kind, text, value, onAuto, manualPriorityMs]);

  return { setManual };
}
