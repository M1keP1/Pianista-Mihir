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
        d="M8 13V4M8 4L5 7M8 4l3 3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
