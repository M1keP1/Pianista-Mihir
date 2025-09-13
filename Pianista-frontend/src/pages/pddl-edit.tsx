// src/pages/pddl-edit.tsx
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import BrandLogo from "@/components/VS_BrandButton";
import PillButton from "@/components/PillButton";
import Textarea, { type TextAreaStatus } from "@/components/Inputbox/TextArea";
import TwoModeSlider, { type TwoMode } from "@/components/Inputbox/Controls/TwoModeSlider";

import {
  loadPddl,
  savePddl as savePddlLegacy,
  savePddlSnapshot,
  savePlanJob,
  loadPlan,
  savePlanResult, // used when plan is ready
} from "@/lib/pddlStore";

import { validatePddl } from "@/api/pianista/validatePddl";
import { validateMatchPddl } from "@/api/pianista/validateMatchPddl";
import { generateProblemFromNL } from "@/api/pianista/generateProblem";
import { generateDomainFromNL } from "@/api/pianista/generateDomain";
import { generatePlan } from "@/api/pianista/generatePlan";
import { getPlan } from "@/api/pianista/getPlan";

// Icons for action buttons
import Spinner from "@/components/icons/Spinner";
import Brain from "@/components/icons/Brain";
import Check from "@/components/icons/Check";
import Reload from "@/components/icons/Reload";

const MESSAGE_MIN_H = 40;
const DEBOUNCE_MS = 2500;

type PlanPhase = "idle" | "submitting" | "polling" | "success" | "error";

export default function PddlEditPage() {
  /* ------------------------------- Routing/URL ------------------------------- */
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const jobFromUrl = params.get("job")?.trim() || "";

  /* --------------------------------- State ---------------------------------- */
  // Text
  const [domain, setDomain] = useState("");
  const [problem, setProblem] = useState("");

  // Modes
  const [domainMode, setDomainMode] = useState<TwoMode>("AI");
  const [problemMode, setProblemMode] = useState<TwoMode>("AI");

  // Status + messages
  const [domainStatus, setDomainStatus] = useState<TextAreaStatus>("idle");
  const [problemStatus, setProblemStatus] = useState<TextAreaStatus>("idle");
  const [domainMsg, setDomainMsg] = useState("");
  const [problemMsg, setProblemMsg] = useState("");

  // Plan/job state
  const [planPhase, setPlanPhase] = useState<PlanPhase>("idle");
  const [planId, setPlanId] = useState<string>("");
  const [planErr, setPlanErr] = useState<string>("");

  // Aborters / timers / debounce refs
  const domainAbort = useRef<AbortController | null>(null);
  const problemAbort = useRef<AbortController | null>(null);
  const domainReqId = useRef(0);
  const problemReqId = useRef(0);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAbort = useRef<AbortController | null>(null);

  const domainDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const problemDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ------------------------------ Validators -------------------------------- */
  const validateDomainNow = async (text: string) => {
    const d = text.trim();
    if (!d) return;

    if (domainDebounce.current) clearTimeout(domainDebounce.current);
    domainAbort.current?.abort();
    const ctrl = new AbortController();
    domainAbort.current = ctrl;

    const myId = ++domainReqId.current;
    setDomainStatus("verification"); // spinner
    setDomainMsg("");

    try {
      const res = await validatePddl(d, "domain", ctrl.signal);
      if (myId !== domainReqId.current) return;
      setDomainStatus(res.result === "success" ? "verified" : "error");
      setDomainMsg(res.message ?? "");
    } catch (e: any) {
      if (myId !== domainReqId.current) return;
      setDomainStatus("error");
      setDomainMsg(e?.message || "Validation failed.");
    }
  };

  const validateProblemNow = async (problemText: string, domainText: string) => {
    const p = problemText.trim();
    if (!p) return;

    if (problemDebounce.current) clearTimeout(problemDebounce.current);
    problemAbort.current?.abort();
    const ctrl = new AbortController();
    problemAbort.current = ctrl;

    const myId = ++problemReqId.current;
    setProblemStatus("verification"); // spinner
    setProblemMsg("");

    try {
      const d = domainText.trim();

      // If no domain, do basic syntax validation
      if (!d) {
        const basic = await validatePddl(p, "problem", ctrl.signal);
        if (myId !== problemReqId.current) return;
        setProblemStatus(basic.result === "success" ? "verified" : "error");
        setProblemMsg(
          basic.message ||
            (basic.result === "success" ? "Problem syntax looks valid." : "Problem validation failed.")
        );
        return;
      }

      // Try problem-against-domain
      try {
        const match = await validateMatchPddl(d, p, ctrl.signal);
        if (myId !== problemReqId.current) return;
        if (match.result === "success") {
          setProblemStatus("verified");
          setProblemMsg(match.message || "Problem successfully validated against domain.");
          return;
        }
      } catch {
        // Fall through to basic syntax
      }

      const basic = await validatePddl(p, "problem", ctrl.signal);
      if (myId !== problemReqId.current) return;

      if (basic.result === "success") {
        setProblemStatus("error");
        setProblemMsg("Syntax OK, but the problem does not match the current domain.");
      } else {
        setProblemStatus("error");
        setProblemMsg(basic.message || "Problem validation failed.");
      }
    } catch (e: any) {
      if (myId !== problemReqId.current) return;
      setProblemStatus("error");
      setProblemMsg(e?.message || "Validation failed.");
    }
  };

  /* --------------------------- AI Generators (NL) --------------------------- */
  const generateProblemNow = async (nlText: string, domainText: string) => {
    const t = nlText.trim();
    const d = domainText.trim();
    if (!t) return;

    if (!d) {
      setProblemStatus("error");
      setProblemMsg("Add a domain to generate a problem from natural language.");
      return;
    }

    if (problemDebounce.current) clearTimeout(problemDebounce.current);
    problemAbort.current?.abort();
    const ctrl = new AbortController();
    problemAbort.current = ctrl;

    const myId = ++problemReqId.current;
    setProblemStatus("verification"); // spinner in AI mode
    setProblemMsg("");

    try {
      const res = await generateProblemFromNL(t, d, {
        attempts: 1,
        generate_both: false,
        signal: ctrl.signal,
      });
      if (myId !== problemReqId.current) return;

      if (res.result_status === "success" && res.generated_problem) {
        const generated = res.generated_problem.trim();
        setProblem(generated);
        await validateProblemNow(generated, d);
      } else {
        setProblemStatus("error");
        setProblemMsg(res.message || "Could not generate a problem from the provided description.");
      }
    } catch (e: any) {
      if (myId !== problemReqId.current) return;
      setProblemStatus("error");
      setProblemMsg(e?.message || "Problem generation failed.");
    }
  };

  const generateDomainNow = async (nlText: string) => {
    const t = nlText.trim();
    if (!t) return;

    if (domainDebounce.current) clearTimeout(domainDebounce.current);
    domainAbort.current?.abort();
    const ctrl = new AbortController();
    domainAbort.current = ctrl;

    const myId = ++domainReqId.current;
    setDomainStatus("verification"); // spinner in AI mode
    setDomainMsg("");

    try {
      const res = await generateDomainFromNL(t, {
        attempts: 1,
        generate_both: false,
        signal: ctrl.signal,
      });
      if (myId !== domainReqId.current) return;

      if (res.result_status === "success" && res.generated_domain) {
        const generated = res.generated_domain.trim();
        setDomain(generated);
        await validateDomainNow(generated);
        if (problem.trim()) {
          await validateProblemNow(problem, generated);
        }
      } else {
        setDomainStatus("error");
        setDomainMsg(res.message || "Could not generate a domain from the provided description.");
      }
    } catch (e: any) {
      if (myId !== domainReqId.current) return;
      setDomainStatus("error");
      setDomainMsg(e?.message || "Domain generation failed.");
    }
  };

  /* ------------------------------ Initial load ------------------------------ */
  useEffect(() => {
    // If URL has a job id and we have that job locally, reflect it
    if (jobFromUrl) {
      const rec = loadPlan(jobFromUrl);
      if (rec) {
        setPlanId(jobFromUrl);
        if (rec.domain) setDomain(rec.domain);
        if (rec.problem) setProblem(rec.problem);
        if (rec.plan) setPlanPhase("success");
      }
    }

    // Fallback to editor snapshot
    const saved = loadPddl();
    if (saved) {
      const d = (saved.domain ?? "").trim();
      const p = (saved.problem ?? "").trim();
      if (!domain && d) setDomain(d);
      if (!problem && p) setProblem(p);
      setTimeout(async () => {
        if (d) await validateDomainNow(d);
        if (p) await validateProblemNow(p, d);
      }, 0);
    }

    // Cleanup
    return () => {
      domainAbort.current?.abort();
      problemAbort.current?.abort();
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollAbort.current?.abort();
      if (domainDebounce.current) clearTimeout(domainDebounce.current);
      if (problemDebounce.current) clearTimeout(problemDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobFromUrl]);

  /* --------------------------- Manual enter submit -------------------------- */
  const checkDomain = async () => {
    if (domainMode === "AI") await generateDomainNow(domain);
    else await validateDomainNow(domain);
  };
  const checkProblem = async () => {
    if (problemMode === "AI") await generateProblemNow(problem, domain);
    else await validateProblemNow(problem, domain);
  };

  /* ------------------------------ OnChange hooks ---------------------------- */
  // NOTE: auto-switching to AI after typing beyond ')' has been removed here.
  // The TwoModeSlider now handles robust auto-detection.
  const onDomainChange = (val: string) => setDomain(val);
  const onProblemChange = (val: string) => setProblem(val);

  /* ----------------------- Debounced re-validate on edit -------------------- */
  useEffect(() => {
    const empty = !domain.trim();
    if (empty) {
      if (domainDebounce.current) clearTimeout(domainDebounce.current);
      domainAbort.current?.abort();
      setDomainStatus("idle");
      setDomainMsg("");
      return;
    }
    if (domainMode === "AI") return;
    if (domainDebounce.current) clearTimeout(domainDebounce.current);
    domainDebounce.current = setTimeout(() => validateDomainNow(domain), DEBOUNCE_MS);
    return () => { if (domainDebounce.current) clearTimeout(domainDebounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, domainMode]);

  useEffect(() => {
    const empty = !problem.trim();
    if (empty) {
      if (problemDebounce.current) clearTimeout(problemDebounce.current);
      problemAbort.current?.abort();
      setProblemStatus("idle");
      setProblemMsg("");
      return;
    }
    if (problemMode === "AI") return;
    if (problemDebounce.current) clearTimeout(problemDebounce.current);
    problemDebounce.current = setTimeout(() => validateProblemNow(problem, domain), DEBOUNCE_MS);
    return () => { if (problemDebounce.current) clearTimeout(problemDebounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem, domain, problemMode]);

  /* ----------------------- Plan: submit + polling cycle --------------------- */
  const canGenerate = !!domain.trim() && !!problem.trim();

  // Start polling (do NOT navigate here). Navigate after success + save.
  const startPolling = (id: string) => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollAbort.current?.abort();

    setPlanId(id);
    setPlanPhase("polling");
    setPlanErr("");

    pollTimer.current = setInterval(async () => {
      const ctrl = new AbortController();
      pollAbort.current = ctrl;
      try {
        const res: any = await getPlan(id, ctrl.signal);
        const status = String(res?.status ?? res?.result_status ?? "").toLowerCase();

        if (status === "success") {
          clearInterval(pollTimer.current!);
          pollTimer.current = null;

          setPlanPhase("success");

          // Persist plan text if provided
          const planText = (res?.plan ?? res?.result_plan ?? "").trim?.() ?? "";
          if (planText) {
            try { savePlanResult(id, planText); } catch { /* non-fatal */ }
          }

          // Finally navigate to the plan page (safe now)
          setTimeout(() => {
            navigate(`/plan?job=${encodeURIComponent(id)}`, { replace: true });
          }, 0);
          return;
        }

        if (status === "failure") {
          clearInterval(pollTimer.current!);
          pollTimer.current = null;
          setPlanPhase("error");
          setPlanErr(res?.message || "Planning failed.");
          return;
        }

        // 202/queued/running → keep polling
      } catch {
        // transient network error → keep polling
      }
    }, 2500);
  };

  const handleGeneratePlan = async () => {
    if (!canGenerate || planPhase === "submitting" || planPhase === "polling") return;

    setPlanPhase("submitting");
    setPlanErr("");

    try {
      const d = domain.trim();
      const p = problem.trim();

      // Persist the editor state
      savePddlSnapshot(d, p);
      if (typeof savePddlLegacy === "function") {
        savePddlLegacy({ domain: d, problem: p });
      }

      const { id } = await generatePlan(d, p, { convert_real_types: true });
      savePlanJob(id, d, p);
      startPolling(id);
    } catch (e: any) {
      setPlanPhase("error");
      setPlanErr(e?.message || "Failed to start planning.");
    }
  };

  // Reset (icon-only). Keeps stored plan so old ?job= links still show "See Plan".
  const handleRegenerate = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollAbort.current?.abort();

    setPlanId("");
    setPlanErr("");
    setPlanPhase("idle");

    navigate("/pddl-edit", { replace: true });
  };

  /* ----------------------------------- UI ----------------------------------- */
  const glowClass = planPhase === "polling" ? "glow-pulse" : "";

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
        paddingBottom: "72px", // breathing room near footer
      }}
    >
      <BrandLogo />

      {/* Action buttons (bottom-right) */}
      <div
        className={glowClass}
        style={{
          position: "absolute",
          bottom: "calc(1rem + 42px + 0.75rem)",
          right: "1rem",
          zIndex: 9,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        {/* Show Reset ONLY if a plan exists */}
        {planPhase === "success" && (
          <PillButton
            onClick={handleRegenerate}
            label=""                 // icon-only
            rightIcon={<Reload/>}
            ariaLabel="Clear Plan"
            disabled={!canGenerate}
            // iconOnly // uncomment if your PillButton supports it
          />
        )}

        {planPhase === "success" ? (
          <PillButton
            to={`/plan?job=${encodeURIComponent(planId)}`}
            label="See Plan"
            rightIcon={<Check />}
            ariaLabel="See generated plan"
          />
        ) : (
          <PillButton
            onClick={handleGeneratePlan}
            label={
              planPhase === "submitting" || planPhase === "polling"
                ? "Generating…"
                : "Generate Plan"
            }
            rightIcon={
              planPhase === "submitting"
                ? <Spinner />   // waiting for job id
                : planPhase === "polling"
                ? <Brain />     // AI thinking while polling
                : undefined
            }
            disabled={!canGenerate || planPhase === "submitting" || planPhase === "polling"}
            ariaLabel="Generate plan from current PDDL"
          />
        )}

        {planPhase === "error" && planErr && (
          <span
            style={{
              fontSize: 12,
              color: "var(--color-danger, #dc2626)",
              marginLeft: 6,
              maxWidth: 320,
              textAlign: "left",
            }}
          >
            {planErr}
          </span>
        )}
      </div>

      {/* Glow pulse CSS */}
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

      {/* Main grid */}
      <div style={{ display: "grid", gap: "1rem", width: "min(1160px, 92vw)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: "var(--color-accent)" }} />
                <strong>Domain</strong>
              </div>
              <TwoModeSlider
                kind="domain"
                text={domain}
                value={domainMode}
                onChange={(m) => setDomainMode(m === "P" ? "AI" : m)}
                size="xs"
                manualPriorityMs={1200}
              />
            </div>

            <Textarea
              value={domain}
              onChange={onDomainChange}
              onSubmit={checkDomain}
              placeholder={domainMode === "AI" ? "Describe the domain in natural language…" : "(define (domain ...))"}
              height="55vh"
              autoResize={false}
              showStatusPill
              status={domainStatus}
              statusPillPlacement="top-right"
            />

            {/* Reserved message space (prevent layout shift) */}
            <div
              style={{
                minHeight: MESSAGE_MIN_H,
                marginTop: 8,
                fontSize: ".85rem",
                opacity: domainMsg ? 0.9 : 0,
                color:
                  domainStatus === "verified"
                    ? "var(--color-success, #16a34a)"
                    : domainStatus === "error"
                    ? "var(--color-danger, #dc2626)"
                    : "var(--color-text-muted)",
                transition: "opacity 120ms ease",
              }}
            >
              {domainMsg || " "}
            </div>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: "color-mix(in srgb, var(--color-accent) 70%, #16a34a)",
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
                manualPriorityMs={1200}
              />
            </div>

            <Textarea
              value={problem}
              onChange={onProblemChange}
              onSubmit={checkProblem}
              placeholder={problemMode === "AI" ? "Describe the goal in natural language…" : "(define (problem ...) (:domain ...))"}
              height="55vh"
              autoResize={false}
              showStatusPill
              status={problemStatus}
              statusPillPlacement="top-right"
            />

            {/* Reserved message space (prevent layout shift) */}
            <div
              style={{
                minHeight: MESSAGE_MIN_H,
                marginTop: 8,
                fontSize: ".85rem",
                opacity: problemMsg ? 0.9 : 0,
                color:
                  problemStatus === "verified"
                    ? "var(--color-success, #16a34a)"
                    : problemStatus === "error"
                    ? "var(--color-danger, #dc2626)"
                    : "var(--color-text-muted)",
                transition: "opacity 120ms ease",
              }}
            >
              {problemMsg || " "}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
