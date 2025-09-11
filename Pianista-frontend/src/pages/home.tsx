// Home.tsx
import React from "react";
import { useTheme } from "../themeContext";
import PillButton from "../components/PillButton"; // ← adjust path if your file lives elsewhere

// Swap to your actual asset paths
import logoLightBg from "../assets/pianista_logo_black.png";
import logoDarkBg  from "../assets/pianista_logo_white.png";
import BrandLogo from "@/components/VS_BrandButton";

// Optional: set your real URL here
const LEARN_MORE_URL = "https://visionspace.com/our-services/product-pianista/";

const Home: React.FC = () => {
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
        <BrandLogo/>
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
            // a bit bigger than before
            width: "clamp(260px, 52vw, 520px)",
            height: "auto",
            display: "block",
            userSelect: "none",
            filter: "drop-shadow(0 4px 16px var(--color-shadow))",
          }}
        />

        {/* Learn more pill button (external link) */}
        <PillButton
          label="Learn more"
          href={LEARN_MORE_URL}
          external
          variant="primary"   
          size="md"
        />
      </div>
    </main>
  );
};

export default Home;
