// src/pages/pddl-edit.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import BrandLogo from "@/components/VS_BrandButton";
import PillButton from "@/components/PillButton";
import Textarea, { type TextAreaStatus, type TextareaHandle } from "@/components/Inputbox/TextArea";
import ModeSlider from "@/components/Inputbox/Controls/ModeSlider";
import MermaidPanel from "@/components/MermaidPanel";
import PlannerDropup from "../components/PlannerDropup";

import {
  loadPddl,
  savePddl as savePddlLegacy,
  savePddlSnapshot,
  savePlanJob,
  loadPlan,
  savePlanResult,
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


/* -------------------------------------------------------------------------- */

const DEBOUNCE_MS = 2500;

type PlanPhase = "idle" | "submitting" | "polling" | "success" | "error";

type MermaidUiMode = "D+P" | "D" | "P";
type DomainEditMode = "AI" | "D";
type ProblemEditMode = "AI" | "P";

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
  const [domain, setDomain] = useState("");
  const [problem, setProblem] = useState("");

  const domainRef = useRef<TextareaHandle>(null);
  const problemRef = useRef<TextareaHandle>(null);
  const [domainAtEnd, setDomainAtEnd] = useState(true);
  const [problemAtEnd, setProblemAtEnd] = useState(true);

  const updateAtEnd = (ref: React.RefObject<TextareaHandle | null>, setter: (v: boolean) => void) => {
      const el = ref.current?.textarea;
      if (!el) return;
      const atEnd = el.selectionStart === el.selectionEnd && el.selectionStart === el.value.length;
      setter(atEnd);
    };

  const [domainMode, setDomainMode] = useState<DomainEditMode>("AI");
  const [problemMode, setProblemMode] = useState<ProblemEditMode>("AI");

  const [domainStatus, setDomainStatus] = useState<TextAreaStatus>("idle");
  const [problemStatus, setProblemStatus] = useState<TextAreaStatus>("idle");
  const [domainMsg, setDomainMsg] = useState("");
  const [problemMsg, setProblemMsg] = useState("");

  /* -------------------------------- Plan ---------------------------------- */
  const [planPhase, setPlanPhase] = useState<PlanPhase>("idle");
  const [genLabel, setGenLabel] = useState<string>("Generate Plan");
  const [planId, setPlanId] = useState<string>("");
  const [, setPlanErr] = useState<string>("");

  /* ---------------------------- Async plumbing ---------------------------- */
  const domainAbort = useRef<AbortController | null>(null);
  const problemAbort = useRef<AbortController | null>(null);
  const domainReqId = useRef(0);
  const problemReqId = useRef(0);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAbort = useRef<AbortController | null>(null);

  const domainDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const problemDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* --------------------------- Mermaid container -------------------------- */
  const [showMermaid, setShowMermaid] = useState(false);
  const [mermaidText, setMermaidText] = useState("");
  const [mermaidStatus, setMermaidStatus] = useState<TextAreaStatus>("idle");
  const [mermaidUiMode, setMermaidUiMode] = useState<MermaidUiMode>("D+P");

  const mermaidAbort = useRef<AbortController | null>(null);
  const mermaidReqSeq = useRef(0);
  const lastMermaidKey = useRef<string>("");
  const mermaidAutoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /* ----------------------------- Validators -------------------------------- */

  const validateDomainNow = async (text: string) => {
    const d = text.trim();
    if (!d) return;
    if (domainDebounce.current) clearTimeout(domainDebounce.current);
    domainAbort.current?.abort();
    const ctrl = new AbortController();
    domainAbort.current = ctrl;
    const myId = ++domainReqId.current;
    setDomainStatus("verification");
    setDomainMsg("");
    try {
      const res = await validatePddl(d, "domain", ctrl.signal);
      if (myId !== domainReqId.current) return;
      const ok = res.result === "success";
      setDomainStatus(ok ? "verified" : "error");
      setDomainMsg(res.message ?? "");
      if (ok) {
        try {
          if (typeof savePddlLegacy === "function") savePddlLegacy({ domain: d, problem });
        } catch {}
      }
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
    setProblemStatus("verification");
    setProblemMsg("");
    try {
      const d = domainText.trim();
      if (!d) {
        const basic = await validatePddl(p, "problem", ctrl.signal);
        if (myId !== problemReqId.current) return;
        const ok = basic.result === "success";
        setProblemStatus(ok ? "verified" : "error");
        setProblemMsg(basic.message || (ok ? "Problem syntax looks valid." : "Problem validation failed."));
        if (ok) {
          try {
            if (typeof savePddlLegacy === "function") savePddlLegacy({ domain, problem: p });
          } catch {}
        }
        return;
      }
      try {
        const match = await validateMatchPddl(d, p, ctrl.signal);
        if (myId !== problemReqId.current) return;
        if (match.result === "success") {
          setProblemStatus("verified");
          setProblemMsg(match.message || "Problem successfully validated against domain.");
          try {
            if (typeof savePddlLegacy === "function") savePddlLegacy({ domain: d, problem: p });
          } catch {}
          return;
        }
      } catch {
        // fall through
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
    setProblemStatus("verification");
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

  const generateDomainNow = async (nlText: string) => {
    const t = nlText.trim();
    if (!t) return;
    if (domainDebounce.current) clearTimeout(domainDebounce.current);
    domainAbort.current?.abort();
    const ctrl = new AbortController();
    domainAbort.current = ctrl;
    const myId = ++domainReqId.current;
    setDomainStatus("verification");
    setDomainMsg("");
    try {
      const res = await generateDomainFromNL(t, { attempts: 1, generate_both: false, signal: ctrl.signal });
      if (myId !== domainReqId.current) return;
      if (res.result_status === "success" && res.generated_domain) {
        const generated = res.generated_domain.trim();
        setDomain(generated);
        await validateDomainNow(generated);
        if (problem.trim()) await validateProblemNow(problem, generated);
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

  /* --------------------------- Lifecycle bootstrap ------------------------- */
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
      if (mermaidAutoDebounce.current) clearTimeout(mermaidAutoDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobFromUrl]);

  /* --------------------- Debounced revalidation while typing ---------------- */
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
    return () => {
      if (domainDebounce.current) clearTimeout(domainDebounce.current);
    };
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
    return () => {
      if (problemDebounce.current) clearTimeout(problemDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem, domain, problemMode]);

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

  /* ------------------------------- Plan actions ---------------------------- */

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
          const planText = (res?.plan ?? res?.result_plan ?? "").trim?.() ?? "";
          if (planText) {
            try {
              savePlanResult(id, planText);
            } catch {}
          }
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
      } catch {
        /* keep polling */
      }
    }, 2500);
  };

const ensureValidDomain = async (dText: string): Promise<{ ok: boolean; text: string }> => {
  const d = dText.trim();
  if (!d) return { ok: false, text: "" };
  setGenLabel("Validating…");
  setDomainStatus("verification");
  try {
    const res = await validatePddl(d, "domain");
    if (res.result === "success") {
      setDomainStatus("verified");
      setDomainMsg(res.message ?? "");
      return { ok: true, text: d };
    }
    setGenLabel("Fixing…");
    const ai = await generateDomainFromNL(d, { attempts: 1, generate_both: false });
    if (ai.result_status === "success" && ai.generated_domain) {
      const fixed = ai.generated_domain.trim();
      setDomain(fixed);
      const re = await validatePddl(fixed, "domain");
      const ok = re.result === "success";
      setDomainStatus(ok ? "verified" : "error");
      setDomainMsg(re.message ?? (ok ? "" : "Domain still invalid after AI repair."));
      return { ok, text: fixed };
    }
    setDomainStatus("error");
    setDomainMsg(res.message || "Domain invalid, and AI repair failed.");
    return { ok: false, text: d };
  } catch (e: any) {
    setDomainStatus("error");
    setDomainMsg(e?.message || "Domain validation failed.");
    return { ok: false, text: d };
  }
};

const ensureValidProblem = async (pText: string, dText: string): Promise<{ ok: boolean; text: string }> => {
  const p = pText.trim();
  const d = dText.trim();
  if (!p) return { ok: false, text: "" };
  setGenLabel("Validating…");
  setProblemStatus("verification");
  try {
    if (d) {
      try {
        const match = await validateMatchPddl(d, p);
        if (match.result === "success") {
          setProblemStatus("verified");
          setProblemMsg(match.message ?? "");
          return { ok: true, text: p };
        }
      } catch { /* fall through to basic */ }
    }
    const basic = await validatePddl(p, "problem");
    if (basic.result === "success" && d) {
      setProblemStatus("error");
      setProblemMsg("Syntax OK, but the problem does not match the current domain.");
      return { ok: false, text: p };
    }
    if (basic.result === "success") {
      setProblemStatus("verified");
      setProblemMsg(basic.message ?? "");
      return { ok: true, text: p };
    }
    setGenLabel("Fixing…");
    const ai = await generateProblemFromNL(p, d || "", { attempts: 1, generate_both: false });
    if (ai.result_status === "success" && ai.generated_problem) {
      const fixed = ai.generated_problem.trim();
      setProblem(fixed);
      if (d) {
        const match2 = await validateMatchPddl(d, fixed);
        const ok = match2.result === "success";
        setProblemStatus(ok ? "verified" : "error");
        setProblemMsg(match2.message ?? (ok ? "" : "Problem still mismatched after AI repair."));
        return { ok, text: fixed };
      }
      const basic2 = await validatePddl(fixed, "problem");
      const ok = basic2.result === "success";
      setProblemStatus(ok ? "verified" : "error");
      setProblemMsg(basic2.message ?? (ok ? "" : "Problem still invalid after AI repair."));
      return { ok, text: fixed };
    }
    setProblemStatus("error");
    setProblemMsg(basic.message || "Problem invalid, and AI repair failed.");
    return { ok: false, text: p };
  } catch (e: any) {
    setProblemStatus("error");
    setProblemMsg(e?.message || "Problem validation failed.");
    return { ok: false, text: p };
  }
};

const [selectedPlanner, setSelectedPlanner] = useState<string>(() => {
  try { return localStorage.getItem("pddl.selectedPlanner") || "auto"; } catch { return "auto"; }
});

const handleGeneratePlan = async () => {
  if (!canGenerate || planPhase === "submitting" || planPhase === "polling") return;
  setPlanPhase("submitting");
  setPlanErr("");
  try {
    const dom = await ensureValidDomain(domain);
    const prob = await ensureValidProblem(problem, dom.text);
    if (!dom.ok || !prob.ok) {
      setPlanPhase("error");
      setPlanErr("Inputs are invalid even after AI repair.");
      setGenLabel("Generate Plan");
      return;
    }
    const d = dom.text.trim();
    const p = prob.text.trim();
    setGenLabel("Generating…");
    savePddlSnapshot(d, p);
    if (typeof savePddlLegacy === "function") savePddlLegacy({ domain: d, problem: p });
    const opts: any = { convert_real_types: true };
    if (selectedPlanner && selectedPlanner !== "auto") {
      opts.planner = selectedPlanner;
    }
    const { id } = await generatePlan(d, p, opts);

    savePlanJob(id, d, p);
    startPolling(id);
  } catch (e: any) {
    setPlanPhase("error");
    setPlanErr(e?.message || "Failed to start planning.");
  }
};


  const handleRegenerate = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollAbort.current?.abort();
    setPlanId("");
    setPlanErr("");
    setPlanPhase("idle");
    navigate("/pddl-edit", { replace: true });
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
          {/* Domain */}
          <section
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border-muted)",
              borderRadius: 12,
              padding: 0,                      // ⬅ like MermaidPanel
              boxShadow: "0 1.5px 10px var(--color-shadow)",
              overflow: "hidden",              // ⬅ like MermaidPanel
            }}
          >
            {/* Header (same structure & styling approach as MermaidPanel header) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderBottom: "1px solid var(--color-border-muted)",
                background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-bg))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: "var(--color-accent)" }} />
                <strong>Domain</strong>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ModeSlider<"AI" | "D">
                  value={domainMode}
                  onChange={setDomainMode}
                  modes={[
                    { key: "AI", short: "AI", full: "Generate / Validate with AI" },
                    { key: "D", short: "D", full: "Write PDDL Domain" },
                  ]}
                  size="xs"
                  aria-label="Domain editor mode"
                />
              </div>
            </div>

            {/* Body */}
            <div style={{ position: "relative", padding: 10 }}>
              <Textarea
                ref={domainRef}
                value={domain}
                onChange={(v) => {
                  setDomain(v);
                  setDomainStatus("idle");
                  setDomainMsg("");
                  requestAnimationFrame(() => updateAtEnd(domainRef, setDomainAtEnd));
                }}
                onSubmit={() => (domainMode === "AI" ? generateDomainNow(domain) : validateDomainNow(domain))}
                placeholder={domainMode === "AI" ? "Describe the domain in natural language…" : "(define (domain ...))"}
                height={showMermaid ? "16vh" : "55vh"}
                autoResize={false}
                showStatusPill
                status={domainStatus}
                statusPillPlacement="top-right"
                statusHint={domainMsg || undefined}
                spellCheck={domainMode === "AI"}
                onKeyDown={() => updateAtEnd(domainRef, setDomainAtEnd)}
                statusIcons={
                domainMode === "AI"
                  ? {
                      verification: <span className="status-icon"><Spinner /></span>,
                      aiThinking:  <span className="status-icon"><Brain /></span>,
                    }
                  : undefined
              }
              />
              <div className="field-hint">Hint: Type to enhance/correct..</div>
            </div>
          </section>


          {/* Problem */}
          <section
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border-muted)",
              borderRadius: 12,
              boxShadow: "0 1.5px 10px var(--color-shadow)",
              overflow: "hidden",              // ⬅ like MermaidPanel
            }}
          >
            {/* Header (same pattern) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderBottom: "1px solid var(--color-border-muted)",
                background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-bg))",
              }}
            >
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

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ModeSlider<"AI" | "P">
                  value={problemMode}
                  onChange={setProblemMode}
                  modes={[
                    { key: "AI", short: "AI", full: "Generate / Validate with AI" },
                    { key: "P", short: "P", full: "Write PDDL Problem" },
                  ]}
                  size="xs"
                  aria-label="Problem editor mode"
                />
              </div>
            </div>

            {/* Body */}
            <div style={{ position: "relative", padding: 10 }}>
            <Textarea
              ref={problemRef}
              value={problem}
              onChange={(v) => {
                setProblem(v);
                setProblemStatus("idle");
                setProblemMsg("");
                requestAnimationFrame(() => updateAtEnd(problemRef, setProblemAtEnd));
              }}
              onSubmit={() =>
                problemMode === "AI" ? generateProblemNow(problem, domain) : validateProblemNow(problem, domain)
              }
              placeholder={
                problemMode === "AI" ? "Describe the goal in natural language…" : "(define (problem ...) (:domain ...))"
              }
              height={showMermaid ? "16vh" : "55vh"}
              autoResize={false}
              showStatusPill
              status={problemStatus}
              statusPillPlacement="top-right"
              statusHint={problemMsg || undefined}
              spellCheck={problemMode === "AI"}
              onKeyDown={() => updateAtEnd(problemRef, setProblemAtEnd)}
                              statusIcons={
                domainMode === "AI"
                  ? {
                      verification: <span className="status-icon"><Brain/></span>,
                      aiThinking:  <span className="status-icon"><Brain /></span>,
                    }
                  : undefined
              }
              />
            <div className="field-hint">Hint: PDDL Syntax gets autocorrected with AI...</div>
            </div>
          </section>

        </div>

        {/* Spacer so content never hides behind the fixed footer/actions */}
        <div aria-hidden style={{ height: 56 }} />
      </div>
    </main>
  );
}
