// ThemeSwitcherFab.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme, type ThemeName } from "../themeContext";

/** Available themes (no 'starry' yet) */
const THEME_OPTIONS: { id: ThemeName; label: string; hint: string }[] = [
  { id: "classic", label: "Classic", hint: "Sleek dark" },
  { id: "light",   label: "Light",   hint: "Bright & clean" },
];

/** UI tokens */
const PILL_SIZE = 36;
const PILL_RIGHT = "1.5rem";
const PILL_BOTTOM = "0.7rem";
const MENU_GAP = 8;

/** High-contrast palette icon as a data URI (works everywhere) */
const PALETTE_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
       <path d="M12 3a9 9 0 0 0 0 18h2.25A2.75 2.75 0 0 0 17 18.25c0-.69-.28-1.36-.77-1.85l-.08-.07a1.75 1.75 0 0 1 1.23-2.99H18a6 6 0 1 0 0-12h-6Z"
         fill="#FFFFFF" stroke="#111111" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
       <circle cx="8" cy="9" r="1.25" fill="#111111"/>
       <circle cx="16" cy="9" r="1.25" fill="#111111"/>
       <circle cx="14" cy="13" r="1.25" fill="#111111"/>
       <circle cx="8" cy="15" r="1.25" fill="#111111"/>
     </svg>`
  );

/** Accessible floating action button */
const FabButton: React.FC<{
  open: boolean;
  onToggle: () => void;
  btnRef: React.RefObject<HTMLButtonElement>;
}> = ({ open, onToggle, btnRef }) => (
  <button
    ref={btnRef}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label="Theme switcher"
    onClick={onToggle}
    style={{
      position: "fixed",
      right: PILL_RIGHT,
      bottom: PILL_BOTTOM,
      width: PILL_SIZE,
      height: PILL_SIZE,
      borderRadius: 9999,
      border: "1px solid var(--color-border-muted)",
      background: "var(--color-surface)",
      boxShadow: "0 4px 12px var(--color-shadow)",
      cursor: "pointer",
      zIndex: 100,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "transform .15s ease, box-shadow .2s ease",
      backdropFilter: "blur(6px)",
      outline: "none",
      WebkitTapHighlightColor: "transparent",
    }}
    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
  >
    <img
      src={PALETTE_ICON}
      width={20}
      height={20}
      alt="" // decorative
      aria-hidden="true"
      draggable={false}
      style={{ display: "block", userSelect: "none" }}
    />
  </button>
);

/** Menu item for a theme option */
const ThemeItem: React.FC<{
  id: ThemeName;
  label: string;
  hint: string;
  active: boolean;
  onSelect: (id: ThemeName) => void;
}> = ({ id, label, hint, active, onSelect }) => (
  <button
    role="menuitemradio"
    aria-checked={active}
    onClick={() => onSelect(id)}
    style={{
      width: "100%",
      display: "block",
      padding: ".65rem .75rem",
      borderRadius: 10,
      border: active
        ? "1px solid color-mix(in srgb, var(--color-accent) 55%, transparent)"
        : "1px solid transparent",
      background: active
        ? "color-mix(in srgb, var(--color-accent) 22%, transparent)"
        : "transparent",
      color: "inherit",
      cursor: "pointer",
      fontFamily: "monospace",
      transition: "background .15s ease, border-color .15s ease, transform .05s ease",
      outline: "none",
      margin: ".25rem 0",
      textAlign: "center",
      position: "relative",
    }}
    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
  >
    <div style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: 0.2 }}>{label}</div>
    <div style={{ fontSize: ".85rem", opacity: 0.75, marginTop: 2 }}>{hint}</div>
    {active && (
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: "0.85rem",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "1rem",
          opacity: 0.9,
        }}
      >
        ✓
      </span>
    )}
  </button>
);

/** The floating theme switcher + menu */
const ThemeMenu: React.FC<{
  open: boolean;
  menuRef: React.RefObject<HTMLDivElement>;
  active: ThemeName;
  onSelect: (id: ThemeName) => void;
}> = ({ open, menuRef, active, onSelect }) => (
  <div
    ref={menuRef}
    role="menu"
    aria-label="Choose theme"
    style={{
      position: "fixed",
      right: PILL_RIGHT,
      bottom: `calc(${PILL_BOTTOM} + ${PILL_SIZE}px + ${MENU_GAP}px)`,
      minWidth: 260,
      background: "var(--color-surface)",
      color: "var(--color-text)",
      border: "1px solid color-mix(in srgb, var(--color-accent) 35%, var(--color-border-muted))",
      borderRadius: 12,
      boxShadow: "0 14px 42px var(--color-shadow)",
      padding: "0.5rem",
      zIndex: 101,
      opacity: open ? 1 : 0,
      transform: open ? "translateY(0) scale(1)" : "translateY(8px) scale(0.98)",
      transformOrigin: "bottom right",
      transition: "opacity 140ms ease, transform 180ms cubic-bezier(.2,.8,.2,1)",
      pointerEvents: open ? "auto" : "none",
      backdropFilter: "blur(10px)",
      outline: "none",
      textAlign: "center",
    }}
  >
    <div style={{ fontFamily: "monospace", fontSize: ".8rem", opacity: 0.9, padding: ".25rem .5rem .35rem" }}>
      Theme
    </div>
    {THEME_OPTIONS.map((t) => (
      <ThemeItem
        key={t.id}
        id={t.id}
        label={t.label}
        hint={t.hint}
        active={active === t.id}
        onSelect={onSelect}
      />
    ))}
  </div>
);

/** Public component */
const ThemeSwitcherFab: React.FC = () => {
  const { name, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null!);
  const btnRef = useRef<HTMLButtonElement>(null) as React.RefObject<HTMLButtonElement>;

  // Close on outside click / ESC
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const toggle = () => setOpen((v) => !v);
  const selectTheme = (t: ThemeName) => setTheme(t, true); // keep menu open after choose

  // Memoize to avoid re-renders for static UI
  const fab = useMemo(() => <FabButton open={open} onToggle={toggle} btnRef={btnRef} />, [open]);
  const menu = useMemo(
    () => <ThemeMenu open={open} menuRef={menuRef} active={name} onSelect={selectTheme} />,
    [open, name]
  );

  return (
    <>
      {fab}
      {menu}
    </>
  );
};

export default ThemeSwitcherFab;
