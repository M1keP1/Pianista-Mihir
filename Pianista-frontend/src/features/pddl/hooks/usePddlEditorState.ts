import { useCallback, useEffect, useRef, useState } from "react";

import type { TextAreaStatus, TextareaHandle } from "@/shared/components/Inputbox/TextArea";

import { validatePddl } from "@/api/pianista/validatePddl";
import { validateMatchPddl } from "@/api/pianista/validateMatchPddl";
import { generateProblemFromNL } from "@/api/pianista/generateProblem";
import { generateDomainFromNL } from "@/api/pianista/generateDomain";

import { loadPddl, savePddl as savePddlLegacy } from "@/shared/lib/pddlStore";

const DEBOUNCE_MS = 2500;

export type DomainEditMode = "AI" | "D";
export type ProblemEditMode = "AI" | "P";

export type UsePddlEditorStateResult = {
  domain: string;
  setDomain: React.Dispatch<React.SetStateAction<string>>;
  problem: string;
  setProblem: React.Dispatch<React.SetStateAction<string>>;
  domainRef: React.RefObject<TextareaHandle | null>;
  problemRef: React.RefObject<TextareaHandle | null>;
  domainAtEnd: boolean;
  problemAtEnd: boolean;
  updateDomainCaret: () => void;
  updateProblemCaret: () => void;
  domainMode: DomainEditMode;
  setDomainMode: React.Dispatch<React.SetStateAction<DomainEditMode>>;
  problemMode: ProblemEditMode;
  setProblemMode: React.Dispatch<React.SetStateAction<ProblemEditMode>>;
  domainStatus: TextAreaStatus;
  setDomainStatus: React.Dispatch<React.SetStateAction<TextAreaStatus>>;
  domainMsg: string;
  setDomainMsg: React.Dispatch<React.SetStateAction<string>>;
  problemStatus: TextAreaStatus;
  setProblemStatus: React.Dispatch<React.SetStateAction<TextAreaStatus>>;
  problemMsg: string;
  setProblemMsg: React.Dispatch<React.SetStateAction<string>>;
  validateDomainNow: (text: string) => Promise<void>;
  validateProblemNow: (problemText: string, domainText: string) => Promise<void>;
  generateDomainNow: (nlText: string) => Promise<void>;
  generateProblemNow: (nlText: string, domainText: string) => Promise<void>;
};

/**
 * Central state machine for the dual-pane PDDL editor. Tracks caret location,
 * manages validation/generation requests with debouncing, and persists drafts
 * to localStorage so the rest of the app can resume where the user left off.
 */
export function usePddlEditorState(): UsePddlEditorStateResult {
  const [domain, setDomain] = useState("");
  const [problem, setProblem] = useState("");

  const domainRef = useRef<TextareaHandle | null>(null);
  const problemRef = useRef<TextareaHandle | null>(null);

  const [domainAtEnd, setDomainAtEnd] = useState(true);
  const [problemAtEnd, setProblemAtEnd] = useState(true);

  const updateDomainCaret = useCallback(() => {
    const el = domainRef.current?.textarea;
    if (!el) return;
    const atEnd = el.selectionStart === el.selectionEnd && el.selectionStart === el.value.length;
    setDomainAtEnd(atEnd);
  }, []);

  const updateProblemCaret = useCallback(() => {
    const el = problemRef.current?.textarea;
    if (!el) return;
    const atEnd = el.selectionStart === el.selectionEnd && el.selectionStart === el.value.length;
    setProblemAtEnd(atEnd);
  }, []);

  const [domainMode, setDomainMode] = useState<DomainEditMode>("AI");
  const [problemMode, setProblemMode] = useState<ProblemEditMode>("AI");

  const [domainStatus, setDomainStatus] = useState<TextAreaStatus>("idle");
  const [problemStatus, setProblemStatus] = useState<TextAreaStatus>("idle");
  const [domainMsg, setDomainMsg] = useState("");
  const [problemMsg, setProblemMsg] = useState("");

  const domainAbort = useRef<AbortController | null>(null);
  const problemAbort = useRef<AbortController | null>(null);
  const domainReqId = useRef(0);
  const problemReqId = useRef(0);

  const domainDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const problemDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateDomainNow = useCallback(
    async (text: string) => {
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
    },
    [problem]
  );

  const validateProblemNow = useCallback(
    async (problemText: string, domainText: string) => {
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
    },
    [domain]
  );

  const generateProblemNow = useCallback(
    async (nlText: string, domainText: string) => {
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
    },
    [validateProblemNow]
  );

  const generateDomainNow = useCallback(
    async (nlText: string) => {
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
    },
    [problem, validateDomainNow, validateProblemNow]
  );

  const hasLoaded = useRef(false);
  const validateDomainNowRef = useRef(validateDomainNow);
  const validateProblemNowRef = useRef(validateProblemNow);

  useEffect(() => {
    validateDomainNowRef.current = validateDomainNow;
  }, [validateDomainNow]);

  useEffect(() => {
    validateProblemNowRef.current = validateProblemNow;
  }, [validateProblemNow]);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    const saved = loadPddl();
    if (!saved) return;
    const d = (saved.domain ?? "").trim();
    const p = (saved.problem ?? "").trim();
    if (d) setDomain(d);
    if (p) setProblem(p);
    if (d || p) {
      setTimeout(async () => {
        if (d) await validateDomainNowRef.current?.(d);
        if (p) await validateProblemNowRef.current?.(p, d);
      }, 0);
    }
  }, []);

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
  }, [domain, domainMode, validateDomainNow]);

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
  }, [problem, domain, problemMode, validateProblemNow]);

  useEffect(() => {
    return () => {
      domainAbort.current?.abort();
      problemAbort.current?.abort();
      if (domainDebounce.current) clearTimeout(domainDebounce.current);
      if (problemDebounce.current) clearTimeout(problemDebounce.current);
    };
  }, []);

  return {
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
  };
}

