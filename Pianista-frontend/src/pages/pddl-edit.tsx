// src/pages/pddl-edit.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import BrandLogo from "@/components/VS_BrandButton";
import PillButton from "@/components/PillButton";
import { type TextAreaStatus } from "@/components/Inputbox/TextArea";
import ModeSlider from "@/components/Inputbox/Controls/ModeSlider";
import MermaidPanel from "@/components/MermaidPanel";
import PlannerDropup from "../components/PlannerDropup";
import EditorPanel from "@/components/pddl/EditorPanel";

import { generateMermaid, type MermaidMode } from "@/api/pianista/generateMermaid";

import Spinner from "@/components/icons/Spinner";
import Brain from "@/components/icons/Brain";
import Check from "@/components/icons/Check";
import Reload from "@/components/icons/Reload";

import { useTwoModeAutoDetect, type TwoMode } from "@/hooks/useTwoModeAutoDetect";
import {
  usePddlEditorState,
  type DomainEditMode,
  type ProblemEditMode,
} from "@/hooks/usePddlEditorState";
import { usePlanGeneration } from "@/hooks/usePlanGeneration";


type MermaidUiMode = "D+P" | "D" | "P";

/* ----------------------------- Cache utilities ----------------------------- */

function djb2(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}
function inputFor(mode: MermaidUiMode, d: string, p: string) {
  const dt = d.trim(),
    pt = p.trim();
  return mode === "D" ? dt : mode === "P" ? pt : `${dt}\n${pt}`;
}
function cacheKey(mode: MermaidUiMode, d: string, p: string) {
  return `mermaid_cache:${mode}:${djb2(inputFor(mode, d, p))}`;
}
function readMermaidCache(mode: MermaidUiMode, d: string, p: string) {
  try {
    return localStorage.getItem(cacheKey(mode, d, p)) || "";
  } catch {
    return "";
  }
}
function writeMermaidCache(mode: MermaidUiMode, d: string, p: string, mermaid: string) {
  try {
    localStorage.setItem(cacheKey(mode, d, p), mermaid);
  } catch {}
}
function persistRawMermaid(mode: MermaidUiMode, d: string, p: string, text: string) {
  writeMermaidCache(mode, d.trim(), p.trim(), text);
}

/* ---------- Fix stray labels (|...|) in Problem-only diagrams if present --- */

function fixProblemEdges(src: string) {
  let out = src;

  const ensureGoalNode = (text: string) => {
    if (/\bgoal\(\(/i.test(text)) return text; // goal((goal)) exists
    const lines = text.split(/\r?\n/);
    const problemIdx = lines.findIndex((l) => /subgraph\s+problem\b/i.test(l));
    const graphIdx = lines.findIndex((l) => /^\s*graph\b/i.test(l));
    const def = "  goal((goal))";
    if (problemIdx >= 0) lines.splice(problemIdx + 1, 0, def);
    else if (graphIdx >= 0) lines.splice(graphIdx + 1, 0, def);
    else lines.unshift(def);
    return lines.join("\n");
  };

  // Orphan at end-of-line: <lhs> <edge> |label| $
  out = out.replace(
    /^(\s*[A-Za-z][\w-]*)\s*([-=]{2,}(?:>|)?)\s*\|[^|]*\|\s*$/gm,
    (_m, lhs, edge) => `${lhs} ${edge} goal`
  );

  // Orphan before another chain on SAME line: <lhs> <edge> |label|   <next>
  out = out.replace(
    /(\s*[A-Za-z][\w-]*)\s*([-=]{2,}(?:>|)?)\s*\|[^|]*\|\s*(?=\s+[A-Za-z][\w-]*\s*(?:[-=]{2,}(?:>|)?|-->|==>))/g,
    (_m, lhs, edge) => `${lhs} ${edge} goal `
  );

  // Super-stray "pipe only" endings like "... --- |"
  out = out.replace(
    /^(\s*[A-Za-z][\w-]*)\s*([-=]{2,}(?:>|)?)\s*\|\s*$/gm,
    (_m, lhs, edge) => `${lhs} ${edge} goal`
  );

  if (/[\s-](goal)(?!\s*\(\()/i.test(out)) {
    out = ensureGoalNode(out);
  }
  return out;
}
function maybeFixMermaid(mode: MermaidUiMode, text: string) {
  return mode === "P" ? fixProblemEdges(text) : text;
}

/* -------------------------------------------------------------------------- */

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

  /* --------------------------- Mermaid container -------------------------- */
  const [showMermaid, setShowMermaid] = useState(false);
  const [mermaidText, setMermaidText] = useState("");
  const [mermaidStatus, setMermaidStatus] = useState<TextAreaStatus>("idle");
  const [mermaidUiMode, setMermaidUiMode] = useState<MermaidUiMode>("D+P");

  const mermaidAbort = useRef<AbortController | null>(null);
  const mermaidReqSeq = useRef(0);
  const lastMermaidKey = useRef<string>("");
  const mermaidAutoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      mermaidAbort.current?.abort();
      if (mermaidAutoDebounce.current) clearTimeout(mermaidAutoDebounce.current);
    };
  }, []);

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
  const canGenerate = !!domain.trim() && !!problem.trim();
  const canConvertMermaid = useMemo(() => {
    const dOk = !!domain.trim();
    const pOk = !!problem.trim();
    if (mermaidUiMode === "D") return dOk;
    if (mermaidUiMode === "P") return pOk;
    return dOk && pOk; // D+P
  }, [domain, problem, mermaidUiMode]);

  const toApiMode = (m: MermaidUiMode): MermaidMode =>
    m === "D" ? "domain" : m === "P" ? "problem" : "none";

  /* -------------------- Auto-refresh Mermaid on D/P edits ------------------- */
  useEffect(() => {
    if (!showMermaid) return;
    if (!canConvertMermaid) return;

    if (mermaidAutoDebounce.current) clearTimeout(mermaidAutoDebounce.current);
    setMermaidStatus("ai-thinking"); // triggers overlay + glow
    mermaidAutoDebounce.current = setTimeout(() => {
      fetchMermaidFor(mermaidUiMode, /* force */ true);
    }, 300);

    return () => {
      if (mermaidAutoDebounce.current) clearTimeout(mermaidAutoDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, problem, showMermaid]); // listens to D/P edits

  /* ------------------------ Cache-first on mode switch ---------------------- */
  useEffect(() => {
    const d = domain.trim();
    const p = problem.trim();
    if (!showMermaid) return;
    const needed = mermaidUiMode === "D" ? !!d : mermaidUiMode === "P" ? !!p : !!(d && p);
    if (!needed) return;

    const key = cacheKey(mermaidUiMode, d, p);

    // If already rendered this exact key, don't do anything
    if (lastMermaidKey.current === key && mermaidText) {
      setMermaidStatus("verified");
      return;
    }

    // Try cache first
    const cached = readMermaidCache(mermaidUiMode, d, p);
    if (cached) {
      setMermaidText(cached);
      setMermaidStatus("verified");
      lastMermaidKey.current = key;
      return;
    }

    // No cache -> fetch
    setMermaidStatus("ai-thinking");
    fetchMermaidFor(mermaidUiMode, /* force */ true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mermaidUiMode, showMermaid]);

  /* -------------------------- Mermaid fetch (gated) ------------------------- */

  const fetchMermaidFor = async (mode: MermaidUiMode, force = false) => {
    const d = domain.trim();
    const p = problem.trim();
    const needed = mode === "D" ? !!d : mode === "P" ? !!p : !!(d && p);
    if (!needed) return;

    const key = cacheKey(mode, d, p);

    // If this exact key already rendered and not forcing, skip
    if (!force && lastMermaidKey.current === key && mermaidText) {
      setMermaidStatus("verified");
      return;
    }

    // Cache-first unless forced
    if (!force) {
      const cached = readMermaidCache(mode, d, p);
      if (cached) {
        setMermaidText(cached);
        setMermaidStatus("verified");
        lastMermaidKey.current = key;
        return;
      }
    }

    // Abort any in-flight call
    mermaidAbort.current?.abort();
    const ctrl = new AbortController();
    mermaidAbort.current = ctrl;
    const myId = ++mermaidReqSeq.current;

    setMermaidStatus("ai-thinking");

    try {
      const res = await generateMermaid(toApiMode(mode), d, p, "", ctrl.signal);
      if (myId !== mermaidReqSeq.current) return; // stale
      if (res.result_status === "success" && res.mermaid) {
        let out = res.mermaid.trim();
        out = maybeFixMermaid(mode, out);
        setMermaidText(out);
        setMermaidStatus("verified");
        writeMermaidCache(mode, d, p, out);
        lastMermaidKey.current = key;
      } else {
        setMermaidStatus("error");
        setMermaidText(
          `%% Mermaid conversion failed${res.message ? `: ${res.message}` : ""}\nflowchart TD\n  A[Start] --> B[Check endpoint/mode/key];`
        );
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      if (myId !== mermaidReqSeq.current) return;
      setMermaidStatus("error");
      setMermaidText(`%% Network error\nflowchart TD\n  A[Start] --> B[Retry request];`);
    }
  };

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

      {/* Floating actions dock (same level as footer; not fused) */}
      <div className="actions-dock">
        <div className="control-lane">
          {/* View toggle button */}
          {showMermaid ? (
            <PillButton
              onClick={() => {
                setShowMermaid(false);
                setMermaidStatus("idle");
              }}
              label="PDDL View"
              ariaLabel="Close Mermaid and return to PDDL editors"
            />
          ) : (
            <PillButton
              onClick={() => {
                if (!canConvertMermaid) return;
                setShowMermaid(true);
                const d = domain.trim();
                const p = problem.trim();
                const needed =
                  mermaidUiMode === "D" ? !!d : mermaidUiMode === "P" ? !!p : !!(d && p);
                if (!needed) return;

                const cached = readMermaidCache(mermaidUiMode, d, p);
                if (cached) {
                  setMermaidText(cached);
                  setMermaidStatus("verified");
                  lastMermaidKey.current = cacheKey(mermaidUiMode, d, p);
                } else {
                  setMermaidStatus("ai-thinking");
                  fetchMermaidFor(mermaidUiMode, true);
                }
              }}
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
        </div>
      </div>



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
        {showMermaid && (
          <MermaidPanel
            mermaidText={mermaidText}
            visible={showMermaid}
            height="50vh"
            status={mermaidStatus}
              statusHint={
              mermaidStatus === "error" ? "Mermaid conversion failed." :
              mermaidStatus === "verified" ? "Diagram is up to date." :
              mermaidStatus === "ai-thinking" ? "Converting…" : undefined
            }
            busy={mermaidStatus === "ai-thinking" || mermaidStatus === "verification"} // translucent overlay + glow
            editable
            onTextChange={(next) => {
              setMermaidText(next);
              persistRawMermaid(mermaidUiMode, domain, problem, next); // persist raw edits
              // mark this render as the current for the same inputs
              lastMermaidKey.current = cacheKey(mermaidUiMode, domain.trim(), problem.trim());
              setMermaidStatus("verified");
            }}
            onRetry={() => fetchMermaidFor(mermaidUiMode, /* force */ true)}
            rightHeader={
              <ModeSlider<"D+P" | "D" | "P">
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
              height: showMermaid ? "16vh" : "55vh",
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
              height: showMermaid ? "16vh" : "55vh",
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
