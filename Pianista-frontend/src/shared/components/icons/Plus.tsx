// src/shared/components/icons/Plus.tsx
import * as React from "react";

type PlusIconProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
};

export default function Plus({
  size = 16,
  strokeWidth = 1.8,
  className,
  style,
  title = "Add",
}: PlusIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title}
      className={className}
      style={style}
    >
      <title>{title}</title>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
