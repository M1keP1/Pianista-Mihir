// src/components/Inputbox/SendButton.tsx
import React from "react";

export type SendButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  title?: string;
  size?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
  iconOnly?: boolean;
  variant?: "minimal" | "primary"; // default minimal
};

const SIZES = {
  sm: { h: 32, px: 10, fs: 13, r: 8 },
  md: { h: 36, px: 12, fs: 14, r: 10 },
  lg: { h: 40, px: 14, fs: 15, r: 12 },
};

export default function SendButton({
  onClick,
  disabled,
  ariaLabel = "Send",
  title = "Send (Enter). Shift+Enter for newline",
  size = "md",
  style,
  iconOnly = false,
  variant = "minimal",
}: SendButtonProps) {
  const d = SIZES[size];
  const [hover, setHover] = React.useState(false);

  const minimalBase: React.CSSProperties = {
    background: "var(--color-surface)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border-muted)",
    boxShadow: "0 1px 4px var(--color-shadow)",
  };
  const minimalHover: React.CSSProperties = {
    background: "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface) 88%)",
    transform: "translateZ(0) scale(1.03)",
    boxShadow: "0 3px 10px var(--color-shadow)",
  };

  const primaryBase: React.CSSProperties = {
    background: "var(--color-accent)",
    color: "#fff",
    border: "1px solid color-mix(in srgb, var(--color-accent) 35%, var(--color-border-muted))",
    boxShadow: "0 3px 14px 0 color-mix(in srgb, var(--color-accent) 28%, var(--color-shadow))",
  };
  const primaryHover: React.CSSProperties = {
    background: "color-mix(in srgb, var(--color-accent) 90%, white 10%)",
    transform: "translateZ(0) scale(1.04)",
    boxShadow: "0 4px 18px 0 color-mix(in srgb, var(--color-accent) 34%, var(--color-shadow))",
  };

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: d.h,
    padding: `0 ${iconOnly ? 8 : d.px}px`,
    borderRadius: d.r,
    fontFamily: "var(--font-sans)",
    fontSize: d.fs,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    pointerEvents: disabled ? "none" : "auto",
    transition: "transform 120ms ease, background-color 120ms ease, box-shadow 120ms ease",
    userSelect: "none",
    opacity: disabled ? 0.6 : 1,
    ...(variant === "primary" ? primaryBase : minimalBase),
  };

  const hoverStyle: React.CSSProperties =
    hover && !disabled ? (variant === "primary" ? primaryHover : minimalHover) : {};

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...hoverStyle, ...style }}
    >
      <SendIcon />
      {!iconOnly && <span style={{ lineHeight: 1 }}>Send</span>}
    </button>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" style={{ display: "block" }}>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}
