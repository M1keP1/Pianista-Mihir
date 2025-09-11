// src/components/PillButton.tsx
import React from "react";
import { Link, type LinkProps } from "react-router-dom";

type Action =
  | { to: LinkProps["to"]; href?: never; onClick?: never; external?: never }
  | { href: string; external?: boolean; to?: never; onClick?: never }
  | { onClick: React.MouseEventHandler<HTMLButtonElement>; to?: never; href?: never; external?: never };

export type PillButtonProps = Action & {
  label: string;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  ariaLabel?: string;
};

export default function PillButton(props: PillButtonProps) {
  const { label, disabled, leftIcon, rightIcon, ariaLabel } = props;

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    fontFamily: "monospace",
    fontSize: "0.9rem",
    fontWeight: 500,
    padding: "6px 16px",
    borderRadius: "8px",
    background: "var(--color-surface)", // theme-based background
    color: "var(--color-text)",         // theme text
    border: "1px solid var(--color-border-muted)",
    boxShadow: "0 1px 4px var(--color-shadow)",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    pointerEvents: disabled ? "none" : "auto",
    transition: "transform 150ms ease, background-color 150ms ease, box-shadow 150ms ease",
  };

  const hoverStyle: React.CSSProperties = {
    transform: "scale(1.05)", // enlarge slightly on hover
    background: "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface) 88%)",
    boxShadow: "0 3px 10px var(--color-shadow)",
  };

  const [isHover, setHover] = React.useState(false);

  const style = { ...baseStyle, ...(isHover ? hoverStyle : {}) };

  const content = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
      {leftIcon && <span>{leftIcon}</span>}
      <span>{label}</span>
      {rightIcon && <span>{rightIcon}</span>}
    </span>
  );

  const commonProps = {
    style,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onMouseDown: press,
    onMouseUp: unpress,
  };

  if ("to" in props && props.to) {
    return (
      <Link to={props.to} aria-label={ariaLabel ?? label} {...commonProps}>
        {content}
      </Link>
    );
  }

  if ("href" in props && props.href) {
    const rel = props.external ? "noopener noreferrer" : undefined;
    const target = props.external ? "_blank" : undefined;
    return (
      <a href={props.href} target={target} rel={rel} aria-label={ariaLabel ?? label} {...commonProps}>
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      {...commonProps}
      onClick={props.onClick}
    >
      {content}
    </button>
  );
}

function press(e: React.MouseEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.transform = "scale(0.96)";
}
function unpress(e: React.MouseEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.transform = "scale(1)";
}
