// src/components/PianistaFooter.tsx
import React from "react";
import { useTheme } from "../themeContext";
import { pingPlanner } from "@/api/pianista/health";

type UiStatus = "checking" | "ok" | "down";

const PianistaFooter: React.FC = () => {
  useTheme(); // ensures data-theme gets applied

  const [ui, setUi] = React.useState<UiStatus>("checking");
  const [hint, setHint] = React.useState<string>("");
  const [lastTs, setLastTs] = React.useState<number>(Date.now());

  const check = React.useCallback(async () => {
    setUi("checking");
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await pingPlanner(ctrl.signal);
      setUi(res.status === "ok" ? "ok" : "down");
      setHint(res.message ?? "");
    } catch (e: any) {
      setUi("down");
      setHint(e?.message || "Network error.");
    } finally {
      clearTimeout(to);
      setLastTs(Date.now());
    }
  }, []);

  React.useEffect(() => {
    check();                   // initial ping
    const id = setInterval(check, 60000); // ping every 60s
    return () => clearInterval(id);
  }, [check]);

  const color =
    ui === "ok"
      ? "var(--color-success, #16a34a)"
      : ui === "down"
      ? "var(--color-danger, #dc2626)"
      : "var(--color-warning, #f59e0b)";

  // (used only for a11y)
  const a11yLabel =
    ui === "ok" ? "Online" : ui === "down" ? "Offline" : "Checking";

  return (
    <footer
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        textAlign: "center",
        fontSize: "12px",
        fontFamily: "monospace",
        paddingBottom: "8px",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          padding: "4px 16px",
          borderRadius: "8px",
          border:
            "1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
          background:
            "color-mix(in srgb, var(--color-bg) 20%, transparent)",
          backdropFilter: "blur(6px)",
          boxShadow: "0 2px 12px var(--color-shadow)",
          color: "var(--color-text-secondary)",
          pointerEvents: "auto",
        }}
      >
        <span>© 2025</span>
        <span style={{ color: "var(--color-text)" }}>VisionSpace™</span>
        <span>· All rights reserved</span>

        {/* spacer dot before chip */}
        <span aria-hidden>·</span>

        {/* API status chip (right-aligned end of row) */}
        <div
          className="footer-status-chip"
          style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
        >
          <button
            onClick={check}
            title="Click to recheck API status"
            aria-label={`Planner API status: ${a11yLabel}`}
            style={{
              all: "unset",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 6,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: color,
                boxShadow:
                  ui === "checking"
                    ? `0 0 0 2px color-mix(in srgb, ${color} 30%, transparent)`
                    : "none",
              }}
            />
            {/* keep only the short label */}
            <span style={{ color: "var(--color-text)" }}>API</span>

            {/* Hover hint (tooltip) */}
            <div
              className="footer-status-tooltip"
              role="status"
              aria-live="polite"
              style={{
                position: "absolute",
                right: 0,
                bottom: "140%",
                minWidth: 260,
                maxWidth: 360,
                padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${color}`,
                background: "var(--color-surface)",
                color: "var(--color-text)",
                boxShadow: "0 4px 16px var(--color-shadow)",
                fontFamily: "monospace",
                fontSize: "11px",
                lineHeight: 1.35,
                pointerEvents: "none",
                opacity: 0,
                visibility: "hidden",
                transition: "opacity 120ms ease",
              }}
            >
              <div style={{ marginBottom: 4, opacity: 0.9 }}>
                {hint || "Planner gateway reachable."}
              </div>
              <div style={{ opacity: 0.6 }}>
                Last checked: {new Date(lastTs).toLocaleTimeString()}
              </div>
            </div>
          </button>
        </div>

        {/* tooltip hover CSS */}
        <style>
          {`
            .footer-status-chip:hover .footer-status-tooltip {
              opacity: 1;
              visibility: visible;
            }
          `}
        </style>
      </div>
    </footer>
  );
};

export default PianistaFooter;
