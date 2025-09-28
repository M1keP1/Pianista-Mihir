/** Caret-anchored menu that surfaces slash shortcuts in the composer. */
import React from "react";
import type { Shortcut } from "@/features/chat/hooks/useShortcuts";

type Props = {
  items: Shortcut[];
  selected: number;
  onSelect: (item: Shortcut) => void;
  onCreateShortcut: () => void;
  /** Optional extra styles for the outer card (no positioning needed here). */
  style?: React.CSSProperties;
};

export default function SlashMenu({
  items,
  selected,
  onSelect,
  onCreateShortcut,
  style,
}: Props) {
  return (
    <div
      role="listbox"
      aria-label="Shortcuts"
      style={{
        // Parent wrapper handles positioning so this component stays layout-agnostic.
        width: 260,
        maxHeight: 320,
        overflowY: "auto",
        background: "var(--color-surface)",
        color: "var(--color-text)",
        border: "1px solid var(--color-border-muted)",
        borderRadius: 12,
        boxShadow: "0 10px 24px var(--color-shadow)",
        padding: 8,
        zIndex: 1000,
        ...style,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7, padding: "4px 8px" }}>
        Shortcuts
      </div>

      {items.map((it, i) => {
        const isSel = i === selected;
        return (
          <button
            key={it.id}
            role="option"
            aria-selected={isSel}
            onMouseDown={(e) => {
              // Prevent textarea blur so insertion logic can run against the live selection.
              e.preventDefault();
              onSelect(it);
            }}
            style={{
              display: "flex",
              width: "100%",
              textAlign: "left",
              alignItems: "center",
              justifyContent: "space-between",              
              background: isSel
                ? "color-mix(in srgb, var(--color-accent) 18%, var(--color-surface) 82%)"
                : "transparent",
              border: isSel
                ? "1px solid color-mix(in srgb, var(--color-accent) 30%, var(--color-border-muted))"
                : "1px solid transparent",
              color: isSel ? "var(--color-text)" : "inherit",
              transition: "background 140ms ease, border-color 140ms ease, color 140ms ease",
              padding: "10px 12px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <span>/{it.name}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        );
      })}

      <hr
        style={{
          border: 0,
          height: 1,
          background:
            "color-mix(in srgb, var(--color-text-secondary) 35%, transparent)",
          margin: "6px 8px",
        }}
      />

      <button
        onMouseDown={(e) => {
          e.preventDefault();
          onCreateShortcut();
        }}
        className="btn btn--outline btn--sm is-full"
        style={{ marginTop: 4, borderRadius: 12 }}
      >
        + Create a shortcut
      </button>
    </div>
  );
}