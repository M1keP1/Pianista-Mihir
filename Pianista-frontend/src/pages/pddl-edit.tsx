// src/pages/pddl-edit.tsx
import { useEffect, useRef, useState } from "react";
import BrandLogo from "@/components/VS_BrandButton";
import PillButton from "@/components/PillButton";
import Textarea, { type TextAreaStatus } from "@/components/Inputbox/TextArea";
import TwoModeSlider, { type TwoMode } from "@/components/Inputbox/Controls/TwoModeSlider";
import { loadPddl } from "@/lib/pddlStore";
import { validatePddl } from "@/api/pianista/validatePddl";           // (pddl, "domain"|"problem", signal?)
import { validateMatchPddl } from "@/api/pianista/validateMatchPddl"; // (domain, problem, signal?)
import { generateProblemFromNL } from "@/api/pianista/generateProblem";
import { generateDomainFromNL } from "@/api/pianista/generateDomain";
import { generatePlan } from "@/api/pianista/generatePlan";
import { getPlan } from "@/api/pianista/getPlan";

// Icons (match StatusPill visuals)
import Spinner from "@/components/icons/Spinner";
import Brain from "@/components/icons/Brain";
import Check from "@/components/icons/Check";

const MESSAGE_MIN_H = 40;

// Heuristic: if there's any non-whitespace text after the last ')', it's likely NL -> switch to AI
function hasTextAfterLastParen(s: string) {
  const i = s.lastIndexOf(")");
  if (i < 0) return false;
  return /\S/.test(s.slice(i + 1));
}

type PlanPhase = "idle" | "submitting" | "polling" | "success" | "error";

export default function PddlEditPage() {
  // Text values
  const [domain, setDomain] = useState("");
  const [problem, setProblem] = useState("");

  // Modes (visual)
  const [domainMode, setDomainMode] = useState<TwoMode>("AI");
  const [problemMode, setProblemMode] = useState<TwoMode>("AI");

  // Status + messages
  const [domainStatus, setDomainStatus] = useState<TextAreaStatus>("idle");
  const [problemStatus, setProblemStatus] = useState<TextAreaStatus>("idle");
  const [domainMsg, setDomainMsg] = useState("");
  const [problemMsg, setProblemMsg] = useState("");

  // Plan job state
  const [planPhase, setPlanPhase] = useState<PlanPhase>("idle");
  const [planId, setPlanId] = useState<string>("");
  const [planErr, setPlanErr] = useState<string>("");

  // timers/aborters
  const domainAbort = useRef<AbortController | null>(null);
  const domainReqId = useRef(0);
  const problemAbort = useRef<AbortController | null>(null);
  const problemReqId = useRef(0);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAbort = useRef<AbortController | null>(null);

  // Debounce (1.5s)
  const DEBOUNCE_MS = 1500;
  const domainDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const problemDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ----------------------- Core validators (now) ----------------------- */
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
      if (myId !== domainReqId.current) return; // stale
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

      try {
        const match = await validateMatchPddl(d, p, ctrl.signal);
        if (myId !== problemReqId.current) return;
        if (match.result === "success") {
          setProblemStatus("verified");
          setProblemMsg(match.message || "Problem successfully validated against domain.");
          return;
        }
      } catch { /* fall through */ }

      const basic = await validatePddl(p, "problem", ctrl.signal);
      if (myId !== problemReqId.current) return;

      if (basic.result === "success") {
        setProblemStatus("error");
        setProblemMsg("Syntax OK. But the problem does not match the current domain.");
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

  /* --------- Generate from NL (Problem AI) --------- */
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
    setProblemStatus("ai-thinking"); 
    setProblemMsg("");

    try {
      const res = await generateProblemFromNL(t, d, { attempts: 1, generate_both: false, signal: ctrl.signal });
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

  /* --------- Generate from NL (Domain AI) --------- */
  const generateDomainNow = async (nlText: string) => {
    const t = nlText.trim();
    if (!t) return;

    if (domainDebounce.current) clearTimeout(domainDebounce.current);
    domainAbort.current?.abort();
    const ctrl = new AbortController();
    domainAbort.current = ctrl;

    const myId = ++domainReqId.current;
    setDomainStatus("ai-thinking");
    setDomainMsg("");

    try {
      const res = await generateDomainFromNL(t, { attempts: 1, generate_both: false, signal: ctrl.signal });
      if (myId !== domainReqId.current) return;

      if (res.result_status === "success" && res.generated_domain) {
        const generated = res.generated_domain.trim();
        setDomain(generated);
        await validateDomainNow(generated); // validate new domain
        if (problem.trim()) {
          await validateProblemNow(problem, generated); // re-check problem vs new domain
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

  /* -------------------- Load from chat, auto-validate once -------------------- */
  useEffect(() => {
    const saved = loadPddl();
    if (saved) {
      const d = (saved.domain ?? "").trim();
      const p = (saved.problem ?? "").trim();
      setDomain(d);
      setProblem(p);
      setTimeout(async () => {
        if (d) await validateDomainNow(d);
        if (p) await validateProblemNow(p, d);
      }, 0);
    }
    return () => {
      domainAbort.current?.abort();
      problemAbort.current?.abort();
      // clear polling if any
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollAbort.current?.abort();
      if (domainDebounce.current) clearTimeout(domainDebounce.current);
      if (problemDebounce.current) clearTimeout(problemDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------ Manual submit (Enter) ------------------------ */
  const checkDomain = async () => {
    if (domainMode === "AI") {
      await generateDomainNow(domain);
    } else {
      await validateDomainNow(domain);
    }
  };
  const checkProblem = async () => {
    if (problemMode === "AI") {
      await generateProblemNow(problem, domain);
    } else {
      await validateProblemNow(problem, domain);
    }
  };

  /* ---------------------- Smart onChange with AI snap -------------------- */
  const onDomainChange = (val: string) => {
    setDomain(val);
    if (domainMode !== "AI" && hasTextAfterLastParen(val)) {
      setDomainMode("AI");
    }
  };
  const onProblemChange = (val: string) => {
    setProblem(val);
    if (problemMode !== "AI" && hasTextAfterLastParen(val)) {
      setProblemMode("AI");
    }
  };

  /* ------------------ Debounced auto-validate on edits ------------------- */
  useEffect(() => {
    const empty = !domain.trim();
    if (empty) {
      if (domainDebounce.current) clearTimeout(domainDebounce.current);
      domainAbort.current?.abort();
      setDomainStatus("idle");
      setDomainMsg("");
      return;
    }
    if (domainMode === "AI") return; // skip while in AI mode
    if (domainDebounce.current) clearTimeout(domainDebounce.current);
    domainDebounce.current = setTimeout(() => {
      validateDomainNow(domain);
    }, DEBOUNCE_MS);
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
    if (problemMode === "AI") return; // skip while in AI mode
    if (problemDebounce.current) clearTimeout(problemDebounce.current);
    problemDebounce.current = setTimeout(() => {
      validateProblemNow(problem, domain);
    }, DEBOUNCE_MS);
    return () => { if (problemDebounce.current) clearTimeout(problemDebounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem, domain, problemMode]);

  /* -------------------- Plan: submit + polling handlers ------------------ */
  const canGenerate = !!domain.trim() && !!problem.trim();
  const pollEveryMs = 2500;

  const startPolling = (id: string) => {
    // cleanup previous
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollAbort.current?.abort();

    setPlanId(id);
    setPlanPhase("polling");
    setPlanErr("");

    pollTimer.current = setInterval(async () => {
      const ctrl = new AbortController();
      pollAbort.current = ctrl;
      try {
        const res = await getPlan(id, ctrl.signal);
        const status = String(res.status).toLowerCase();
        if (status === "success") {
          clearInterval(pollTimer.current!);
          setPlanPhase("success");
        } else if (status === "failure") {
          clearInterval(pollTimer.current!);
          setPlanPhase("error");
          setPlanErr(res.message || "Planning failed.");
        }
        // else queued/running → keep polling (AI-thinking)
      } catch (e: any) {
        // transient errors: keep polling, but you could surface a toast if desired
      }
    }, pollEveryMs);
  };

  const handleGeneratePlan = async () => {
    if (!canGenerate || planPhase === "submitting" || planPhase === "polling") return;
    setPlanPhase("submitting");
    setPlanErr("");

    try {
      const { id } = await generatePlan(domain.trim(), problem.trim(), { convert_real_types: true });
      startPolling(id);
    } catch (e: any) {
      setPlanPhase("error");
      setPlanErr(e?.message || "Failed to start planning.");
    }
  };

  /* --------------------------------- UI ---------------------------------- */
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
        paddingBottom: "72px", // keep bottom breathing room so nothing jumps near footer
      }}
    >
      <BrandLogo />

      {/* Back to Chat (bottom-left) */}
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

      {/* Generate Plan (bottom-right) */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(1rem + 42px + 0.75rem)",
          right: "1rem",
          zIndex: 9,
        }}
      >
        {planPhase === "success" ? (
          <PillButton
            to={`/plan?job=${encodeURIComponent(planId)}`}
            label="See Plan"
            rightIcon={<Check />} // tick (same icon set as StatusPill)
            ariaLabel="See generated plan"
          />
        ) : (
          <PillButton
            onClick={handleGeneratePlan}
            label={
              planPhase === "submitting"
                ? "Generating…"
                : planPhase === "polling"
                ? "Generating…"
                : "Generate Plan"
            }
            rightIcon={
              planPhase === "submitting" ? (
                <Spinner /> // waiting for id
              ) : planPhase === "polling" ? (
                <Brain />   // ai-thinking while polling
              ) : undefined
            }
            disabled={!canGenerate || planPhase === "submitting" || planPhase === "polling"}
            ariaLabel="Generate plan from current PDDL"
          />
        )}
      </div>

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
              />
            </div>

            <Textarea
              value={domain}
              onChange={onDomainChange}
              onSubmit={checkDomain} // Enter → (AI) generate or (D) validate
              placeholder={domainMode === "AI" ? "Describe the domain in natural language…" : "(define (domain ...))"}
              height="55vh"
              autoResize={false}
              showStatusPill
              status={domainStatus}
              statusPillPlacement="top-right"
            />

            {/* Reserved status/message space (no layout shift) */}
            <div
              style={{
                minHeight: MESSAGE_MIN_H,
                marginTop: 8,
                fontSize: ".85rem",
                opacity: domainMsg ? 0.9 : 0, // hide text but keep space when empty
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
                  style={{ width: 10, height: 10, borderRadius: 999, background: "color-mix(in srgb, var(--color-accent) 70%, #16a34a)" }}
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
              onChange={onProblemChange}
              onSubmit={checkProblem} // Enter → (AI) generate or (P) validate
              placeholder={problemMode === "AI" ? "Describe the goal in natural language…" : "(define (problem ...) (:domain ...))"}
              height="55vh"
              autoResize={false}
              showStatusPill
              status={problemStatus}
              statusPillPlacement="top-right"
            />

            {/* Reserved status/message space (no layout shift) */}
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
