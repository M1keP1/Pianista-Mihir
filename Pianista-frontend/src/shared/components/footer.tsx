// src/components/PianistaFooter.tsx
import React from "react";
import { useTheme } from "@/app/providers/ThemeProvider";
import { pingPlanner } from "@/api/pianista/health";

type UiStatus = "checking" | "ok" | "down";

type PianistaFooterProps = {
  variant?: "floating" | "inline";
  className?: string;
};

function cx(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(" ");
}

const PianistaFooter: React.FC<PianistaFooterProps> = ({ variant = "floating", className }) => {
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
    check(); // initial ping
    const id = setInterval(check, 1000000000); // ping every 60s
    return () => clearInterval(id);
  }, [check]);

  const color =
    ui === "ok"
      ? "var(--color-success, #16a34a)"
      : ui === "down"
      ? "var(--color-danger, #dc2626)"
      : "var(--color-warning, #f59e0b)";

  const a11yLabel = ui === "ok" ? "Online" : ui === "down" ? "Offline" : "Checking";

  return (
    <footer
      className={cx(
        "pianista-footer",
        variant === "floating" ? "pianista-footer--floating" : "pianista-footer--inline",
        className,
      )}
    >
      <div className="footer-chip pianista-footer__inner">
        <span>© 2025</span>
        <span style={{ color: "var(--color-text)" }}>VisionSpace™</span>
        <span>· All rights reserved</span>
        <span aria-hidden>·</span>

        <div className="footer-status-chip">
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
            <span style={{ color: "var(--color-text)" }}>API</span>

            <div className="pianista-footer__tooltip" role="status" aria-live="polite">
              <div style={{ marginBottom: 4, opacity: 0.9 }}>
                {hint || "Planner gateway reachable."}
              </div>
              <div style={{ opacity: 0.6 }}>
                Last checked: {new Date(lastTs).toLocaleTimeString()}
              </div>
            </div>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default PianistaFooter;
