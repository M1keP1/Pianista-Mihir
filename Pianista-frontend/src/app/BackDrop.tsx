/**
 * Provides a persistent background layer so theme transitions happen behind
 * the routed pages without flashing the browser default color.
 */
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
