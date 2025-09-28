import React, { useEffect, useMemo, useRef, useState } from "react";
import Textarea, { type TextAreaStatus } from "@/shared/components/Inputbox/TextArea";
import ModeSlider from "@/shared/components/Inputbox/Controls/ModeSlider";
import StatusPill from "@/shared/components/Inputbox/StatusPill";
import mermaid from "mermaid";

/** Type derived from the runtime mermaid.initialize signature */
type MermaidConfig = Parameters<(typeof mermaid)["initialize"]>[0];

export type MermaidPanelProps = {
  mermaidText: string;
  visible?: boolean;
  height?: string | number;
  className?: string;

  /** Drives overlay + glow */
  status?: TextAreaStatus;
  busy?: boolean;

  /** Right header slot (e.g. D/P/D+P ModeSlider) */
  rightHeader?: React.ReactNode;

  /** Raw/MM view control (optional) */
  view?: "text" | "graph";
  onViewChange?: (v: "text" | "graph") => void;

  /** Raw text editing */
  editable?: boolean;
  onTextChange?: (next: string) => void;

  /** Let the panel offer a Retry action (e.g., re-hit your endpoint) */
  onRetry?: () => void;

  /** THEME + GRAPH TUNING */
  colorMode?: "auto" | "light" | "dark";
  direction?: "TB" | "LR" | "BT" | "RL";
  curve?: "linear" | "basis" | "monotoneX" | "natural" | "cardinal";
  nodeSpacing?: number;
  rankSpacing?: number;
  fontFamily?: string;
  fontSize?: number;
  themeCSS?: string;
  sourceTransform?: (src: string) => string;

  statusHint?: string;
};

export default function MermaidPanel({
  mermaidText,
  visible = true,
  height = "50vh",
  className = "",
  status = "idle",
  busy = false,
  rightHeader,
  view,
  onViewChange,
  editable = true,
  onTextChange,
  onRetry,

  colorMode = "auto",
  direction = "TB",
  curve = "basis",
  nodeSpacing = 44,
  rankSpacing = 52,
  fontFamily,
  fontSize = 14,
  themeCSS = "",
  sourceTransform,
  statusHint,
}: MermaidPanelProps) {
  // Default to MM (graph)
  const [localView, setLocalView] = useState<"text" | "graph">("graph");
  const isControlled = typeof view !== "undefined";
  const currentView = isControlled ? view! : localView;
  const setView = (v: "text" | "graph") => {
    if (!isControlled) setLocalView(v);
    onViewChange?.(v);
  };

  /* ---------------------- Pull concrete colors from theme ---------------------- */
  const palette = useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    const val = (name: string, fallback: string) => (css.getPropertyValue(name).trim() || fallback);
    const bg = val("--color-bg", "#0b0b0c");
    const surface = val("--color-surface", "#111114");
    const text = val("--color-text", "#f3f3f5");
    const border = val("--color-border-muted", "#2a2a2e");
    const accent = val("--color-accent", "#6366f1");
    const success = val("--color-success", "#16a34a");
    const ff =
      fontFamily ||
      val("--font-sans", "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial");
    const prefersDark =
      colorMode === "dark" ||
      (colorMode === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
    return { prefersDark, bg, surface, text, border, accent, success, fontFamily: ff, fontSize: fontSize ?? 14 };
  }, [colorMode, fontFamily, fontSize]);

  /* ----------------------- Mermaid init (colors + graph) ---------------------- */
  const mmConfig: MermaidConfig = useMemo(() => {
    const tv = {
      background: palette.surface,
      primaryColor: palette.accent,
      primaryTextColor: palette.text,
      primaryBorderColor: palette.accent,
      lineColor: palette.border,
      fontFamily: palette.fontFamily,
      fontSize: `${palette.fontSize}px`,
      textColor: palette.text,
      tertiaryColor: palette.bg,
      clusterBkg: palette.surface,
      clusterBorder: palette.border,
      nodeBorder: palette.border,
      edgeLabelBackground: palette.surface,
      noteBkgColor: palette.surface,
      noteTextColor: palette.text, 
      labelBackground: palette.surface,
      secondaryColor: palette.border,
      outsideFillColor: palette.bg,
      cScale0: palette.accent,
      cScale1: palette.success,
    } as Record<string, string>;

    const styleBlock = themeCSS?.trim()
      ? themeCSS
      : `
        .label { font-weight: 600; letter-spacing: .2px; }
        .edgeLabel { padding: 2px 6px; border-radius: 6px; }
        .node rect, .node circle, .node polygon { rx: 8px; }
        .cluster rect { rx: 10px; }
        .marker-arrowheadPath { fill: ${palette.border}; stroke: ${palette.border}; }
      `;

    return {
      startOnLoad: false,
      securityLevel: "strict",
      theme: palette.prefersDark ? "dark" : "neutral",
      themeVariables: tv,
      themeCSS: styleBlock,
      fontFamily: palette.fontFamily,
      fontSize: palette.fontSize,
      flowchart: {
        htmlLabels: true,
        diagramPadding: 8,
        padding: 8,
        useMaxWidth: true,
        curve,
        nodeSpacing,
        rankSpacing,
      },
      er: { useMaxWidth: true },
      sequence: { mirrorActors: false, actorMargin: 36 },
    } as MermaidConfig;
  }, [palette, curve, nodeSpacing, rankSpacing, themeCSS]);

  const resolvedHeight = useMemo(
    () => (typeof height === "number" ? `${height}px` : height),
    [height],
  );

  return (
    <section
      style={{
        display: visible ? "flex" : "none",
        flexDirection: "column",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border-muted)",
        borderRadius: 12,
        padding: 0,
        boxShadow: "0 1.5px 10px var(--color-shadow)",
        overflow: "hidden",
        height: resolvedHeight,
      }}
      className={className}
      aria-busy={busy || status === "ai-thinking"}
      data-busy-glow={busy || status === "ai-thinking" ? "true" : "false"}
    >
      {/* Header: Raw/MM on left; D/P/D+P on right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          borderBottom: "1px solid var(--color-border-muted)",
          background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-bg))",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ModeSlider<"Raw" | "MM">
            value={currentView === "graph" ? "MM" : "Raw"}
            onChange={(k) => setView(k === "MM" ? "graph" : "text")}
            modes={[
              { key: "Raw", short: "Raw", full: "Raw Mermaid text" },
              { key: "MM", short: "MM", full: "Mermaid graph" },
            ]}
            size="xs"
            aria-label="Mermaid view"
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{rightHeader}</div>
      </div>

      {/* Body */}
      <div
        style={{
          position: "relative",
          padding: 10,
          overflow: "hidden",
          display: "flex",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Top-right status (still visible in MM) */}
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 6 }}>
          <StatusPill state={status} hint={statusHint}/>
        </div>

        {currentView === "text" ? (
          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            <Textarea
              value={mermaidText}
              onChange={(v) => onTextChange?.(v)}
              onSubmit={() => {}}
              placeholder="flowchart LR; A-->B"
              height="100%"
              autoResize={false}
              showStatusPill={false}
              status={status}
              statusPillPlacement="top-right"
              spellCheck={false}
              readOnly={!editable || busy}
            />
          </div>
        ) : (
          <MermaidGraph
            mermaidText={mermaidText}
            init={mmConfig}
            direction={direction}
            transform={sourceTransform}
            dim={busy}
            onRetry={onRetry}
          />
        )}

        {(busy || status === "ai-thinking") && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "color-mix(in srgb, var(--color-bg) 50%, transparent)",
              backdropFilter: "blur(1px)",
              pointerEvents: "auto",
              zIndex: 5,
            }}
          />
        )}
      </div>
    </section>
  );
}

/* ----------------------------- Mermaid renderer ---------------------------- */

function MermaidGraph({
  mermaidText,
  init,
  direction = "TB",
  transform,
  dim = false,
  onRetry,
}: {
  mermaidText: string;
  init: MermaidConfig;
  direction?: "TB" | "LR" | "BT" | "RL";
  transform?: (src: string) => string;
  dim?: boolean;
  onRetry?: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    try {
      mermaid.initialize(init);
    } catch {
      /* ignore init errors; parse/render will surface issues */
    }

    const base = sanitizeMermaidSource(mermaidText || "");
    const withHeader = ensureOneDirective(base, direction);
    const src = transform ? transform(withHeader) : withHeader;

    const render = async () => {
      if (!ref.current) return;
      ref.current.innerHTML = "";
      setError("");

      // Pre-parse for clearer errors (Mermaid v11)
      try {
        (mermaid as any).parse?.(src);
      } catch (e: any) {
        if (!cancelled) setError((e?.str || e?.message || "Syntax error in Mermaid text.").trim());
        return;
      }

      try {
        const id = `mmd-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, src);
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svg;
        const svgEl = ref.current.querySelector("svg");
        if (svgEl) {
          (svgEl as SVGElement).style.width = "100%";
          (svgEl as SVGElement).style.height = "auto";
          (svgEl as SVGElement).style.opacity = dim ? "0.4" : "1";
          (svgEl as SVGElement).style.transition = "opacity 160ms ease";
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Render failed.");
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [mermaidText, init, direction, transform, dim]);

  return (
    <div
      data-themed-scroll
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        overflow: "auto",
        background: "var(--color-surface)",
        border: "1px dashed color-mix(in srgb, var(--color-border-muted) 60%, transparent)",
        borderRadius: 8,
      }}
    >
      <div ref={ref} style={{ minHeight: "100%", padding: 8 }} />

      {/* Minimal, anchored error toast with optional Retry */}
      {error && (
        <div
          role="alert"
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            maxWidth: "80%",
            padding: "8px 10px",
            borderRadius: 8,
            background: "color-mix(in srgb, #ef4444 12%, var(--color-surface))",
            border: "1px solid color-mix(in srgb, #ef4444 40%, var(--color-border-muted))",
            color: "var(--color-text)",
            fontSize: 12,
            boxShadow: "0 6px 24px rgba(0,0,0,.25)",
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ opacity: 0.9 }}>Mermaid error:</span>
          <code style={{ whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", maxWidth: 420 }}>
            {truncate(error, 200)}
          </code>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                marginLeft: 6,
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid var(--color-border-muted)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Utilities -------------------------------- */

function sanitizeMermaidSource(src: string) {
  let s = src ?? "";
  s = s.replace(/^\uFEFF/, "");                 // strip BOM
  s = s.replace(/^\s*```(?:mermaid)?\s*/i, ""); // strip leading ``` or ```mermaid
  s = s.replace(/\s*```$/, "");                 // strip trailing ```
  s = s.replace(/\r\n/g, "\n");                 // normalize newlines
  return s;
}

// Keep the first diagram directive; drop extras. If none, prepend a flowchart header.
function ensureOneDirective(src: string, direction: "TB" | "LR" | "BT" | "RL") {
  const lines = src.split(/\r?\n/);
  const isDirective = (l: string) =>
    /^\s*(?:graph|flowchart|sequenceDiagram|classDiagram|erDiagram|stateDiagram(?:-v2)?|gantt)\b/i.test(l);

  let seen = false;
  const out = lines.filter((l) => {
    if (isDirective(l)) {
      if (seen) return false; // drop duplicates
      seen = true;
      return true;
    }
    return true;
  });

  if (!seen) out.unshift(`flowchart ${direction}`);
  return out.join("\n");
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "… " : s;
}
