/** Compact reload icon sized for inline controls. */
import * as React from "react";

export default function Reload({
  size = 16,
  strokeWidth = 1.8,
  className,
  style,
  title = "Reload",
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
      style={style}
    >
      <title>{title}</title>
      <path
        d="M3 12a9 9 0 1 0 3-6.708"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 4v4h4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
