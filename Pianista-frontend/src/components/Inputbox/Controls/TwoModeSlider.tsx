// src/components/Inputbox/Controls/TwoModeSlider.tsx
import React, { useEffect, useMemo, useState } from "react";

export type TwoMode = "AI" | "D" | "P";
export type BoxKind = "domain" | "problem";

/* ----------------------------- Robust detectors ---------------------------- */

// Strip PDDL line comments: everything after ';' to end-of-line
function stripLineComments(s: string) {
  return s.replace(/;[^\n\r]*/g, "");
}

// Balanced parens check (after comment strip)
function isBalanced(s: string) {
  let bal = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") bal++;
    else if (ch === ")") {
      bal--;
      if (bal < 0) return false;
    }
  }
  return bal === 0;
}

// After the last *balanced* closing paren, is there any non-whitespace?
function hasTextAfterFinalForm(s: string) {
  const t = stripLineComments(s);
  let bal = 0;
  let lastComplete = -1;

  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === "(") bal++;
    else if (ch === ")") {
      bal = Math.max(0, bal - 1);
      if (bal === 0) lastComplete = i; // end of a top-level form
    }
  }
  if (lastComplete < 0) return false;
  return /\S/.test(t.slice(lastComplete + 1));
}

const RE_DOMAIN = /\(\s*define\s*\(\s*domain\b/i;
const RE_PROBLEM = /\(\s*define\s*\(\s*problem\b/i;

/* --------------------------------- Slider ---------------------------------- */

export default function TwoModeSlider({
  kind,              // "domain" | "problem"
  text,              // textarea value to auto-detect from
  value,             // controlled value: "AI" | "D" | "P"
  onChange,
  size = "xs",
  manualPriorityMs = 1200,
  style,
}: {
  kind: BoxKind;
  text: string;
  value: TwoMode;
  onChange: (m: TwoMode) => void;
  size?: "xs" | "sm" | "md" | "lg";
  manualPriorityMs?: number;
  style?: React.CSSProperties;
}) {
  // Allowed pair depends on box kind
  const labels = kind === "domain" ? (["AI", "D"] as const) : (["AI", "P"] as const);

  // Track last manual click to temporarily suppress auto-detect
  const [lastManualAt, setLastManualAt] = useState<number>(0);
  const setManual = (m: TwoMode) => {
    setLastManualAt(Date.now());
    onChange(m);
  };

  /* ------------------------------- Auto-detect ------------------------------ */
  useEffect(() => {
    const since = Date.now() - lastManualAt;
    if (since <= manualPriorityMs) return; // honor manual selection window

    const raw = text || "";
    const trailingNL = hasTextAfterFinalForm(raw);
    const clean = stripLineComments(raw).trimStart();

    // If user typed anything after a complete PDDL form -> AI
    if (trailingNL) {
      if (value !== "AI") onChange("AI");
      return;
    }

    // Only consider D/P when parens are balanced and header matches
    const balanced = isBalanced(clean);

    if (kind === "domain") {
      const desired: TwoMode = balanced && RE_DOMAIN.test(clean) ? "D" : "AI";
      if (desired !== value) onChange(desired);
    } else {
      const desired: TwoMode = balanced && RE_PROBLEM.test(clean) ? "P" : "AI";
      if (desired !== value) onChange(desired);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, kind, manualPriorityMs, lastManualAt]);

  /* -------------------------------- Visuals -------------------------------- */
  const dims = useMemo(() => {
    switch (size) {
      case "lg": return { h: 40, r: 12, fs: 13, pad: 6, seg: 48, gap: 8, insetX: 2, insetY: 1 };
      case "md": return { h: 36, r: 11, fs: 12, pad: 5, seg: 44, gap: 8, insetX: 2, insetY: 1 };
      case "sm": return { h: 32, r: 10, fs: 11, pad: 4, seg: 40, gap: 8, insetX: 2, insetY: 1 };
      default:   return { h: 28, r:  9, fs: 10, pad: 3, seg: 36, gap: 8, insetX: 2, insetY: 1 };
    }
  }, [size]);

  const idx = value === labels[1] ? 1 : 0;
  const pillLeft = dims.pad + idx * (dims.seg + dims.gap) + dims.insetX;
  const pillWidth = Math.max(0, dims.seg - dims.insetX * 2);

  const wrap: React.CSSProperties = {
    position: "relative",
    display: "inline-grid",
    gridTemplateColumns: `repeat(2, ${dims.seg}px)`,
    alignItems: "center",
    height: dims.h,
    borderRadius: dims.r,
    padding: dims.pad,
    gap: dims.gap,
    background: "var(--color-surface)",
    border: "1px solid var(--color-border-muted)",
    boxShadow: "0 1px 3px var(--color-shadow) inset",
    fontFamily: "var(--font-sans)",
    ...style,
  };

  return (
    <div role="radiogroup" aria-label={`${kind} mode`} style={wrap}>
      {/* Highlight track */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          zIndex: 0,
          left: pillLeft,
          width: pillWidth,
          top: dims.pad + dims.insetY,
          bottom: dims.pad + dims.insetY,
          background: "color-mix(in srgb, var(--color-accent) 18%, var(--color-surface) 82%)",
          border: "1px solid color-mix(in srgb, var(--color-accent) 30%, var(--color-border-muted))",
          borderRadius: dims.r - 2,
          boxShadow: "0 1px 6px var(--color-shadow)",
          transition: "left 140ms ease",
          pointerEvents: "none",
        }}
      />

      {labels.map((lab, i) => {
        const selected = i === idx;
        const full = lab === "D" ? "Domain" : lab === "P" ? "Problem" : "AI";
        return (
          <button
            key={lab}
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            title={full}
            aria-label={full}
            onClick={() => setManual(lab)}
            style={{
              position: "relative",
              zIndex: 2,
              height: "100%",
              width: dims.seg,
              padding: 0,
              borderRadius: dims.r - 3,
              border: "none",
              background: "transparent",
              color: selected ? "var(--color-text)" : "var(--color-text-secondary)",
              fontSize: dims.fs,
              fontWeight: 700,
              letterSpacing: 0.2,
              cursor: "pointer",
              userSelect: "none",
              transition: "color 100ms ease, transform 100ms ease",
              outline: "none",
              transform: selected ? "translateZ(0) scale(1.02)" : undefined,
            }}
          >
            {lab}
          </button>
        );
      })}
    </div>
  );
}
