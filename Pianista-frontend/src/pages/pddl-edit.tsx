// src/pages/pddl-edit.tsx
import { useState } from "react";
import BrandLogo from "@/components/VS_BrandButton";
import PillButton from "@/components/PillButton";
import Textarea, { type TextAreaStatus } from "@/components/Inputbox/TextArea";
import TwoModeSlider, { type TwoMode } from "@/components/Inputbox/Controls/TwoModeSlider";

export default function PddlEditPage() {
  // textarea states
  const [domain, setDomain] = useState("");
  const [problem, setProblem] = useState("");

  // per-box modes
  const [domainMode, setDomainMode] = useState<TwoMode>("AI");
  const [problemMode, setProblemMode] = useState<TwoMode>("AI");

  // pill states
  const [domainStatus, setDomainStatus] = useState<TextAreaStatus>("idle");
  const [problemStatus, setProblemStatus] = useState<TextAreaStatus>("idle");

  const submitDomain = () => {
    if (!domain.trim()) return;
    setDomainStatus("verification");
  };
  const submitProblem = () => {
    if (!problem.trim()) return;
    setProblemStatus("verification");
  };

  return (
    <main
      role="main"
      aria-label="PDDL edit"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        padding: "1rem",
      }}
    >
    {/* Top-left branding + back button */}
      <BrandLogo />
    <div
      style={{
        position: "absolute",
        bottom: "calc(1rem + 42px + 0.75rem)",
        left: "1rem",
        zIndex: 9,
      }}
>
  <PillButton to="/chat" label="<- Back to Chat" />
</div>

      {/* Centered stack */}
      <div
        style={{
          display: "grid",
          gap: "1rem",
          width: "min(1160px, 92vw)",
        }}
      >

        {/* Two columns side-by-side */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* Domain */}
          <section
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border-muted)",
              borderRadius: 12,
              padding: 14,
              boxShadow: "0 1.5px 10px var(--color-shadow)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: "var(--color-accent)",
                  }}
                />
                <strong>Domain</strong>
              </div>
              <TwoModeSlider
                kind="domain"
                text={domain}
                value={domainMode}
                onChange={(m) => setDomainMode(m === "P" ? "AI" : m)}
                size="xs"
              />
            </div>
            <Textarea
              value={domain}
              onChange={setDomain}
              onSubmit={submitDomain}
              placeholder="(define (domain ...))"
              height="55vh"
              autoResize={false}
              showStatusPill
              status={domainStatus}
              statusPillPlacement="top-right"
            />
          </section>

          {/* Problem */}
          <section
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border-muted)",
              borderRadius: 12,
              padding: 14,
              boxShadow: "0 1.5px 10px var(--color-shadow)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background:
                      "color-mix(in srgb, var(--color-accent) 70%, #16a34a)",
                  }}
                />
                <strong>Problem</strong>
              </div>
              <TwoModeSlider
                kind="problem"
                text={problem}
                value={problemMode}
                onChange={(m) => setProblemMode(m === "D" ? "AI" : m)}
                size="xs"
              />
            </div>
            <Textarea
              value={problem}
              onChange={setProblem}
              onSubmit={submitProblem}
              placeholder="(define (problem ...) (:domain ...))"
              height="55vh"
              autoResize={false}
              showStatusPill
              status={problemStatus}
              statusPillPlacement="top-right"
            />
          </section>
        </div>
      </div>
    </main>
  );
}
