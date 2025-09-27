import type { MermaidUiMode } from "./types";

function ensureGoalNode(text: string) {
  if (/\bgoal\(\(/i.test(text)) return text;
  const lines = text.split(/\r?\n/);
  const problemIdx = lines.findIndex((line) => /subgraph\s+problem\b/i.test(line));
  const graphIdx = lines.findIndex((line) => /^\s*graph\b/i.test(line));
  const goalDef = "  goal((goal))";
  if (problemIdx >= 0) lines.splice(problemIdx + 1, 0, goalDef);
  else if (graphIdx >= 0) lines.splice(graphIdx + 1, 0, goalDef);
  else lines.unshift(goalDef);
  return lines.join("\n");
}

export function fixProblemEdges(src: string) {
  let out = src;

  out = out.replace(
    /^(\s*[A-Za-z][\w-]*)\s*([-=]{2,}(?:>|)?)\s*\|[^|]*\|\s*$/gm,
    (_m, lhs: string, edge: string) => `${lhs} ${edge} goal`
  );

  out = out.replace(
    /(\s*[A-Za-z][\w-]*)\s*([-=]{2,}(?:>|)?)\s*\|[^|]*\|\s*(?=\s+[A-Za-z][\w-]*\s*(?:[-=]{2,}(?:>|)?|-->|==>))/g,
    (_m, lhs: string, edge: string) => `${lhs} ${edge} goal `
  );

  out = out.replace(
    /^(\s*[A-Za-z][\w-]*)\s*([-=]{2,}(?:>|)?)\s*\|\s*$/gm,
    (_m, lhs: string, edge: string) => `${lhs} ${edge} goal`
  );

  if (/[\s-](goal)(?!\s*\(\()/i.test(out)) {
    out = ensureGoalNode(out);
  }

  return out;
}

export function maybeFixMermaid(mode: MermaidUiMode, text: string) {
  return mode === "P" ? fixProblemEdges(text) : text;
}
