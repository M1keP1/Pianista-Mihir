import React, { useMemo } from "react";

export type ProcessingMode = "AI" | "Domain" | "Domain+Problem" | "Mermaid";

export type ModeSliderProps = {
  value: ProcessingMode;
  onChange: (m: ProcessingMode) => void;

  /** Sizes align with your button heights; default: "xs" (tight) */
  size?: "xs" | "sm" | "md" | "lg";

  /** Fixed width per segment (px). If omitted, uses a sensible default per size. */
  segmentWidth?: number;

  /** Optional short labels; full names are used for aria/tooltip. */
  labels?: Partial<Record<ProcessingMode, string>>;

  /** Extra inline overrides and a11y label */
  style?: React.CSSProperties;
  "aria-label"?: string;
};

const MODES: ProcessingMode[] = ["AI", "Domain", "Domain+Problem", "Mermaid"];
const DEFAULT_LABELS: Record<ProcessingMode, string> = {
  AI: "AI",
  Domain: "D",
  "Domain+Problem": "D+P",
  Mermaid: "MM",
};

export default function ModeSlider({
  value,
  onChange,
  size = "xs",
  segmentWidth,
  labels,
  style,
  "aria-label": ariaLabel = "Processing mode",
}: ModeSliderProps) {
  const count = MODES.length;
  const idx = Math.max(0, MODES.indexOf(value));
  const L = { ...DEFAULT_LABELS, ...(labels || {}) };

  // Tight dimensions + tiny pill insets to avoid touching separators
  const dims = useMemo(() => {
    switch (size) {
      case "xs": return { h: 28, r: 9,  fs: 10, pad: 3, gap: 8, seg: segmentWidth ?? 32, sepInset: 5, pillInsetX: 2.0, pillInsetY: 1.0 };
      case "sm": return { h: 32, r: 10, fs: 11, pad: 4, gap: 8, seg: segmentWidth ?? 36, sepInset: 6, pillInsetX: 2.5, pillInsetY: 1.0 };
      case "md": return { h: 36, r: 11, fs: 12, pad: 5, gap: 9, seg: segmentWidth ?? 40, sepInset: 7, pillInsetX: 3.0, pillInsetY: 1.0 };
      case "lg": return { h: 40, r: 12, fs: 13, pad: 6, gap:10, seg: segmentWidth ?? 44, sepInset: 8, pillInsetX: 3.0, pillInsetY: 1.0 };
      default:   return { h: 28, r: 9,  fs: 10, pad: 3, gap: 8, seg: segmentWidth ?? 32, sepInset: 5, pillInsetX: 2.0, pillInsetY: 1.0 };
    }
  }, [size, segmentWidth]);

  const wrap: React.CSSProperties = {
    position: "relative",
    display: "inline-grid",                                   // fit-to-content width
    gridTemplateColumns: `repeat(${count}, ${dims.seg}px)`,   // equal segment widths
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

  // Highlight pill: inset horizontally & vertically for symmetry
  const pillLeft = dims.pad + idx * (dims.seg + dims.gap) + dims.pillInsetX;
  const pillWidth = Math.max(0, dims.seg - dims.pillInsetX * 2);

  const track: React.CSSProperties = {
    position: "absolute",
    zIndex: 0,
    left: pillLeft,
    width: pillWidth,
    top:    dims.pad + dims.pillInsetY,
    bottom: dims.pad + dims.pillInsetY,
    background: "color-mix(in srgb, var(--color-accent) 18%, var(--color-surface) 82%)",
    border: "1px solid color-mix(in srgb, var(--color-accent) 30%, var(--color-border-muted))",
    borderRadius: dims.r - 2,
    boxShadow: "0 1px 6px var(--color-shadow)",
    transition: "left 140ms ease",
    pointerEvents: "none",
  };

  const btnBase: React.CSSProperties = {
    position: "relative",
    zIndex: 2, // above track & separators
    height: "100%",
    width: dims.seg,
    padding: 0,
    borderRadius: dims.r - 3,
    border: "none",
    background: "transparent",
    color: "var(--color-text-secondary)",
    fontSize: dims.fs,
    fontWeight: 700,
    letterSpacing: 0.2,
    cursor: "pointer",
    userSelect: "none",
    transition: "color 100ms ease, transform 100ms ease",
    outline: "none",
  };

  const selected: React.CSSProperties = {
    color: "var(--color-text)",
    transform: "translateZ(0) scale(1.02)",
  };

  // Short, straight vertical separators that don't touch edges
  const dividerColor = "color-mix(in srgb, var(--color-text-secondary) 45%, transparent)";
  const separators = Array.from({ length: count - 1 }, (_, k) => {
    const left = dims.pad + (k + 1) * dims.seg + k * dims.gap + dims.gap / 2;
    return (
      <div
        key={`sep-${k}`}
        aria-hidden
        style={{
          position: "absolute",
          zIndex: 1,                          // above track, below buttons
          left: left - 0.5,                   // center the 1px line
          top: dims.pad + dims.sepInset,
          bottom: dims.pad + dims.sepInset,
          width: 1,
          background: dividerColor,
          borderRadius: 1,
          pointerEvents: "none",
        }}
      />
    );
  });

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    let next = idx;
    if (e.key === "ArrowRight") next = Math.min(count - 1, idx + 1);
    else if (e.key === "ArrowLeft") next = Math.max(0, idx - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    else return;
    e.preventDefault();
    onChange(MODES[next]);
  };

  return (
    <div role="radiogroup" aria-label={ariaLabel} style={wrap} onKeyDown={onKeyDown}>
      <div aria-hidden="true" style={track} />
      {separators}
      {MODES.map((m) => {
        const isSel = m === value;
        const full = m === "Domain+Problem" ? "Domain + Problem" : m;
        return (
          <button
            key={m}
            role="radio"
            aria-checked={isSel}
            tabIndex={isSel ? 0 : -1}
            title={full}
            aria-label={full}
            onClick={() => onChange(m)}
            style={{ ...btnBase, ...(isSel ? selected : null) }}
          >
            {(labels && labels[m]) ?? DEFAULT_LABELS[m]}
          </button>
        );
      })}
    </div>
  );
}
