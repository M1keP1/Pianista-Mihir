/** PDDL parsing helpers shared across chat and editor flows. */
export function nextDefineIndex(text: string, from: number) {
  const re = /\(define\s*\(/g;
  re.lastIndex = Math.max(0, from);
  const m = re.exec(text);
  return m ? m.index : -1;
}

export function splitPddl(text: string) {
  const dIdx = text.indexOf("(define (domain");
  const pIdx = text.indexOf("(define (problem");
  if (dIdx < 0 && pIdx < 0) return { domain: "", problem: "" };

  const cutAfter = (start: number) => {
    if (start < 0) return -1;
    const next = nextDefineIndex(text, start + 1);
    return next === -1 ? text.length : next;
  };

  const domain = dIdx >= 0 ? text.slice(dIdx, cutAfter(dIdx)).trim() : "";
  const problem = pIdx >= 0 ? text.slice(pIdx, cutAfter(pIdx)).trim() : "";
  return { domain, problem };
}

export type PddlKind = "Domain+Problem" | "Domain" | "Problem" | "AI";
export function detectPddlKind(text: string): PddlKind {
  const hasD = text.includes("(define (domain");
  const hasP = text.includes("(define (problem");
  if (hasD && hasP) return "Domain+Problem";
  if (hasD) return "Domain";
  if (hasP) return "Problem";
  return "AI";
}
