import React from "react";
import { useTheme } from "@/app/providers/ThemeProvider";

import PillButton from "@/shared/components/PillButton";
import BrandLogo from "@/shared/components/VS_BrandButton";

import logoLightBg from "@/assets/pianista_logo_black.png";
import logoDarkBg from "@/assets/pianista_logo_white.png";

const HomePage: React.FC = () => {
  const { name } = useTheme();
  const src = name === "light" ? logoLightBg : logoDarkBg;

  return (
    <main
      role="main"
      aria-label="Pianista"
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        zIndex: 5,
        padding: "1rem",
      }}
    >
      <BrandLogo />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
          transform: "translateY(-8vh)",
        }}
      >
        <img
          src={src}
          alt="Pianista logo"
          draggable={false}
          loading="eager"
          decoding="async"
          style={{
            width: "clamp(260px, 52vw, 520px)",
            height: "auto",
            display: "block",
            userSelect: "none",
            filter: "drop-shadow(0 4px 16px var(--color-shadow))",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <PillButton label="Get Started" to="/chat" ariaLabel="Go to chat" />
          <PillButton
            label="?"
            href="https://visionspace.com/our-services/product-pianista/"
            ariaLabel="Learn more about Pianista"
          />
        </div>
      </div>
    </main>
  );
};

export default HomePage;
