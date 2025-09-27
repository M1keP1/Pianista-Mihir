import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getPlan } from "@/api/pianista/getPlan";
import { validatePlan } from "@/api/pianista/validatePlan";
import type { TextAreaStatus } from "@/components/Inputbox/TextArea";

import {
  loadPlan,
  savePlanResult,
  loadPlanAdapted,
  savePlanAdapted,
  subscribePlanAdapted,
} from "@/lib/pddlStore";
import { adaptPlannerResponse, type PlanData } from "@/lib/plannerAdapter";

export function usePlanData(job: string) {
  const [planJsonText, setPlanJsonText] = useState<string>("");
  const [rawPlan, setRawPlan] = useState<string>("");
  const [status, setStatus] = useState<TextAreaStatus>("idle");
  const [msg, setMsg] = useState<string>("");

  const [planFromStore, setPlanFromStore] = useState<PlanData | null>(null);
  const [planParsed, setPlanParsed] = useState<PlanData | null>(null);

  const saveRawDeb = useRef<number | null>(null);
  const saveJsonDeb = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const planFromRaw: PlanData = useMemo(() => {
    try {
      return adaptPlannerResponse(rawPlan || "");
    } catch {
      return { plan: [], metrics: {} as any };
    }
  }, [rawPlan]);

  useEffect(() => {
    const pretty = JSON.stringify(planFromRaw, null, 2);
    setPlanJsonText((prev) => {
      try {
        const current = JSON.parse(prev);
        if (JSON.stringify(current) === JSON.stringify(planFromRaw)) return prev;
      } catch {}
      return pretty;
    });
  }, [planFromRaw]);

  const fetchOnce = useCallback(async () => {
    if (!job) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res: any = await getPlan(job, ctrl.signal);
      const statusText = String(res?.status ?? res?.result_status ?? "").toLowerCase();

      if (statusText === "success") {
        const text = (res?.plan ?? res?.result_plan ?? "").trim?.() ?? "";
        if (!text) {
          setStatus("error");
          setMsg("Planner returned no plan text.");
          return;
        }
        setRawPlan(text);
        savePlanResult(job, text);
        try {
          savePlanAdapted(job, adaptPlannerResponse(text));
        } catch {}
        setStatus("verified");
        setMsg("Plan ready (adapted).");
        return;
      }

      if (statusText === "failed" || statusText === "error") {
        setStatus("error");
        setMsg(res?.message || "Planning failed.");
        return;
      }

      setStatus("error");
      setMsg("Plan is not ready yet. Please try again later.");
    } catch (e: any) {
      setStatus("error");
      setMsg(e?.message || "Network error. Please try again later.");
    }
  }, [job]);

  useEffect(() => {
    if (!job) {
      setStatus("error");
      setMsg("Missing plan job id. Generate a plan first.");
      return () => abortRef.current?.abort();
    }

    try {
      const stored = loadPlanAdapted?.(job) as PlanData | null;
      if (stored && stored.plan) {
        setPlanFromStore(stored);
        setPlanJsonText(JSON.stringify(stored, null, 2));
      }
    } catch {}

    try {
      const rec: any = loadPlan?.(job);
      if (rec?.plan?.trim()) {
        const text = rec.plan.trim();
        setRawPlan(text);
        setStatus("verified");
        setMsg("Plan ready (adapted).");
      } else {
        setStatus("ai-thinking");
        setMsg("Fetching plan…");
        void fetchOnce();
      }
    } catch {
      setStatus("ai-thinking");
      setMsg("Fetching plan…");
      void fetchOnce();
    }

    return () => abortRef.current?.abort();
  }, [job, fetchOnce]);

  useEffect(() => {
    if (!job) return;
    const unsub = subscribePlanAdapted?.(job, (pd: any) => {
      if (!pd) return;
      setPlanFromStore(pd as PlanData);
      setPlanJsonText((prev) => {
        try {
          const cur = JSON.parse(prev);
          if (JSON.stringify(cur) === JSON.stringify(pd)) return prev;
        } catch {}
        return JSON.stringify(pd, null, 2);
      });
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [job]);

  useEffect(() => {
    if (!job) return;
    if (saveRawDeb.current) window.clearTimeout(saveRawDeb.current);
    saveRawDeb.current = window.setTimeout(() => {
      try {
        savePlanResult?.(job, rawPlan);
      } catch {}
      try {
        savePlanAdapted?.(job, planFromRaw as any);
      } catch {}
    }, 250) as unknown as number;
    return () => {
      if (saveRawDeb.current) {
        window.clearTimeout(saveRawDeb.current);
        saveRawDeb.current = null;
      }
    };
  }, [job, rawPlan, planFromRaw]);

  useEffect(() => {
    if (!job) return;
    try {
      const obj = JSON.parse(planJsonText);
      if (obj && Array.isArray(obj.plan)) {
        setPlanParsed(obj);
        if (saveJsonDeb.current) window.clearTimeout(saveJsonDeb.current);
        saveJsonDeb.current = window.setTimeout(() => {
          try {
            savePlanAdapted?.(job, obj);
          } catch {}
        }, 300) as unknown as number;
      }
    } catch {}
    return () => {
      if (saveJsonDeb.current) {
        window.clearTimeout(saveJsonDeb.current);
        saveJsonDeb.current = null;
      }
    };
  }, [planJsonText, job]);

  const planForGantt: PlanData = useMemo(() => {
    return planFromStore ?? planParsed ?? planFromRaw;
  }, [planFromStore, planParsed, planFromRaw]);

  const validateNow = useCallback(async () => {
    const current = rawPlan.trim();
    if (!current) {
      setStatus("error");
      setMsg("Plan is empty.");
      return;
    }

    const rec = job ? loadPlan(job) : null;
    const domain = rec?.domain?.trim() || "";
    const problem = rec?.problem?.trim() || "";
    if (!domain || !problem) {
      setStatus("error");
      setMsg("Missing domain/problem for validation.");
      return;
    }

    setStatus("verification");
    setMsg("Validating plan…");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await validatePlan(domain, problem, current, ctrl.signal);
      if ((res as any).result === "success") {
        setStatus("verified");
        setMsg((res as any).message || "Plan is valid.");
        savePlanResult(job, current);
      } else {
        setStatus("error");
        setMsg((res as any).message || "Plan is NOT valid.");
      }
    } catch (e: any) {
      setStatus("error");
      setMsg(e?.message || "Validation failed.");
    }
  }, [job, rawPlan]);

  const backToEditor = job ? `/pddl-edit?job=${encodeURIComponent(job)}` : "/pddl-edit";

  return {
    rawPlan,
    setRawPlan,
    planJsonText,
    setPlanJsonText,
    status,
    msg,
    planForGantt,
    validateNow,
    backToEditor,
  };
}
