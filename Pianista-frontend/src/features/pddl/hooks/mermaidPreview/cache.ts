import type { MermaidUiMode } from "./types";

function djb2(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

function inputFor(mode: MermaidUiMode, domain: string, problem: string) {
  if (mode === "D") return domain;
  if (mode === "P") return problem;
  return `${domain}\n${problem}`;
}

function cacheKey(mode: MermaidUiMode, domain: string, problem: string) {
  return `mermaid_cache:${mode}:${djb2(inputFor(mode, domain, problem))}`;
}

function safeRead(key: string) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function safeWrite(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Swallow cache failures — they're non-critical.
  }
}

export const mermaidCache = {
  key: cacheKey,
  read(mode: MermaidUiMode, domain: string, problem: string) {
    return safeRead(cacheKey(mode, domain.trim(), problem.trim()));
  },
  write(mode: MermaidUiMode, domain: string, problem: string, mermaid: string) {
    safeWrite(cacheKey(mode, domain.trim(), problem.trim()), mermaid);
  },
  persistRaw(mode: MermaidUiMode, domain: string, problem: string, text: string) {
    safeWrite(cacheKey(mode, domain.trim(), problem.trim()), text);
  },
};

export type MermaidCache = typeof mermaidCache;
