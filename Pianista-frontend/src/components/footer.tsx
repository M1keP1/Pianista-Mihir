// src/components/PianistaFooter.tsx
import React from "react";
import { useTheme } from "../themeContext";

const PianistaFooter: React.FC = () => {
  useTheme(); // ensures data-theme gets applied

  return (
    <footer 
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        textAlign: "center",
        fontSize: "12px",
        fontFamily: "monospace",
        paddingBottom: "8px",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <div 
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "4px 16px",
          borderRadius: "8px",
          border: "1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
          background: "color-mix(in srgb, var(--color-bg) 20%, transparent)",
          backdropFilter: "blur(6px)",
          boxShadow: "0 2px 12px var(--color-shadow)",
          color: "var(--color-text-secondary)",
          pointerEvents: "auto",
        }}
      >
        <span>© 2025</span>
        <span style={{ color: "var(--color-text)"}}>
          VisionSpace™
        </span>
        <span>· All rights reserved</span>
      </div>
    </footer>
  );
};

export default PianistaFooter;