import { useCallback, useEffect, useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";

import type { TextAreaStatus } from "@/shared/components/Inputbox/TextArea";

import { validatePddl } from "@/api/pianista/validatePddl";
import { validateMatchPddl } from "@/api/pianista/validateMatchPddl";
import { generateProblemFromNL } from "@/api/pianista/generateProblem";
import { generateDomainFromNL } from "@/api/pianista/generateDomain";
import { generatePlan } from "@/api/pianista/generatePlan";
import { getPlan } from "@/api/pianista/getPlan";

import {
  savePddl as savePddlLegacy,
  savePddlSnapshot,
  savePlanJob,
  loadPlan,
  savePlanResult,
} from "@/shared/lib/pddlStore";

export type PlanPhase = "idle" | "submitting" | "polling" | "success" | "error";

type UsePlanGenerationArgs = {
  domain: string;
  problem: string;
  setDomain: React.Dispatch<React.SetStateAction<string>>;
  setProblem: React.Dispatch<React.SetStateAction<string>>;
  setDomainStatus: React.Dispatch<React.SetStateAction<TextAreaStatus>>;
  setDomainMsg: React.Dispatch<React.SetStateAction<string>>;
  setProblemStatus: React.Dispatch<React.SetStateAction<TextAreaStatus>>;
  setProblemMsg: React.Dispatch<React.SetStateAction<string>>;
  navigate: NavigateFunction;
  jobFromUrl: string;
};

type EnsureResult = Promise<{ ok: boolean; text: string }>;

export type UsePlanGenerationResult = {
  planPhase: PlanPhase;
  genLabel: string;
  planId: string;
  planError: string;
  selectedPlanner: string;
  setSelectedPlanner: React.Dispatch<React.SetStateAction<string>>;
  ensureValidDomain: (dText: string) => EnsureResult;
  ensureValidProblem: (pText: string, dText: string) => EnsureResult;
  handleGeneratePlan: () => Promise<void>;
  handleRegenerate: () => void;
};

const SELECTED_PLANNER_KEY = "pddl.selectedPlanner";

export function usePlanGeneration({
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
}: UsePlanGenerationArgs): UsePlanGenerationResult {
  const [planPhase, setPlanPhase] = useState<PlanPhase>("idle");
  const [genLabel, setGenLabel] = useState<string>("Generate Plan");
  const [planId, setPlanId] = useState<string>("");
  const [planError, setPlanError] = useState<string>("");

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAbort = useRef<AbortController | null>(null);

  const [selectedPlanner, setSelectedPlanner] = useState<string>(() => {
    try {
      return localStorage.getItem(SELECTED_PLANNER_KEY) || "auto";
    } catch {
      return "auto";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_PLANNER_KEY, selectedPlanner);
    } catch {}
  }, [selectedPlanner]);

  useEffect(() => {
    if (!jobFromUrl) return;
    const rec = loadPlan(jobFromUrl);
    if (!rec) return;
    setPlanId(jobFromUrl);
    if (rec.domain) setDomain(rec.domain);
    if (rec.problem) setProblem(rec.problem);
    if (rec.plan) setPlanPhase("success");
  }, [jobFromUrl, setDomain, setProblem]);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollAbort.current?.abort();
    };
  }, []);

  const startPolling = useCallback(
    (id: string) => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollAbort.current?.abort();
      setPlanId(id);
      setPlanPhase("polling");
      setPlanError("");
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
            setPlanError(res?.message || "Planning failed.");
            return;
          }
        } catch {
          /* keep polling */
        }
      }, 2500);
    },
    [navigate]
  );

  const ensureValidDomain = useCallback(
    async (dText: string) => {
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
    },
    [setDomain, setDomainMsg, setDomainStatus]
  );

  const ensureValidProblem = useCallback(
    async (pText: string, dText: string) => {
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
          } catch {
            /* fall through */
          }
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
    },
    [setProblem, setProblemMsg, setProblemStatus]
  );

  const handleGeneratePlan = useCallback(async () => {
    const canGenerate = !!domain.trim() && !!problem.trim();
    if (!canGenerate || planPhase === "submitting" || planPhase === "polling") return;
    setPlanPhase("submitting");
    setPlanError("");
    try {
      const dom = await ensureValidDomain(domain);
      const prob = await ensureValidProblem(problem, dom.text);
      if (!dom.ok || !prob.ok) {
        setPlanPhase("error");
        setPlanError("Inputs are invalid even after AI repair.");
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
      setPlanError(e?.message || "Failed to start planning.");
    }
  }, [domain, ensureValidDomain, ensureValidProblem, planPhase, problem, selectedPlanner, startPolling]);

  const handleRegenerate = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollAbort.current?.abort();
    setPlanId("");
    setPlanError("");
    setPlanPhase("idle");
    setGenLabel("Generate Plan");
    navigate("/pddl-edit", { replace: true });
  }, [navigate]);

  return {
    planPhase,
    genLabel,
    planId,
    planError,
    selectedPlanner,
    setSelectedPlanner,
    ensureValidDomain,
    ensureValidProblem,
    handleGeneratePlan,
    handleRegenerate,
  };
}

