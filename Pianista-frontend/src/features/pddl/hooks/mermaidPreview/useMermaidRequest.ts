import { useEffect, useMemo, useState } from "react";

import { generateMermaid, type MermaidMode } from "@/api/pianista/generateMermaid";
import type { TextAreaStatus } from "@/shared/components/Inputbox/TextArea";

import { mermaidCache, type MermaidCache } from "./cache";
import { maybeFixMermaid } from "./textTransforms";
import type { MermaidUiMode } from "./types";

function toApiMode(mode: MermaidUiMode): MermaidMode {
  return mode === "D" ? "domain" : mode === "P" ? "problem" : "none";
}

function isAbortError(error: unknown): error is { name?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "AbortError"
  );
}

export type MermaidRequestState = {
  status: TextAreaStatus;
  text: string;
};

export type MermaidRequestController = {
  getState: () => MermaidRequestState;
  subscribe: (listener: (state: MermaidRequestState) => void) => () => void;
  setInputs: (domain: string, problem: string) => void;
  fetch: (mode: MermaidUiMode, options?: { force?: boolean }) => Promise<void>;
  cancel: () => void;
  setManualText: (mode: MermaidUiMode, domain: string, problem: string, next: string) => void;
};

type ControllerDeps = {
  cache?: MermaidCache;
  fetchMermaid?: typeof generateMermaid;
};

export function createMermaidRequestController(
  initialDomain: string,
  initialProblem: string,
  deps: ControllerDeps = {}
): MermaidRequestController {
  const cache = deps.cache ?? mermaidCache;
  const fetchMermaid = deps.fetchMermaid ?? generateMermaid;

  let domain = initialDomain.trim();
  let problem = initialProblem.trim();
  let abortCtrl: AbortController | null = null;
  let seq = 0;
  let lastKey = "";
  let latestText = "";

  const listeners = new Set<(state: MermaidRequestState) => void>();
  let state: MermaidRequestState = { status: "idle", text: "" };

  const notify = () => {
    for (const listener of listeners) listener(state);
  };

  const setState = (next: MermaidRequestState) => {
    state = next;
    latestText = next.text;
    notify();
  };

  const ensureAbortClear = (ctrl: AbortController) => {
    if (abortCtrl === ctrl) {
      abortCtrl = null;
    }
  };

  const controller: MermaidRequestController = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    setInputs(nextDomain, nextProblem) {
      domain = nextDomain.trim();
      problem = nextProblem.trim();
      lastKey = "";
    },
    async fetch(mode, options = {}) {
      const { force = false } = options;
      const d = domain;
      const p = problem;
      const needed = mode === "D" ? !!d : mode === "P" ? !!p : !!(d && p);
      if (!needed) return;

      const key = cache.key(mode, d, p);

      if (!force && lastKey === key && latestText) {
        setState({ status: "verified", text: latestText });
        return;
      }

      if (!force) {
        const cached = cache.read(mode, d, p);
        if (cached) {
          setState({ status: "verified", text: cached });
          lastKey = key;
          return;
        }
      }

      abortCtrl?.abort();
      const ctrl = new AbortController();
      abortCtrl = ctrl;
      const requestId = ++seq;

      setState({ status: "ai-thinking", text: state.text });

      try {
        const res = await fetchMermaid(toApiMode(mode), d, p, "", ctrl.signal);
        if (requestId !== seq) return;
        if (res.result_status === "success" && res.mermaid) {
          const cleaned = maybeFixMermaid(mode, res.mermaid.trim());
          cache.write(mode, d, p, cleaned);
          lastKey = key;
          setState({ status: "verified", text: cleaned });
        } else {
          setState({
            status: "error",
            text: `%% Mermaid conversion failed${res.message ? `: ${res.message}` : ""}\nflowchart TD\n  A[Start] --> B[Check endpoint/mode/key];`,
          });
        }
      } catch (error) {
        if (isAbortError(error)) return;
        if (requestId !== seq) return;
        setState({ status: "error", text: `%% Network error\nflowchart TD\n  A[Start] --> B[Retry request];` });
      } finally {
        ensureAbortClear(ctrl);
      }
    },
    cancel() {
      abortCtrl?.abort();
      abortCtrl = null;
      setState({ status: "idle", text: state.text });
    },
    setManualText(mode, rawDomain, rawProblem, next) {
      const d = rawDomain.trim();
      const p = rawProblem.trim();
      cache.persistRaw(mode, d, p, next);
      lastKey = cache.key(mode, d, p);
      setState({ status: "verified", text: next });
    },
  };

  return controller;
}

type UseMermaidRequestArgs = {
  domain: string;
  problem: string;
};

type UseMermaidRequestResult = {
  status: TextAreaStatus;
  text: string;
  fetch: MermaidRequestController["fetch"];
  cancel: MermaidRequestController["cancel"];
  setManualText: MermaidRequestController["setManualText"];
};

export function useMermaidRequest({ domain, problem }: UseMermaidRequestArgs): UseMermaidRequestResult {
  const controller = useMemo(() => createMermaidRequestController(domain, problem), []);

  useEffect(() => {
    controller.setInputs(domain, problem);
  }, [controller, domain, problem]);

  const [state, setState] = useState(controller.getState());

  useEffect(() => controller.subscribe(setState), [controller]);

  return {
    status: state.status,
    text: state.text,
    fetch: controller.fetch,
    cancel: controller.cancel,
    setManualText: controller.setManualText,
  };
}
