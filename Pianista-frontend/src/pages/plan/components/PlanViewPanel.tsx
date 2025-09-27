import type { CSSProperties, ReactNode } from "react";

interface PlanViewPanelProps {
  children: ReactNode;
  /**
   * When true, the child region becomes scrollable while preserving the flex
   * layout so content like textareas can expand.
   */
  scrollable?: boolean;
}

const shellStyle: CSSProperties = {
  height: "70vh",
  minHeight: 520,
  border: "1px solid var(--color-border-muted)",
  borderRadius: 10,
  background: "var(--color-surface)",
  boxShadow: "0 1px 4px var(--color-shadow) inset",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const baseInnerStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
};

const scrollableInnerStyle: CSSProperties = {
  ...baseInnerStyle,
  overflow: "auto",
};

export function PlanViewPanel({ children, scrollable }: PlanViewPanelProps) {
  return (
    <div style={shellStyle}>
      <div style={scrollable ? scrollableInnerStyle : baseInnerStyle}>{children}</div>
    </div>
  );
}

export default PlanViewPanel;
