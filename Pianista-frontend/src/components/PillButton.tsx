// src/components/PillButton.tsx
import * as React from "react";
import { Link } from "react-router-dom";

export type PillButtonProps = {
  /** Visible text label (omit when iconOnly = true) */
  label?: string;
  /** Accessible label (required when iconOnly = true) */
  ariaLabel?: string;
  to?: string;
  /** Optional icons */
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;

  /** Render as a compact circular icon-only pill */
  iconOnly?: boolean;

  /** Disabled state */
  disabled?: boolean;

  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;

  /** Link rendering (when provided, renders an <a>) */
  href?: string;
  target?: string;
  rel?: string;

  /** Button type (when rendering a <button>) */
  type?: "button" | "submit" | "reset";

  /** Style overrides */
  className?: string;
  style?: React.CSSProperties;
};

/**
 * PillButton
 * - Opaque/outlined surface using theme tokens
 * - Smooth hover/active transitions
 * - `iconOnly` for compact circular icon buttons (ideal for "Send")
 */
export default function PillButton({
  label,
  ariaLabel,
  leftIcon,
  rightIcon,
  iconOnly = false,
  disabled = false,
  onClick,
  href,
  to,
  target,
  rel,
  type = "button",
  className,
  style,
}: PillButtonProps) {
  const [isHover, setHover] = React.useState(false);
  const [isActive, setActive] = React.useState(false);

  // Accessibility guard: ensure an aria-label exists for icon-only usage
  const computedAriaLabel =
    iconOnly ? ariaLabel ?? label ?? "Button" : ariaLabel;

  // Base visual styles
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: iconOnly ? 0 : 8,
    fontFamily: "var(--font-sans, system-ui, sans-serif)",
    fontSize: iconOnly ? 14 : 14,
    fontWeight: 600,
    lineHeight: 1,
    padding: iconOnly ? 0 : "6px 16px",
    width: iconOnly ? 36 : undefined,
    height: iconOnly ? 36 : undefined,
    borderRadius: iconOnly ? 999 : 10,
    background: "var(--color-surface)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border-muted)",
    boxShadow: "0 1px 4px var(--color-shadow)",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    pointerEvents: disabled ? "none" : "auto",
    userSelect: "none",
    transition:
      "transform 120ms ease, background-color 150ms ease, box-shadow 150ms ease, opacity 150ms ease",
    // Nice focus ring without default outline
    outline: "none",
  };

  // Hover & active effects
  const hoverStyle: React.CSSProperties = isHover
    ? {
        background:
          "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface) 88%)",
        boxShadow: "0 3px 10px var(--color-shadow)",
        transform: "translateZ(0) scale(1.04)",
      }
    : {};

  const activeStyle: React.CSSProperties = isActive
    ? {
        transform: "scale(0.97)",
      }
    : {};

  const mergedStyle: React.CSSProperties = {
    ...baseStyle,
    ...hoverStyle,
    ...activeStyle,
    ...(style ?? {}),
  };

  const content = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: iconOnly ? 0 : 8,
      }}
    >
      {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
      {!iconOnly && !!label && <span>{label}</span>}
      {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
    </span>
  );

  const commonHandlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === " " || e.key === "Enter") setActive(true);
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === " " || e.key === "Enter") setActive(false);
    },
  };
  if (to) {
    return (
      <Link
        to={to}
        aria-label={computedAriaLabel}
        onClick={onClick as any}
        className={className}
        style={mergedStyle}
        {...commonHandlers}
      >
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        role="button"
        aria-label={computedAriaLabel}
        href={href}
        target={target}
        rel={rel}
        onClick={onClick as any}
        className={className}
        style={mergedStyle}
        {...commonHandlers}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      aria-label={computedAriaLabel}
      disabled={disabled}
      onClick={onClick as any}
      className={className}
      style={mergedStyle}
      {...commonHandlers}
    >
      {content}
    </button>
  );
}
