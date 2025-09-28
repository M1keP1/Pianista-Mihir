// ThemeSwitcherFab.tsx
import React, { useEffect, useRef, useState } from "react";
import { useTheme, type ThemeName } from "@/app/providers/ThemeProvider";

type ThemeSwitcherVariant = "floating" | "pane";

type ThemeSwitcherProps = {
  variant?: ThemeSwitcherVariant;
  className?: string;
};

/** Available themes (no 'starry' yet) */
const THEME_OPTIONS: { id: ThemeName; label: string; hint: string }[] = [
  { id: "classic", label: "Classic", hint: "Sleek dark" },
  { id: "light",   label: "Light",   hint: "Bright & clean" },
];

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

function cx(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(" ");
}

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
    className={cx("theme-switcher__option", active && "is-active")}
    onClick={() => onSelect(id)}
  >
    <span className="theme-switcher__option-text">
      <span className="theme-switcher__option-label">{label}</span>
      <span className="theme-switcher__option-hint">{hint}</span>
    </span>
    {active && (
      <span className="theme-switcher__option-check" aria-hidden>
        ✓
      </span>
    )}
  </button>
);

/** The floating/pane theme switcher + menu */
const ThemeSwitcherFab: React.FC<ThemeSwitcherProps> = ({ variant = "floating", className }) => {
  const { name, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isFloating = variant === "floating";

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        buttonRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const toggle = () => setOpen((v) => !v);
  const selectTheme = (t: ThemeName) => {
    setTheme(t, true);
    if (!isFloating) {
      setOpen(false);
    }
  };

  return (
    <div
      className={cx(
        "theme-switcher",
        isFloating ? "theme-switcher--floating" : "theme-switcher--pane",
        open && "is-open",
        className,
      )}
      data-open={open}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Theme switcher"
        className="theme-switcher__trigger"
        onClick={toggle}
      >
        <img
          src={PALETTE_ICON}
          width={20}
          height={20}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="theme-switcher__icon"
        />
        {!isFloating && <span className="theme-switcher__trigger-label">Theme</span>}
        {!isFloating && (
          <span className="theme-switcher__chevron" aria-hidden>
            {open ? "▴" : "▾"}
          </span>
        )}
      </button>

      <div
        ref={menuRef}
        role="menu"
        aria-label="Choose theme"
        className="theme-switcher__menu"
      >
        <div className="theme-switcher__menu-heading">Theme</div>
        {THEME_OPTIONS.map((t) => (
          <ThemeItem
            key={t.id}
            id={t.id}
            label={t.label}
            hint={t.hint}
            active={name === t.id}
            onSelect={selectTheme}
          />
        ))}
      </div>
    </div>
  );
};

export default ThemeSwitcherFab;
