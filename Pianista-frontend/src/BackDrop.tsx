// Backdrop.tsx
import React from "react";

const Backdrop: React.FC = () => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: -1, // stay behind app content
      background: "var(--color-bg)",
      transition: "background 0.4s ease",
    }}
  />
);

export default Backdrop;
