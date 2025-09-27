import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { generateMermaid, type MermaidMode } from "@/api/pianista/generateMermaid";
import type { TextAreaStatus } from "@/components/Inputbox/TextArea";

export type MermaidUiMode = "D+P" | "D" | "P";

function djb2(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function inputFor(mode: MermaidUiMode, d: string, p: string) {
  return mode === "D" ? d : mode === "P" ? p : `${d}\n${p}`;
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
  } catch {
    // noop — cache failures aren't critical
  }
}

function persistRawMermaid(mode: MermaidUiMode, d: string, p: string, text: string) {
  writeMermaidCache(mode, d.trim(), p.trim(), text);
}

function fixProblemEdges(src: string) {
  let out = src;

  const ensureGoalNode = (text: string) => {
    if (/\bgoal\(\(/i.test(text)) return text;
    const lines = text.split(/\r?\n/);
    const problemIdx = lines.findIndex((l) => /subgraph\s+problem\b/i.test(l));
    const graphIdx = lines.findIndex((l) => /^\s*graph\b/i.test(l));
    const def = "  goal((goal))";
    if (problemIdx >= 0) lines.splice(problemIdx + 1, 0, def);
    else if (graphIdx >= 0) lines.splice(graphIdx + 1, 0, def);
    else lines.unshift(def);
    return lines.join("\n");
  };

  out = out.replace(
    /^(\s*[A-Za-z][\w-]*)\s*([-=]{2,}(?:>|)?)\s*\|[^|]*\|\s*$/gm,
    (_m, lhs, edge) => `${lhs} ${edge} goal`
  );

  out = out.replace(
    /(\s*[A-Za-z][\w-]*)\s*([-=]{2,}(?:>|)?)\s*\|[^|]*\|\s*(?=\s+[A-Za-z][\w-]*\s*(?:[-=]{2,}(?:>|)?|-->|==>))/g,
    (_m, lhs, edge) => `${lhs} ${edge} goal `
  );

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

function isAbortError(error: unknown): error is { name?: string } {
  return typeof error === "object" && error !== null && "name" in error && (error as { name?: string }).name === "AbortError";
}

function toApiMode(m: MermaidUiMode): MermaidMode {
  return m === "D" ? "domain" : m === "P" ? "problem" : "none";
}

export function useMermaidPreview({
  domain,
  problem,
}: {
  domain: string;
  problem: string;
}) {
  const [isMermaidOpen, setIsMermaidOpen] = useState(false);
  const [mermaidText, setMermaidText] = useState("");
  const [mermaidStatus, setMermaidStatus] = useState<TextAreaStatus>("idle");
  const [mermaidUiMode, setMermaidUiMode] = useState<MermaidUiMode>("D+P");

  const mermaidAbort = useRef<AbortController | null>(null);
  const mermaidReqSeq = useRef(0);
  const lastMermaidKey = useRef<string>("");
  const mermaidAutoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestMermaidText = useRef("");

  useEffect(() => {
    latestMermaidText.current = mermaidText;
  }, [mermaidText]);

  const cleanup = useCallback(() => {
    mermaidAbort.current?.abort();
    if (mermaidAutoDebounce.current) {
      clearTimeout(mermaidAutoDebounce.current);
      mermaidAutoDebounce.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const trimmedDomain = useMemo(() => domain.trim(), [domain]);
  const trimmedProblem = useMemo(() => problem.trim(), [problem]);

  const canConvertMermaid = useMemo(() => {
    const dOk = !!trimmedDomain;
    const pOk = !!trimmedProblem;
    if (mermaidUiMode === "D") return dOk;
    if (mermaidUiMode === "P") return pOk;
    return dOk && pOk;
  }, [trimmedDomain, trimmedProblem, mermaidUiMode]);

  const fetchMermaidInternal = useCallback(
    async (mode: MermaidUiMode, force = false) => {
      const d = trimmedDomain;
      const p = trimmedProblem;
      const needed = mode === "D" ? !!d : mode === "P" ? !!p : !!(d && p);
      if (!needed) return;

      const key = cacheKey(mode, d, p);

      if (!force && lastMermaidKey.current === key && latestMermaidText.current) {
        setMermaidStatus("verified");
        return;
      }

      if (!force) {
        const cached = readMermaidCache(mode, d, p);
        if (cached) {
          setMermaidText(cached);
          setMermaidStatus("verified");
          lastMermaidKey.current = key;
          return;
        }
      }

      mermaidAbort.current?.abort();
      const ctrl = new AbortController();
      mermaidAbort.current = ctrl;
      const myId = ++mermaidReqSeq.current;

      setMermaidStatus("ai-thinking");

      try {
        const res = await generateMermaid(toApiMode(mode), d, p, "", ctrl.signal);
        if (myId !== mermaidReqSeq.current) return;
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
      } catch (error) {
        if (isAbortError(error)) return;
        if (myId !== mermaidReqSeq.current) return;
        setMermaidStatus("error");
        setMermaidText(`%% Network error\nflowchart TD\n  A[Start] --> B[Retry request];`);
      }
    },
    [trimmedDomain, trimmedProblem]
  );

  const fetchMermaid = useCallback(
    (force = false) => fetchMermaidInternal(mermaidUiMode, force),
    [fetchMermaidInternal, mermaidUiMode]
  );

  useEffect(() => {
    if (!isMermaidOpen) return;
    if (!canConvertMermaid) return;

    if (mermaidAutoDebounce.current) clearTimeout(mermaidAutoDebounce.current);
    setMermaidStatus("ai-thinking");
    mermaidAutoDebounce.current = setTimeout(() => {
      fetchMermaidInternal(mermaidUiMode, true);
    }, 300);

    return () => {
      if (mermaidAutoDebounce.current) {
        clearTimeout(mermaidAutoDebounce.current);
        mermaidAutoDebounce.current = null;
      }
    };
  }, [trimmedDomain, trimmedProblem, isMermaidOpen, canConvertMermaid, fetchMermaidInternal, mermaidUiMode]);

  useEffect(() => {
    if (!isMermaidOpen) return;
    const d = trimmedDomain;
    const p = trimmedProblem;
    const needed = mermaidUiMode === "D" ? !!d : mermaidUiMode === "P" ? !!p : !!(d && p);
    if (!needed) return;

    const key = cacheKey(mermaidUiMode, d, p);

    if (lastMermaidKey.current === key && latestMermaidText.current) {
      setMermaidStatus("verified");
      return;
    }

    const cached = readMermaidCache(mermaidUiMode, d, p);
    if (cached) {
      setMermaidText(cached);
      setMermaidStatus("verified");
      lastMermaidKey.current = key;
      return;
    }

    setMermaidStatus("ai-thinking");
    fetchMermaidInternal(mermaidUiMode, true);
  }, [mermaidUiMode, isMermaidOpen, trimmedDomain, trimmedProblem, fetchMermaidInternal]);

  const openMermaid = useCallback(() => {
    if (!canConvertMermaid) return;
    setIsMermaidOpen(true);
    const d = trimmedDomain;
    const p = trimmedProblem;
    const key = cacheKey(mermaidUiMode, d, p);
    const cached = readMermaidCache(mermaidUiMode, d, p);
    if (cached) {
      setMermaidText(cached);
      setMermaidStatus("verified");
      lastMermaidKey.current = key;
    } else {
      setMermaidStatus("ai-thinking");
      fetchMermaidInternal(mermaidUiMode, true);
    }
  }, [canConvertMermaid, trimmedDomain, trimmedProblem, mermaidUiMode, fetchMermaidInternal]);

  const closeMermaid = useCallback(() => {
    setIsMermaidOpen(false);
    setMermaidStatus("idle");
    cleanup();
  }, [cleanup]);

  const onMermaidTextChange = useCallback(
    (next: string) => {
      setMermaidText(next);
      persistRawMermaid(mermaidUiMode, domain, problem, next);
      lastMermaidKey.current = cacheKey(mermaidUiMode, trimmedDomain, trimmedProblem);
      setMermaidStatus("verified");
    },
    [domain, problem, mermaidUiMode, trimmedDomain, trimmedProblem]
  );

  return {
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
  };
}
