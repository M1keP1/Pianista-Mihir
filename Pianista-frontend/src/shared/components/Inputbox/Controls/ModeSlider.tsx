/**
 * Keyboard-friendly segmented control for picking processing modes without
 * sacrificing the app's compact layout.
 */
import React, { useMemo } from "react";

/** Legacy union (kept for back-compat default) */
export type ProcessingMode = "AI" | "Domain" | "Domain+Problem" | "Mermaid";

export type ModeItem<T extends string = string> = {
  key: T;
  short?: string;
  full?: string;
};

export type ModeSliderProps<T extends string = ProcessingMode> = {
  value: T;
  onChange: (m: T) => void;
  modes?: ModeItem<T>[];
  size?: "xs" | "sm" | "md" | "lg";
  segmentWidth?: number;
  labels?: Partial<Record<ProcessingMode, string>>; // legacy path only
  style?: React.CSSProperties;
  "aria-label"?: string;
};

const LEGACY: ProcessingMode[] = ["AI", "Domain", "Domain+Problem", "Mermaid"];
const LEGACY_SHORT: Record<ProcessingMode, string> = {
  AI: "AI",
  Domain: "D",
  "Domain+Problem": "D+P",
  Mermaid: "MM",
};

export default function ModeSlider<T extends string = ProcessingMode>({
  value,
  onChange,
  modes,
  size = "xs",
  segmentWidth,
  labels,
  style,
  "aria-label": ariaLabel = "Processing mode",
}: ModeSliderProps<T>) {
  const items = useMemo<ModeItem<T>[]>(() => {
    if (modes && modes.length) return modes;
    // legacy fallback (typed to ProcessingMode, then cast to T because default T=ProcessingMode)
    const L = { ...LEGACY_SHORT, ...(labels || {}) };
    return LEGACY.map((k) => ({
      key: k,
      short: L[k],
      full: k === "Domain+Problem" ? "Domain + Problem" : k,
    })) as unknown as ModeItem<T>[];
  }, [modes, labels]);

  const count = items.length;
  const idx = Math.max(0, items.findIndex((i) => i.key === value));

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
    display: "inline-grid",
    gridTemplateColumns: `repeat(${count}, ${dims.seg}px)`,
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
    zIndex: 2,
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
  const selected: React.CSSProperties = { color: "var(--color-text)", transform: "translateZ(0) scale(1.02)" };

  const dividerColor = "color-mix(in srgb, var(--color-text-secondary) 45%, transparent)";
  const separators = Array.from({ length: count - 1 }, (_, k) => {
    const left = dims.pad + (k + 1) * dims.seg + k * dims.gap + dims.gap / 2;
    return (
      <div key={`sep-${k}`} aria-hidden style={{
        position: "absolute", zIndex: 1, left: left - 0.5,
        top: dims.pad + dims.sepInset, bottom: dims.pad + dims.sepInset,
        width: 1, background: dividerColor, borderRadius: 1, pointerEvents: "none",
      }}/>
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
    onChange(items[next].key);
  };

  return (
    <div role="radiogroup" aria-label={ariaLabel} style={wrap} onKeyDown={onKeyDown}>
      <div aria-hidden="true" style={track} />
      {separators}
      {items.map((it) => {
        const isSel = it.key === value;
        return (
          <button
            key={it.key}
            role="radio"
            aria-checked={isSel}
            tabIndex={isSel ? 0 : -1}
            title={it.full}
            aria-label={it.full}
            onClick={() => onChange(it.key)}
            style={{ ...btnBase, ...(isSel ? selected : null) }}
          >
            {it.short ?? it.key}
          </button>
        );
      })}
    </div>
  );
}
