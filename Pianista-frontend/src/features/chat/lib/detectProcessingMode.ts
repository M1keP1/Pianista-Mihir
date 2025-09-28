export type ProcessingMode = "AI" | "Domain" | "Domain+Problem" | "Mermaid";

/**
 * Rules:
 * - Domain:            first non-empty line STARTS WITH "(define (domain"
 * - Domain+Problem:    first line starts with "(define (domain" AND text contains "(define (problem"
 * - Mermaid:           first non-empty line starts with Mermaid syntax (or ```mermaid)
 * - Else:              AI
 */
export function detectProcessingMode(text: string): ProcessingMode {
  const src = (text ?? "").trim();
  if (!src) return "AI";

  // First non-empty line (ignore leading blank lines / spaces)
  const firstLine = src.split(/\r?\n/).find((l) => l.trim().length > 0)?.trim() ?? "";

  // Regexes (tolerant of extra spaces, case-insensitive)
  const domainStart = /^\(\s*define\s*\(\s*domain\b/i;
  const problemAnywhere = /\(\s*define\s*\(\s*problem\b/i;

  const mermaidFence = /^```+\s*mermaid\b/i;
  const mermaidStart = /^(graph|flowchart|sequencediagram|classdiagram|statediagram|erdiagram|journey|gantt|mindmap|pie)\b/i;

  // Domain+Problem has priority only when the FIRST line is domain
  if (domainStart.test(firstLine)) {
    return problemAnywhere.test(src) ? "Domain+Problem" : "Domain";
  }

  // Mermaid when FIRST line is mermaid syntax (or fenced)
  if (mermaidFence.test(firstLine) || mermaidStart.test(firstLine)) {
    return "Mermaid";
  }

  return "AI";
}
