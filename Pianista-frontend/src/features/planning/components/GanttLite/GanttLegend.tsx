import React from "react";

type Props = {
  boxed: boolean;
  actionColors: Map<string, string>;
  timeUnit: string;
  maxDuration: number;
};

const baseStyle: React.CSSProperties = {
  padding: "8px 12px",
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  alignItems: "center",
  color: "var(--color-text)",
  flexShrink: 0,
};

const boxedStyle: React.CSSProperties = {
  borderTop: "1px solid var(--color-border-muted)",
  background: "var(--color-surface-bridge)",
};

const unboxedStyle: React.CSSProperties = {
  borderTop: "none",
  background: "transparent",
};

export const GanttLegend: React.FC<Props> = ({ boxed, actionColors, timeUnit, maxDuration }) => (
  <div style={{ ...baseStyle, ...(boxed ? boxedStyle : unboxedStyle) }}>
    {Array.from(actionColors.entries()).map(([action, color]) => (
      <div key={action} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
        <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
        <span style={{ opacity: 0.9, fontWeight: 700 }}>{action}</span>
      </div>
    ))}
    <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.75 }}>
      unit: <strong>{timeUnit}</strong> · duration: <strong>{Math.ceil(maxDuration)}</strong>
    </div>
  </div>
);

export default GanttLegend;
