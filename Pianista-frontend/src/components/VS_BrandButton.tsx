import React, { useState } from "react";
import { useTheme } from "../themeContext";

// Replace with your actual logo assets
import logoDark from "../assets/VS_logo_white.svg";
import logoLight from "../assets/VS_logo_black.png";

const BrandLogo: React.FC = () => {
  const { name } = useTheme();
  const src = name === "light" ? logoLight : logoDark;
  const [hover, setHover] = useState(false);

  const baseStyle: React.CSSProperties = {
    height: "90px",
    width: "auto",
    display: "block",
    userSelect: "none",
    filter: "drop-shadow(0 2px 6px var(--color-shadow))",
    transition: "transform 200ms ease, filter 200ms ease",
  };

  const hoverStyle: React.CSSProperties = {
    transform: "scale(1.05)", // enlarge a bit
    filter: "drop-shadow(0 0 12px var(--color-accent))", // glowing accent
  };

  return (
    <a
      href="https://visionspace.com/"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: "absolute",
        top: "12px",
        left: "16px",
        display: "inline-block",
        zIndex: 20,
        pointerEvents: "auto",
      }}
    >
      <img
        src={src}
        alt="VisionSpace Logo"
        style={{ ...baseStyle, ...(hover ? hoverStyle : {}) }}
        draggable={false}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      />
    </a>
  );
};

export default BrandLogo;
