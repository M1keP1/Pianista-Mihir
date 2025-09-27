// src/pages/pddl-edit.tsx
import { useSearchParams, useNavigate } from "react-router-dom";

import BrandLogo from "@/components/VS_BrandButton";
import PillButton from "@/components/PillButton";
import ModeSlider from "@/components/Inputbox/Controls/ModeSlider";
import MermaidPanel from "@/components/MermaidPanel";
import PlannerDropup from "../components/PlannerDropup";
import EditorPanel from "@/components/pddl/EditorPanel";

import Spinner from "@/components/icons/Spinner";
import Brain from "@/components/icons/Brain";
import Check from "@/components/icons/Check";
import Reload from "@/components/icons/Reload";
import ActionBar from "@/components/layout/ActionBar";

import { useTwoModeAutoDetect, type TwoMode } from "@/hooks/useTwoModeAutoDetect";
import {
  usePddlEditorState,
  type DomainEditMode,
  type ProblemEditMode,
} from "@/hooks/usePddlEditorState";
import { usePlanGeneration } from "@/hooks/usePlanGeneration";
import { useMermaidPreview, type MermaidUiMode } from "@/hooks/useMermaidPreview";

export default function PddlEditPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const jobFromUrl = params.get("job")?.trim() || "";

  /* ------------------------------- Editors -------------------------------- */
  const {
    domain,
    setDomain,
    problem,
    setProblem,
    domainRef,
    problemRef,
    domainAtEnd,
    problemAtEnd,
    updateDomainCaret,
    updateProblemCaret,
    domainMode,
    setDomainMode,
    problemMode,
    setProblemMode,
    domainStatus,
    setDomainStatus,
    domainMsg,
    setDomainMsg,
    problemStatus,
    setProblemStatus,
    problemMsg,
    setProblemMsg,
    validateDomainNow,
    validateProblemNow,
    generateDomainNow,
    generateProblemNow,
  } = usePddlEditorState();

  const plan = usePlanGeneration({
    domain,
    problem,
    setDomain,
    setProblem,
    setDomainStatus,
    setDomainMsg,
    setProblemStatus,
    setProblemMsg,
    navigate,
    jobFromUrl,
  });

  const { planPhase, genLabel, planId, selectedPlanner, setSelectedPlanner, handleGeneratePlan, handleRegenerate } =
    plan;

  /* ------------------------- Auto-detect AI/D/P modes ---------------------- */
  useTwoModeAutoDetect({
    kind: "domain",
    text: domain,
    value: domainMode as TwoMode,
    onAuto: (m) => {
      if (!domainAtEnd) return; // only flip if caret is at end
      setDomainMode((m === "P" ? "AI" : m) as DomainEditMode);
    },
    manualPriorityMs: 1200,
  });
  useTwoModeAutoDetect({
    kind: "problem",
    text: problem,
    value: problemMode as TwoMode,
    onAuto: (m) => {
      if (!problemAtEnd) return; // only flip if caret is at end
      setProblemMode((m === "D" ? "AI" : m) as ProblemEditMode);
    },
    manualPriorityMs: 1200,
  });

  /* ----------------------------- Readiness flags --------------------------- */
  const {
    isMermaidOpen,
    openMermaid,
    closeMermaid,
    mermaidText,
    mermaidStatus,
    mermaidUiMode,
    setMermaidUiMode,
    canConvertMermaid,
    onMermaidTextChange,
    fetchMermaid,
  } = useMermaidPreview({ domain, problem });

  const canGenerate = !!domain.trim() && !!problem.trim();

  /* --------------------------------- UI ----------------------------------- */

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
        paddingBottom: "96px",
      }}
    >
      <BrandLogo />

      <ActionBar>
        {/* View toggle button */}
        {isMermaidOpen ? (
          <PillButton
            onClick={closeMermaid}
            label="PDDL View"
            ariaLabel="Close Mermaid and return to PDDL editors"
          />
        ) : (
          <PillButton
            onClick={openMermaid}
            label="Mermaid View"
            ariaLabel="Open Mermaid diagram"
            disabled={!canConvertMermaid}
          />
        )}

        <PlannerDropup
          value={selectedPlanner}
          onChange={setSelectedPlanner}
        />

        {/* Generate (uses your original glow-pulse while busy) */}
        {planPhase === "success" ? (
          <PillButton
            to={`/plan?job=${encodeURIComponent(planId)}`}
            label=" See Plan  "
            rightIcon={<Check />}
            ariaLabel="See generated plan"
          />
        ) : (
          <div
            className={planPhase === "submitting" || planPhase === "polling" ? "glow-pulse" : ""}
            style={{ display: "inline-flex", borderRadius: 10 }}
          >
            <PillButton
              onClick={handleGeneratePlan}
              label={
                planPhase === "submitting" || planPhase === "polling"
                  ? genLabel
                  : "Generate Plan"
              }
              rightIcon={
                planPhase === "submitting" ? <Spinner /> :
                planPhase === "polling" ? <Brain /> :
                undefined
              }
              disabled={!canGenerate || planPhase === "submitting" || planPhase === "polling"}
              ariaLabel="Generate plan from current PDDL"
            />
          </div>
        )}
        {/* Reset button — now to the RIGHT of Generate; reserved width prevents shifting */}
        <div className="reset-slot">
          {planPhase === "success" && (
            <PillButton
              onClick={handleRegenerate}
              iconOnly
              rightIcon={<Reload className="icon-accent"/>}
              ariaLabel="Clear Plan"
              style={{
                  width: 30,
                  height: 30,
              }}
            />
          )}
        </div>
      </ActionBar>



      {/* Glow CSS for plan button cluster */}
      <style>
        {`
          @keyframes glowPulse {
            0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.28); }
            50%  { box-shadow: 0 0 0 6px rgba(99,102,241,0.14); }
            100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.28); }
          }
          .glow-pulse {
            border-radius: 10px;
            animation: glowPulse 1.4s ease-in-out infinite;
          }
        `}
      </style>

      {/* Content */}
      <div style={{ display: "grid", gap: "1rem", width: "min(1160px, 92vw)" }}>
        {/* Mermaid panel */}
        {isMermaidOpen && (
          <MermaidPanel
            mermaidText={mermaidText}
            visible={isMermaidOpen}
            height="50vh"
            status={mermaidStatus}
            statusHint={
              mermaidStatus === "error"
                ? "Mermaid conversion failed."
                : mermaidStatus === "verified"
                ? "Diagram is up to date."
                : mermaidStatus === "ai-thinking"
                ? "Converting…"
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

        {/* Editors row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
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
              onSubmit: () => (domainMode === "AI" ? generateDomainNow(domain) : validateDomainNow(domain)),
              placeholder: domainMode === "AI" ? "Describe the domain in natural language…" : "(define (domain ...))",
              height: isMermaidOpen ? "16vh" : "55vh",
              autoResize: false,
              showStatusPill: true,
              status: domainStatus,
              statusPillPlacement: "top-right",
              statusHint: domainMsg || undefined,
              spellCheck: domainMode === "AI",
              onKeyDown: () => updateDomainCaret(),
              statusIcons:
                domainMode === "AI"
                  ? {
                      verification: <span className="status-icon"><Spinner /></span>,
                      aiThinking: <span className="status-icon"><Brain /></span>,
                    }
                  : undefined,
            }}
            hint="Hint: Type to enhance/correct.."
          />

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
              height: isMermaidOpen ? "16vh" : "55vh",
              autoResize: false,
              showStatusPill: true,
              status: problemStatus,
              statusPillPlacement: "top-right",
              statusHint: problemMsg || undefined,
              spellCheck: problemMode === "AI",
              onKeyDown: () => updateProblemCaret(),
              statusIcons:
                problemMode === "AI"
                  ? {
                      verification: <span className="status-icon"><Brain /></span>,
                      aiThinking: <span className="status-icon"><Brain /></span>,
                    }
                  : undefined,
            }}
            hint="Hint: PDDL Syntax gets autocorrected with AI..."
          />
        </div>

        {/* Spacer so content never hides behind the fixed footer/actions */}
        <div aria-hidden style={{ height: 56 }} />
      </div>
    </main>
  );
}
