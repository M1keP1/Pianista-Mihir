/** Primary PDDL workspace combining editors, planners, and Mermaid previews. */
import { useNavigate, useSearchParams } from "react-router-dom";

import PillButton from "@/shared/components/PillButton";
import ModeSlider from "@/shared/components/Inputbox/Controls/ModeSlider";
import MermaidPanel from "@/features/pddl/components/MermaidPanel";
import PlannerDropup from "@/features/pddl/components/PlannerDropup";
import EditorPanel from "@/features/pddl/components/EditorPanel";

import Spinner from "@/shared/components/icons/Spinner";
import Brain from "@/shared/components/icons/Brain";
import Check from "@/shared/components/icons/Check";
import Reload from "@/shared/components/icons/Reload";
import ActionBar from "@/shared/components/layout/ActionBar";

import { useTwoModeAutoDetect, type TwoMode } from "@/features/pddl/hooks/useTwoModeAutoDetect";
import {
  usePddlEditorState,
  type DomainEditMode,
  type ProblemEditMode,
} from "@/features/pddl/hooks/usePddlEditorState";
import { usePlanGeneration } from "@/features/pddl/hooks/usePlanGeneration";
import { useMermaidPreview, type MermaidUiMode } from "@/features/pddl/hooks/useMermaidPreview";

export default function PddlEditPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const jobFromUrl = params.get("job")?.trim() || "";

  const {
    domain, setDomain, problem, setProblem,
    domainRef, problemRef, domainAtEnd, problemAtEnd,
    updateDomainCaret, updateProblemCaret,
    domainMode, setDomainMode, problemMode, setProblemMode,
    domainStatus, setDomainStatus, domainMsg, setDomainMsg,
    problemStatus, setProblemStatus, problemMsg, setProblemMsg,
    validateDomainNow, validateProblemNow, generateDomainNow, generateProblemNow,
  } = usePddlEditorState();

  const {
    planPhase, genLabel, planId,
    selectedPlanner, setSelectedPlanner,
    handleGeneratePlan, handleRegenerate
  } = usePlanGeneration({
    domain, problem, setDomain, setProblem,
    setDomainStatus, setDomainMsg, setProblemStatus, setProblemMsg,
    navigate, jobFromUrl,
  });

  const {
    isMermaidOpen, openMermaid, closeMermaid,
    mermaidText, mermaidStatus, mermaidUiMode, setMermaidUiMode,
    canConvertMermaid, onMermaidTextChange, fetchMermaid,
  } = useMermaidPreview({ domain, problem });

  const canGenerate = !!domain.trim() && !!problem.trim();
  const canRegenerate = planPhase === "success";

  /* ----------------------------- Layout tokens ---------------------------- */
  const BAR_H = 52;
  const SAFE_BOTTOM = 10;
  const PAGE_PT = 16;
  const CONTENT_GAP = 16;
  const FOOTER_RESERVE = BAR_H + SAFE_BOTTOM + 14;
  const contentMaxWidth = "min(1400px, 96vw)";
  const MERMAID_FRACTION = 0.62;

  /* ------------------------- Auto-detect modes ---------------------------- */
  useTwoModeAutoDetect({
    kind: "domain", text: domain, value: domainMode as TwoMode,
    onAuto: (m) => { if (domainAtEnd) setDomainMode((m === "P" ? "AI" : m) as DomainEditMode); },
    manualPriorityMs: 1200,
  });
  useTwoModeAutoDetect({
    kind: "problem", text: problem, value: problemMode as TwoMode,
    onAuto: (m) => { if (problemAtEnd) setProblemMode((m === "D" ? "AI" : m) as ProblemEditMode); },
    manualPriorityMs: 1200,
  });

  return (
    <main
      role="main"
      aria-label="PDDL edit"
      style={{
        position: "relative",
        minHeight: "100vh",
        overflowY: "auto",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        padding: `${PAGE_PT}px 12px ${FOOTER_RESERVE}px`,
        ["--contentH" as any]: `calc(100vh - ${PAGE_PT}px - ${FOOTER_RESERVE}px)`,
      }}
    >
      {/* Fixed action bar keeps primary actions reachable during long edits. */}
      <ActionBar
      className="frosted-card"
        style={{
          position: "fixed",
          left: "50%",
          bottom: `calc(env(safe-area-inset-bottom) + ${SAFE_BOTTOM}px)`,
          transform: "translateX(-50%)",
          zIndex: 70,
          width: "max-content",
          maxWidth: "96vw",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "6px 10px",
          height: `${BAR_H}px`,
        }}
        laneStyle={{
          display: "inline-flex",
          gap: "0.5rem",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          backgroundColor: "transparent",
          border: "none",
          boxShadow: "none",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
        }}
      >
        <PillButton to="/chat" label="New Chat" ariaLabel="Back to Chat" leftIcon={<span aria-hidden>←</span>} />

        {isMermaidOpen ? (
          <PillButton onClick={closeMermaid} label="PDDL View" ariaLabel="Close Mermaid and return to PDDL editors" />
        ) : (
          <PillButton onClick={openMermaid} label="Mermaid View" ariaLabel="Open Mermaid diagram" disabled={!canConvertMermaid} />
        )}

        <PlannerDropup value={selectedPlanner} onChange={setSelectedPlanner} />

        {planPhase === "success" ? (
          <PillButton to={`/plan?job=${encodeURIComponent(planId)}`} label="See Plan" rightIcon={<Check />} ariaLabel="See generated plan" />
        ) : (
          <div className={planPhase === "submitting" || planPhase === "polling" ? "glow-pulse" : ""} style={{ display: "inline-flex", borderRadius: 10 }}>
            <PillButton
              onClick={handleGeneratePlan}
              label={planPhase === "submitting" || planPhase === "polling" ? genLabel : "Generate Plan"}
              rightIcon={planPhase === "submitting" ? <Spinner /> : planPhase === "polling" ? <Brain /> : undefined}
              disabled={!canGenerate || planPhase === "submitting" || planPhase === "polling"}
              ariaLabel="Generate plan from current PDDL"
            />
          </div>
        )}

        <PillButton
          onClick={canRegenerate ? handleRegenerate : undefined}
          iconOnly
          rightIcon={<Reload className="icon-accent" />}
          ariaLabel="Clear Plan"
          disabled={!canRegenerate}
          aria-disabled={!canRegenerate}
          style={{
            width: 30, height: 30,
            opacity: canRegenerate ? 1 : 0.45,
            filter: canRegenerate ? undefined : "grayscale(55%)",
            cursor: canRegenerate ? "pointer" : "not-allowed",
            transition: "opacity 120ms ease",
            flex: "0 0 auto",
          }}
        />
      </ActionBar>

      <style>{`
        @keyframes glowPulse {
          0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.28); }
          50% { box-shadow: 0 0 0 6px rgba(99,102,241,0.14); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.28); }
        }
        .glow-pulse { animation: glowPulse 1.4s ease-in-out infinite; }

        .content-rail {
          width: ${contentMaxWidth};
          margin-inline: auto;
          display: grid;
          gap: ${CONTENT_GAP}px;
        }

        /* Normal PDDL view: vertically center when there's room, stretch to use space */
        .center-when-room {
          min-height: var(--contentH);
          display: grid;
          align-content: center;
          justify-content: stretch;
        }

        /* Grid for editors - ensure they take full height */
        .pddl-editors-grid {
          display: grid;
          grid-template-columns: minmax(0,1fr) minmax(0,1fr);
          gap: 16px;
          height: 100%; /* KEY: Make grid take full height */
        }
        @media (max-width: 1020px) {
          .pddl-editors-grid { 
            grid-template-columns: minmax(0,1fr);
            height: auto; /* On mobile, let it size naturally */
          }
        }

        /* Panel discipline - ensure panels stretch to full height */
        .panel-shell { 
          display: flex; 
          flex-direction: column; 
          min-height: 0;
          height: 100%; /* KEY: Make panel take full height */
        }
        .panel-body  { 
          flex: 1 1 auto; 
          min-height: 0; 
          overflow: hidden; 
          display: flex; /* KEY: Make body a flex container */
          flex-direction: column; /* KEY: Stack children vertically */
        }
        .panel-scroll{ 
          height: 100%; 
          min-height: 0; 
          overflow: auto;
          flex: 1; /* KEY: Make scroll area take remaining space */
          display: flex;
          flex-direction: column;
        }
        
        /* Ensure EditorPanel content takes full height */
        .panel-scroll section {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        /* Make the textarea wrapper in EditorPanel expand */
        .panel-scroll section > div:last-child {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        /* Ensure textarea container takes remaining space */
        .panel-scroll section > div:last-child > div:first-child {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        /* PDDL-only view sizing */
        .editors-closed {
          height: min(85vh, var(--contentH)); /* KEY: Give substantial height */
          min-height: 600px; /* KEY: Minimum height for usability */
          display: grid;
        }
        .editors-closed .panel-shell {
          height: 100%;
        }

        /* Mermaid-open sizing rules */
        .mermaid-open .editors-wrap {
          max-height: var(--edsH);
          overflow: hidden;
        }
        .mermaid-open .panel-shell {
          height: calc(var(--edsH));
        }

        @media (max-width: 1020px) {
          .mermaid-open .editors-wrap {
            max-height: none;
            overflow: visible;
          }
          .mermaid-open .panel-shell {
            height: auto;
          }
          .editors-closed {
            min-height: 500px; /* Smaller min-height on mobile */
          }
        }
      `}</style>

      {/* CONTENT */}
      <div
        className={`content-rail ${isMermaidOpen ? "mermaid-open" : "center-when-room"}`}
        style={{
          ["--merH" as any]: `calc(var(--contentH) * ${MERMAID_FRACTION})`,
          ["--edsH" as any]: `calc(var(--contentH) * ${1 - MERMAID_FRACTION})`,
        }}
      >
        {isMermaidOpen && (
          <MermaidPanel
            mermaidText={mermaidText}
            visible
            height={`clamp(320px, var(--merH), 78vh)`}
            status={mermaidStatus}
            statusHint={
              mermaidStatus === "error" ? "Mermaid conversion failed."
              : mermaidStatus === "verified" ? "Diagram is up to date."
              : mermaidStatus === "ai-thinking" ? "Converting…"
              : undefined
            }
            busy={mermaidStatus === "ai-thinking" || mermaidStatus === "verification"}
            editable
            onTextChange={onMermaidTextChange}
            onRetry={() => fetchMermaid(true)}
            rightHeader={
              <ModeSlider<MermaidUiMode>
                value={mermaidUiMode}
                onChange={(k) => setMermaidUiMode(k)}
                modes={[
                  { key: "D+P", short: "D+P", full: "Domain + Problem" },
                  { key: "D", short: "D", full: "Domain" },
                  { key: "P", short: "P", full: "Problem" },
                ]}
                size="xs"
                aria-label="Mermaid conversion mode"
              />
            }
          />
        )}

        {/* EDITORS */}
        <div 
          className={`editors-wrap ${!isMermaidOpen ? "editors-closed" : ""}`}
        >
          <div className="pddl-editors-grid">
            {/* DOMAIN */}
            <div className="panel-shell">
              <div className="panel-body">
                <div className="panel-scroll">
                  <EditorPanel<DomainEditMode>
                    title="Domain"
                    accentColor="var(--color-accent)"
                    modeSliderProps={{
                      value: domainMode,
                      onChange: setDomainMode,
                      modes: [
                        { key: "AI", short: "AI", full: "Generate / Validate with AI" },
                        { key: "D", short: "D", full: "Write PDDL Domain" },
                      ],
                      size: "xs",
                      "aria-label": "Domain editor mode",
                    }}
                    textareaRef={domainRef}
                    textareaProps={{
                      value: domain,
                      onChange: (v) => {
                        setDomain(v);
                        setDomainStatus("idle");
                        setDomainMsg("");
                        requestAnimationFrame(() => updateDomainCaret());
                      },
                      onSubmit: () =>
                        domainMode === "AI" ? generateDomainNow(domain) : validateDomainNow(domain),
                      placeholder:
                        domainMode === "AI" ? "Describe the domain in natural language…" : "(define (domain ...))",
                      height: "100%",
                      autoResize: false,
                      showStatusPill: true,
                      status: domainStatus,
                      statusPillPlacement: "top-right",
                      statusHint: domainMsg || undefined,
                      spellCheck: domainMode === "AI",
                      onKeyDown: () => updateDomainCaret(),
                    }}
                    hint="Hint: Type to enhance/correct.."
                  />
                </div>
              </div>
            </div>

            {/* PROBLEM */}
            <div className="panel-shell">
              <div className="panel-body">
                <div className="panel-scroll">
                  <EditorPanel<ProblemEditMode>
                    title="Problem"
                    accentColor="color-mix(in srgb, var(--color-accent) 70%, #16a34a)"
                    modeSliderProps={{
                      value: problemMode,
                      onChange: setProblemMode,
                      modes: [
                        { key: "AI", short: "AI", full: "Generate / Validate with AI" },
                        { key: "P", short: "P", full: "Write PDDL Problem" },
                      ],
                      size: "xs",
                      "aria-label": "Problem editor mode",
                    }}
                    textareaRef={problemRef}
                    textareaProps={{
                      value: problem,
                      onChange: (v) => {
                        setProblem(v);
                        setProblemStatus("idle");
                        setProblemMsg("");
                        requestAnimationFrame(() => updateProblemCaret());
                      },
                      onSubmit: () =>
                        problemMode === "AI"
                          ? generateProblemNow(problem, domain)
                          : validateProblemNow(problem, domain),
                      placeholder:
                        problemMode === "AI"
                          ? "Describe the goal in natural language…"
                          : "(define (problem ...) (:domain ...))",
                      height: "100%",
                      autoResize: false,
                      showStatusPill: true,
                      status: problemStatus,
                      statusPillPlacement: "top-right",
                      statusHint: problemMsg || undefined,
                      spellCheck: problemMode === "AI",
                      onKeyDown: () => updateProblemCaret(),
                    }}
                    hint="Hint: PDDL Syntax gets autocorrected with AI..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}