import React from "react";

const baseStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  flexShrink: 0,
};

const boxedStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--color-border-muted)",
  background: "var(--color-surface-bridge)",
};

const unboxedStyle: React.CSSProperties = {
  borderBottom: "none",
  background: "transparent",
};

type Props = {
  planner?: string;
  boxed: boolean;
  pxPerUnit: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPxPerUnitChange: (value: number) => void;
};

export const GanttHeader: React.FC<Props> = ({
  planner,
  boxed,
  pxPerUnit,
  onZoomIn,
  onZoomOut,
  onPxPerUnitChange,
}) => (
  <div style={{ ...baseStyle, ...(boxed ? boxedStyle : unboxedStyle) }}>
    <div style={{ fontSize: 14, fontWeight: 700 }}>
      Timeline {planner ? `· ${planner}` : ""}
    </div>
    <div style={{ flex: 1 }} />
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={onZoomOut} className="btn btn--surface btn--sm" aria-label="Zoom out">
        –
      </button>
      <input
        type="range"
        min={8}
        max={256}
        step={1}
        value={pxPerUnit}
        onChange={(e) => onPxPerUnitChange(Number(e.target.value))}
        style={{ width: 160, accentColor: "var(--color-accent)" }}
        aria-label="Adjust zoom"
      />
      <button onClick={onZoomIn} className="btn btn--surface btn--sm" aria-label="Zoom in">
        +
      </button>
    </div>
  </div>
);

export default GanttHeader;
