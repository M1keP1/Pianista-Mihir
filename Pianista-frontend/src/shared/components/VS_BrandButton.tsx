/** VisionSpace logo button that routes contextually instead of always linking out. */
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@/app/providers/ThemeProvider";

// Theme-specific assets keep contrast correct across palettes.
import logoDark from "@/assets/VS_logo_white.svg";
import logoLight from "@/assets/VS_logo_black.png";

type Props = {
  size?: number; // height in px (defaults to 90)
  style?: React.CSSProperties;
  className?: string;
};

const BrandLogo: React.FC<Props> = ({ size = 90, style, className }) => {
  const { name } = useTheme();
  const src = name === "light" ? logoLight : logoDark;
  const [hover, setHover] = useState(false);

  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    // On focused tools, send users back to chat instead of opening a new tab.
    if (pathname.startsWith("/pddl-edit") || pathname.startsWith("/minizinc")) {
      e.preventDefault();
      navigate("/chat");
      return;
    }
    if (pathname.startsWith("/chat")) {
      e.preventDefault();
      navigate("/");
      return;
    }
    // Otherwise take them to the public VisionSpace site.
    window.open("https://visionspace.com/", "_blank", "noopener,noreferrer");
  };

  const baseStyle: React.CSSProperties = {
    height: `${size}px`,
    width: "auto",
    display: "block",
    transition: "transform 160ms ease, filter 160ms ease",
    willChange: "transform",
    userSelect: "none",
  };

  const hoverStyle: React.CSSProperties = {
    transform: "scale(1.05)",
    filter: "drop-shadow(0 0 12px var(--color-accent))",
  };

  return (
    <button
      onClick={handleClick}
      aria-label={pathname.startsWith("/pddl-edit") ? "Back to Chat" : "Open VisionSpace website"}
      className={className}
      style={{
        position: "absolute",
        top: "12px",
        left: "16px",
        zIndex: 20,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        pointerEvents: "auto",
        ...style,
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
    </button>
  );
};

export default BrandLogo;
