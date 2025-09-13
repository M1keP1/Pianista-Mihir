// src/pages/pddl-edit.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import BrandLogo from "@/components/VS_BrandButton";
import PillButton from "@/components/PillButton";
import Textarea, { type TextAreaStatus } from "@/components/Inputbox/TextArea";
import ModeSlider from "@/components/Inputbox/Controls/ModeSlider";

import {
  loadPddl, savePddl as savePddlLegacy, savePddlSnapshot,
  savePlanJob, loadPlan, savePlanResult,
} from "@/lib/pddlStore";

import { validatePddl } from "@/api/pianista/validatePddl";
import { validateMatchPddl } from "@/api/pianista/validateMatchPddl";
import { generateProblemFromNL } from "@/api/pianista/generateProblem";
import { generateDomainFromNL } from "@/api/pianista/generateDomain";
import { generatePlan } from "@/api/pianista/generatePlan";
import { getPlan } from "@/api/pianista/getPlan";
import { generateMermaid, type MermaidMode } from "@/api/pianista/generateMermaid";

import Spinner from "@/components/icons/Spinner";
import Brain from "@/components/icons/Brain";
import Check from "@/components/icons/Check";
import Reload from "@/components/icons/Reload";

import { useTwoModeAutoDetect, type TwoMode } from "@/hooks/useTwoModeAutoDetect";

const MESSAGE_MIN_H = 40;
const DEBOUNCE_MS = 2500;

type PlanPhase = "idle" | "submitting" | "polling" | "success" | "error";

type MermaidUiMode = "D+P" | "D" | "P";
type DomainEditMode = "AI" | "D";
type ProblemEditMode = "AI" | "P";

/* -------------------------- Mermaid cache helpers -------------------------- */
function djb2(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}
function inputFor(mode: MermaidUiMode, d: string, p: string) {
  const dt = d.trim(), pt = p.trim();
  return mode === "D" ? dt : mode === "P" ? pt : `${dt}\n${pt}`;
}
function cacheKey(mode: MermaidUiMode, d: string, p: string) {
  return `mermaid_cache:${mode}:${djb2(inputFor(mode, d, p))}`;
}
function readMermaidCache(mode: MermaidUiMode, d: string, p: string) {
  try { return localStorage.getItem(cacheKey(mode, d, p)) || ""; } catch { return ""; }
}
function writeMermaidCache(mode: MermaidUiMode, d: string, p: string, mermaid: string) {
  try { localStorage.setItem(cacheKey(mode, d, p), mermaid); } catch {}
}

/* ------------------------------- Component -------------------------------- */
export default function PddlEditPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const jobFromUrl = params.get("job")?.trim() || "";

  // Editors
  const [domain, setDomain] = useState("");
  const [problem, setProblem] = useState("");

  // Modes (auto + manual)
  const [domainMode, setDomainMode] = useState<DomainEditMode>("AI");
  const [problemMode, setProblemMode] = useState<ProblemEditMode>("AI");

  // Status + messages
  const [domainStatus, setDomainStatus] = useState<TextAreaStatus>("idle");
  const [problemStatus, setProblemStatus] = useState<TextAreaStatus>("idle");
  const [domainMsg, setDomainMsg] = useState("");
  const [problemMsg, setProblemMsg] = useState("");

  // Plan/job
  const [planPhase, setPlanPhase] = useState<PlanPhase>("idle");
  const [planId, setPlanId] = useState<string>("");
  const [planErr, setPlanErr] = useState<string>("");

  // Debounce / abort
  const domainAbort = useRef<AbortController | null>(null);
  const problemAbort = useRef<AbortController | null>(null);
  const domainReqId = useRef(0);
  const problemReqId = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAbort = useRef<AbortController | null>(null);
  const domainDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const problemDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mermaid container
  const [showMermaid, setShowMermaid] = useState(false);
  const [mermaidText, setMermaidText] = useState("");
  const [mermaidStatus, setMermaidStatus] = useState<TextAreaStatus>("idle");
  const mermaidAbort = useRef<AbortController | null>(null);
  // only the latest request is allowed to update UI
  const mermaidReqSeq = useRef(0);
  const [mermaidUiMode, setMermaidUiMode] = useState<MermaidUiMode>("D+P");

  /* --------------------------- Auto-detect AI/D/P --------------------------- */
  useTwoModeAutoDetect({
    kind: "domain",
    text: domain,
    value: domainMode as TwoMode,
    onAuto: (m) => setDomainMode((m === "P" ? "AI" : m) as DomainEditMode),
    manualPriorityMs: 1200,
  });
  useTwoModeAutoDetect({
    kind: "problem",
    text: problem,
    value: problemMode as TwoMode,
    onAuto: (m) => setProblemMode((m === "D" ? "AI" : m) as ProblemEditMode),
    manualPriorityMs: 1200,
  });

  /* ---------------------------- Store conveniences -------------------------- */
  const safeSavePddl = (d: string, p: string) => {
    try {
      if (typeof savePddlLegacy === "function") {
        savePddlLegacy({ domain: d, problem: p });
      }
    } catch {}
  };

  /* ----------------------- Convert readiness & mapping ---------------------- */
  const canConvertMermaid = useMemo(() => {
    const dOk = !!domain.trim();
    const pOk = !!problem.trim();
    if (mermaidUiMode === "D") return dOk;
    if (mermaidUiMode === "P") return pOk;
    return dOk && pOk;
  }, [domain, problem, mermaidUiMode]);

  const toApiMode = (m: MermaidUiMode): MermaidMode =>
    m === "D" ? "domain" : m === "P" ? "problem" : "none";

  /* ------------------------ Mermaid fetch (cache-first) --------------------- */
const fetchMermaidFor = async (mode: MermaidUiMode, force = false) => {
  const d = domain.trim();
  const p = problem.trim();
  const needed = mode === "D" ? !!d : mode === "P" ? !!p : !!(d && p);
  if (!needed) return;

  // Bump request id; everything below is tied to this id
  const myId = ++mermaidReqSeq.current;

  setShowMermaid(true);

  // Cache-first (unless force)
  if (!force) {
    const cached = readMermaidCache(mode, d, p);
    if (cached) {
      if (myId !== mermaidReqSeq.current) return; // stale
      setMermaidText(cached);
      setMermaidStatus("verified");
      return;
    }
  }

  // Abort any in-flight call, then start fresh
  mermaidAbort.current?.abort();
  const ctrl = new AbortController();
  mermaidAbort.current = ctrl;

  // Show thinking state for this request
  if (myId === mermaidReqSeq.current) {
    setMermaidStatus("ai-thinking");
    // optional: keep previous text; if you prefer clearing, uncomment:
    // setMermaidText("");
  }

  try {
    const res = await generateMermaid(
      toApiMode(mode),
      d,
      p,
      "",
      ctrl.signal
    );

    // Only latest request may update UI
    if (myId !== mermaidReqSeq.current) return;

    if (res.result_status === "success" && res.mermaid) {
      const out = res.mermaid.trim();
      setMermaidText(out);
      setMermaidStatus("verified");
      writeMermaidCache(mode, d, p, out);
    } else {
      setMermaidStatus("error");
      setMermaidText(
        `%% Mermaid conversion failed${res.message ? `: ${res.message}` : ""}\nflowchart TD\n  A[Start] --> B[Check endpoint/mode/key];`
      );
    }
  } catch (e: any) {
    // Ignore AbortError (we switched modes / refreshed)
    if (e?.name === "AbortError") return;

    // Only latest request may show errors
    if (myId !== mermaidReqSeq.current) return;

    setMermaidStatus("error");
    setMermaidText(`%% Network error\nflowchart TD\n  A[Start] --> B[Retry request];`);
  }
};


  /* --------------------------- Auto-refresh on mode ------------------------- */
  useEffect(() => {
    // When user changes Mermaid mode, auto-refresh and save output/cache.
    fetchMermaidFor(mermaidUiMode, /* force */ false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mermaidUiMode]);

  /* -------------------------------- Lifecycle ------------------------------ */
  useEffect(() => {
    if (jobFromUrl) {
      const rec = loadPlan(jobFromUrl);
      if (rec) {
        setPlanId(jobFromUrl);
        if (rec.domain) setDomain(rec.domain);
        if (rec.problem) setProblem(rec.problem);
        if (rec.plan) setPlanPhase("success");
      }
    }
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
    return () => {
      domainAbort.current?.abort();
      problemAbort.current?.abort();
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollAbort.current?.abort();
      if (domainDebounce.current) clearTimeout(domainDebounce.current);
      if (problemDebounce.current) clearTimeout(problemDebounce.current);
      mermaidAbort.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobFromUrl]);

  /* -------------------- Debounced revalidation of editors ------------------- */
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

  /* ------------------------- Validators / Generators ------------------------ */
  const validateDomainNow = async (text: string) => {
    const d = text.trim(); if (!d) return;
    if (domainDebounce.current) clearTimeout(domainDebounce.current);
    domainAbort.current?.abort();
    const ctrl = new AbortController(); domainAbort.current = ctrl;
    const myId = ++domainReqId.current; setDomainStatus("verification"); setDomainMsg("");
    try {
      const res = await validatePddl(d, "domain", ctrl.signal);
      if (myId !== domainReqId.current) return;
      const ok = res.result === "success";
      setDomainStatus(ok ? "verified" : "error");
      setDomainMsg(res.message ?? "");
      if (ok) {
        // Save domain immediately upon verification
        safeSavePddl(d, problem);
      }
    } catch (e: any) {
      if (myId !== domainReqId.current) return;
      setDomainStatus("error"); setDomainMsg(e?.message || "Validation failed.");
    }
  };

  const validateProblemNow = async (problemText: string, domainText: string) => {
    const p = problemText.trim(); if (!p) return;
    if (problemDebounce.current) clearTimeout(problemDebounce.current);
    problemAbort.current?.abort();
    const ctrl = new AbortController(); problemAbort.current = ctrl;
    const myId = ++problemReqId.current; setProblemStatus("verification"); setProblemMsg("");
    try {
      const d = domainText.trim();
      if (!d) {
        const basic = await validatePddl(p, "problem", ctrl.signal);
        if (myId !== problemReqId.current) return;
        const ok = basic.result === "success";
        setProblemStatus(ok ? "verified" : "error");
        setProblemMsg(basic.message || (ok ? "Problem syntax looks valid." : "Problem validation failed."));
        if (ok) safeSavePddl(domain, p); // Save problem immediately upon verification
        return;
      }
      try {
        const match = await validateMatchPddl(d, p, ctrl.signal);
        if (myId !== problemReqId.current) return;
        if (match.result === "success") {
          setProblemStatus("verified");
          setProblemMsg(match.message || "Problem successfully validated against domain.");
          safeSavePddl(domain, p); // Save on verified match
          return;
        }
      } catch { /* fall back */ }
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
      setProblemStatus("error"); setProblemMsg(e?.message || "Validation failed.");
    }
  };

  const generateProblemNow = async (nlText: string, domainText: string) => {
    const t = nlText.trim(); const d = domainText.trim(); if (!t) return;
    if (!d) { setProblemStatus("error"); setProblemMsg("Add a domain to generate a problem from natural language."); return; }
    if (problemDebounce.current) clearTimeout(problemDebounce.current);
    problemAbort.current?.abort();
    const ctrl = new AbortController(); problemAbort.current = ctrl;
    const myId = ++problemReqId.current; setProblemStatus("verification"); setProblemMsg("");
    try {
      const res = await generateProblemFromNL(t, d, { attempts: 1, generate_both: false, signal: ctrl.signal });
      if (myId !== problemReqId.current) return;
      if (res.result_status === "success" && res.generated_problem) {
        const generated = res.generated_problem.trim();
        setProblem(generated);
        await validateProblemNow(generated, d); // will also save on verify
      } else {
        setProblemStatus("error"); setProblemMsg(res.message || "Could not generate a problem from the provided description.");
      }
    } catch (e: any) {
      if (myId !== problemReqId.current) return;
      setProblemStatus("error"); setProblemMsg(e?.message || "Problem generation failed.");
    }
  };

  const generateDomainNow = async (nlText: string) => {
    const t = nlText.trim(); if (!t) return;
    if (domainDebounce.current) clearTimeout(domainDebounce.current);
    domainAbort.current?.abort();
    const ctrl = new AbortController(); domainAbort.current = ctrl;
    const myId = ++domainReqId.current; setDomainStatus("verification"); setDomainMsg("");
    try {
      const res = await generateDomainFromNL(t, { attempts: 1, generate_both: false, signal: ctrl.signal });
      if (myId !== domainReqId.current) return;
      if (res.result_status === "success" && res.generated_domain) {
        const generated = res.generated_domain.trim();
        setDomain(generated);
        await validateDomainNow(generated); // will also save on verify
        if (problem.trim()) await validateProblemNow(problem, generated);
      } else {
        setDomainStatus("error"); setDomainMsg(res.message || "Could not generate a domain from the provided description.");
      }
    } catch (e: any) {
      if (myId !== domainReqId.current) return;
      setDomainStatus("error"); setDomainMsg(e?.message || "Domain generation failed.");
    }
  };

  /* ------------------------------- Plan actions ----------------------------- */
  const canGenerate = !!domain.trim() && !!problem.trim();

  const startPolling = (id: string) => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollAbort.current?.abort();
    setPlanId(id); setPlanPhase("polling"); setPlanErr("");
    pollTimer.current = setInterval(async () => {
      const ctrl = new AbortController(); pollAbort.current = ctrl;
      try {
        const res: any = await getPlan(id, ctrl.signal);
        const status = String(res?.status ?? res?.result_status ?? "").toLowerCase();
        if (status === "success") {
          clearInterval(pollTimer.current!); pollTimer.current = null; setPlanPhase("success");
          const planText = (res?.plan ?? res?.result_plan ?? "").trim?.() ?? "";
          if (planText) { try { savePlanResult(id, planText); } catch {} }
          setTimeout(() => navigate(`/plan?job=${encodeURIComponent(id)}`, { replace: true }), 0);
          return;
        }
        if (status === "failure") {
          clearInterval(pollTimer.current!); pollTimer.current = null; setPlanPhase("error"); setPlanErr(res?.message || "Planning failed.");
        }
      } catch { /* keep polling */ }
    }, 2500);
  };

  const handleGeneratePlan = async () => {
    if (!canGenerate || planPhase === "submitting" || planPhase === "polling") return;
    setPlanPhase("submitting"); setPlanErr("");
    try {
      const d = domain.trim(); const p = problem.trim();
      savePddlSnapshot(d, p);
      if (typeof savePddlLegacy === "function") savePddlLegacy({ domain: d, problem: p });
      const { id } = await generatePlan(d, p, { convert_real_types: true });
      savePlanJob(id, d, p); startPolling(id);
    } catch (e: any) {
      setPlanPhase("error"); setPlanErr(e?.message || "Failed to start planning.");
    }
  };

  const handleRegenerate = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollAbort.current?.abort();
    setPlanId(""); setPlanErr(""); setPlanPhase("idle");
    navigate("/pddl-edit", { replace: true });
  };

  const glowClass = planPhase === "polling" ? "glow-pulse" : "";

  return (
    <main
      role="main" aria-label="PDDL edit"
      style={{
        position: "absolute", inset: 0, overflow: "hidden", display: "grid", placeItems: "center",
        background: "var(--color-bg)", color: "var(--color-text)", padding: "1rem", paddingBottom: "96px",
      }}
    >
      <BrandLogo />

      {/* Bottom-left: open/close Mermaid */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(1rem + 42px + 0.75rem)",
          left: "1rem",
          zIndex: 9,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        {showMermaid ? (
          <PillButton
            onClick={() => {
              // Close the Mermaid view and return to PDDL layout
              setShowMermaid(false);
              // Optional: reset UI status if you want a clean slate next open
              // setMermaidStatus("idle");
            }}
            label="PDDL View"
            ariaLabel="Close Mermaid and return to PDDL editors"
          />
        ) : (
          <PillButton
            onClick={() => fetchMermaidFor(mermaidUiMode, /* force */ false)}
            label="Mermaid AI"
            ariaLabel="Open Mermaid and generate diagram"
            disabled={!canConvertMermaid}
          />
        )}
      </div>


      {/* Bottom-right: planning actions */}
      <div className={glowClass} style={{
        position: "absolute", bottom: "calc(1rem + 42px + 0.75rem)", right: "1rem",
        zIndex: 9, display: "flex", gap: 8, alignItems: "center",
      }}>
        {planPhase === "success" && (
          <PillButton onClick={handleRegenerate} label="" rightIcon={<Reload />} ariaLabel="Clear Plan" />
        )}
        {planPhase === "success" ? (
          <PillButton to={`/plan?job=${encodeURIComponent(planId)}`} label="See Plan" rightIcon={<Check />} ariaLabel="See generated plan" />
        ) : (
          <PillButton
            onClick={handleGeneratePlan}
            label={planPhase === "submitting" || planPhase === "polling" ? "Generating…" : "Generate Plan"}
            rightIcon={planPhase === "submitting" ? <Spinner /> : planPhase === "polling" ? <Brain /> : undefined}
            disabled={!canGenerate || planPhase === "submitting" || planPhase === "polling"}
            ariaLabel="Generate plan from current PDDL"
          />
        )}
        {planPhase === "error" && planErr && (
          <span style={{ fontSize: 12, color: "var(--color-danger, #dc2626)", marginLeft: 6, maxWidth: 320, textAlign: "left" }}>
            {planErr}
          </span>
        )}
      </div>

      {/* Glow CSS */}
      <style>{`
        @keyframes glowPulse { 0%{box-shadow:0 0 0 0 rgba(99,102,241,0.28);} 50%{box-shadow:0 0 0 6px rgba(99,102,241,0.14);} 100%{box-shadow:0 0 0 0 rgba(99,102,241,0.28);} }
        .glow-pulse { border-radius: 10px; animation: glowPulse 1.4s ease-in-out infinite; }
      `}</style>

      {/* Content */}
      <div style={{ display: "grid", gap: "1rem", width: "min(1160px, 92vw)" }}>
        {/* Mermaid container */}
        {showMermaid && (
          <section style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border-muted)",
            borderRadius: 12, padding: 14, boxShadow: "0 1.5px 10px var(--color-shadow)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: "var(--color-accent)" }} />
                <strong>Mermaid (auto-generated)</strong>
              </div>
              <ModeSlider<"D+P" | "D" | "P">
                value={mermaidUiMode}
                onChange={(k) => setMermaidUiMode(k)}
                modes={[
                  { key: "D+P", short: "D+P", full: "Domain + Problem" },
                  { key: "D",   short: "D",   full: "Domain" },
                  { key: "P",   short: "P",   full: "Problem" },
                ]}
                size="xs"
                aria-label="Mermaid conversion mode"
              />
            </div>
            <Textarea
              value={mermaidText}
              onChange={setMermaidText}
              onSubmit={() => {}}
              placeholder="graph TD; ..."
              height="50vh"
              autoResize={false}
              showStatusPill
              status={mermaidStatus}
              statusPillPlacement="top-right"
              spellCheck={false}
            />
          </section>
        )}

        {/* Editors */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          {/* Domain */}
          <section style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border-muted)",
            borderRadius: 12, padding: 14, boxShadow: "0 1.5px 10px var(--color-shadow)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: "var(--color-accent)" }} />
                <strong>Domain</strong>
              </div>
              <ModeSlider<"AI" | "D">
                value={domainMode}
                onChange={setDomainMode}
                modes={[
                  { key: "AI", short: "AI", full: "Generate / Validate with AI" },
                  { key: "D",  short: "D",  full: "Write PDDL Domain" },
                ]}
                size="xs"
                aria-label="Domain editor mode"
              />
            </div>
            <Textarea
              value={domain}
              onChange={setDomain}
              onSubmit={() => (domainMode === "AI" ? generateDomainNow(domain) : validateDomainNow(domain))}
              placeholder={domainMode === "AI" ? "Describe the domain in natural language…" : "(define (domain ...))"}
              height={showMermaid ? "16vh" : "55vh"}
              autoResize={false}
              showStatusPill
              status={domainStatus}
              statusPillPlacement="top-right"
              spellCheck={domainMode === "AI"}
            />
            <div style={{
              minHeight: MESSAGE_MIN_H, marginTop: 8, fontSize: ".85rem",
              opacity: domainMsg ? 0.9 : 0,
              color: domainStatus === "verified" ? "var(--color-success, #16a34a)" :
                     domainStatus === "error"    ? "var(--color-danger, #dc2626)" :
                                                   "var(--color-text-muted)",
              transition: "opacity 120ms ease",
            }}>
              {domainMsg || " "}
            </div>
          </section>

          {/* Problem */}
          <section style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border-muted)",
            borderRadius: 12, padding: 14, boxShadow: "0 1.5px 10px var(--color-shadow)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: "color-mix(in srgb, var(--color-accent) 70%, #16a34a)" }} />
                <strong>Problem</strong>
              </div>
              <ModeSlider<"AI" | "P">
                value={problemMode}
                onChange={setProblemMode}
                modes={[
                  { key: "AI", short: "AI", full: "Generate / Validate with AI" },
                  { key: "P",  short: "P",  full: "Write PDDL Problem" },
                ]}
                size="xs"
                aria-label="Problem editor mode"
              />
            </div>
            <Textarea
              value={problem}
              onChange={setProblem}
              onSubmit={() => (problemMode === "AI" ? generateProblemNow(problem, domain) : validateProblemNow(problem, domain))}
              placeholder={problemMode === "AI" ? "Describe the goal in natural language…" : "(define (problem ...) (:domain ...))"}
              height={showMermaid ? "16vh" : "55vh"}
              autoResize={false}
              showStatusPill
              status={problemStatus}
              statusPillPlacement="top-right"
              spellCheck={problemMode === "AI"}
            />
            <div style={{
              minHeight: MESSAGE_MIN_H, marginTop: 8, fontSize: ".85rem",
              opacity: problemMsg ? 0.9 : 0,
              color: problemStatus === "verified" ? "var(--color-success, #16a34a)" :
                     problemStatus === "error"    ? "var(--color-danger, #dc2626)" :
                                                    "var(--color-text-muted)",
              transition: "opacity 120ms ease",
            }}>
              {problemMsg || " "}
            </div>
          </section>
        </div>

        {/* Footer spacer */}
        <div aria-hidden style={{ height: 56 }} />
      </div>
    </main>
  );
}
