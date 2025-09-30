/** Drop-up planner selector that mirrors the floating theme switcher experience. */
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { getPlanners, type Planner } from "@/api/pianista/getPlanners";
import PlannerIcon from "@/shared/components/icons/Up";

/** Small, icon-only drop-up menu to pick a planner (like Theme Switcher) */
type Props = {
  value?: string;                        // controlled selected planner id
  onChange?: (plannerId: string) => void;
  disabled?: boolean;
  storageKey?: string;                   // for uncontrolled mode (default below)
  className?: string;
  style?: CSSProperties;
  title?: string;
};

const DEFAULT_STORAGE_KEY = "pddl.selectedPlanner";

// Use a monochrome gear so the icon stays legible across light and dark themes.

export default function PlannerDropup({
  value,
  onChange,
  disabled,
  storageKey = DEFAULT_STORAGE_KEY,
  className,
  style,
  title = "Choose planner",
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [planners, setPlanners] = useState<Planner[]>([]);

  // Uncontrolled selected value
  const [internal, setInternal] = useState<string>(() => {
    if (value !== undefined) return value;
    try { return localStorage.getItem(storageKey) || "auto"; } catch { return "auto"; }
  });
  const selected = value ?? internal;

  // Fetch planners once (like ThemeSwitcher menu pattern)
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const list = await getPlanners(ctrl.signal);
        if (!alive) return;
        setPlanners([{ id: "auto", name: "Auto" }, ...list]);
      } catch {
        // keep empty -> menu will still show "Auto"
        setPlanners([{ id: "auto", name: "Auto" }]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; ctrl.abort(); };
  }, []);

  // Persist when uncontrolled
  useEffect(() => {
    if (value !== undefined) return;
    try { localStorage.setItem(storageKey, internal); } catch {}
  }, [internal, value, storageKey]);

  // Close on outside click / ESC (like ThemeSwitcher)
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const currentName = useMemo(
    () => planners.find((p) => p.id === selected)?.name ?? "Auto",
    [planners, selected]
  );

  const select = (id: string) => {
    if (value === undefined) setInternal(id);
    onChange?.(id);
  };

  return (
    <div className={className} style={{ position: "relative", display: "inline-block", ...(style || {}) }}>
      {/* Transparent icon trigger (ghost/frosted like ThemeSwitcher) */}
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Planner selector"
        title={`${title}${loading ? " (loading…)" : ""}`}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || loading}
        style={{
          width: 29,
          height: 29,
          borderRadius: 9999,
          border: "1px solid var(--color-border-muted)",
          background: "var(--color-surface)",
          boxShadow: "0 4px 12px var(--color-shadow)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled || loading ? "not-allowed" : "pointer",
          backdropFilter: "blur(6px)",
          outline: "none",
          WebkitTapHighlightColor: "transparent",
          transition: "transform .15s ease, box-shadow .2s ease",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <PlannerIcon width={18} height={18} className="icon-accent" aria-hidden focusable="false" />
      </button>

      {/* Floating card (drop-up) */}
        <div
          ref={menuRef}
          role="menu"
          aria-label="Choose planner"
          className="frosted-card"
          style={{
            position: "absolute",
            right: 0,
            bottom: "calc(100% + 8px)",
            minWidth: 220,
            maxHeight: 300,
            overflowY: "auto",
            overflow: "visible",
            color: "var(--color-text)",
            padding: 8,
            zIndex: 9999,
            opacity: open ? 1 : 0,
            transform: open ? "translateY(0) scale(1)" : "translateY(8px) scale(0.98)",
            transformOrigin: "bottom right",
            transition: "opacity 140ms ease, transform 180ms cubic-bezier(.2,.8,.2,1)",
            pointerEvents: open ? "auto" : "none",
            outline: "none",
          }}
        >

        <div style={{ fontFamily: "monospace", fontSize: ".8rem", opacity: 0.9, padding: "2px 6px 6px" }}>
          Planner <span style={{ opacity: .7 }}>({currentName})</span>
        </div>

        {(planners.length ? planners : [{ id: "auto", name: "Auto" }]).map((pl) => {
          const active = selected === pl.id;
          return (
            <button
              key={pl.id}
              role="menuitemradio"
              aria-checked={active}
              onClick={() => select(pl.id)}
              style={{
                width: "100%",
                display: "block",
                textAlign: "left",
                padding: ".55rem .65rem",
                borderRadius: 10,
                border: active
                  ? "1px solid color-mix(in srgb, var(--color-accent) 55%, transparent)"
                  : "1px solid transparent",
                background: active
                  ? "color-mix(in srgb, var(--color-accent) 22%, transparent)"
                  : "transparent",
                color: 'var(--color-text)',
                cursor: "pointer",
                fontFamily: "monospace",
                fontWeight: active ? 700 : 500,
                transition: "background .15s ease, border-color .15s ease, transform .05s ease",
                margin: ".25rem 0",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {pl.name}
              {active && <span aria-hidden style={{ float: "right", opacity: .9 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
