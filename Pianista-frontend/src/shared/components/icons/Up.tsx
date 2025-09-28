import * as React from "react";

export default function PlannerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="0.85em"
      height="0.85em"
      aria-hidden
      {...props}
    >
      <path
        d="M5 13V3h4a3 3 0 0 1 0 6H5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
