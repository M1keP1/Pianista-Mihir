import React from "react";
import Textarea, { type TextAreaStatus } from "@/shared/components/Inputbox/TextArea";

type MiniZincEditorCardProps = {
  title: string;
  value: string;
  onChange: (value: string) => void;
  status: TextAreaStatus;
  statusHint?: string;
  placeholder?: string;
  disabled?: boolean;
};

const cardStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto 1fr",
  height: "48vh",
  minHeight: 320,
  border: "1px solid var(--color-border-muted)",
  borderRadius: 12,
  background: "var(--color-surface)",
  boxShadow: "0 1px 4px var(--color-shadow) inset",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  borderBottom: "1px solid var(--color-border-muted)",
  fontWeight: 600,
};

const contentStyle: React.CSSProperties = {
  padding: 8,
  display: "grid",
};

export default function MiniZincEditorCard({
  title,
  value,
  onChange,
  status,
  statusHint,
  placeholder,
  disabled,
}: MiniZincEditorCardProps) {
  return (
    <section style={cardStyle}>
      <div style={headerStyle}>
        <span>{title}</span>
      </div>
      <div style={contentStyle}>
        <Textarea
          value={value}
          onChange={onChange}
          style={{ height: "100%" } as React.CSSProperties}
          autoResize={false}
          minRows={12}
          maxRows={24}
          width="100%"
          placeholder={placeholder}
          disabled={disabled}
          showStatusPill
          status={status}
          statusHint={statusHint}
        />
      </div>
    </section>
  );
}
