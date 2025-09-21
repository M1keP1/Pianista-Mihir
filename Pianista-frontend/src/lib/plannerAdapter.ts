// src/lib/plannerAdapters.ts

export type TimeUnit = "hour" | "minute" | "second" | "day";

export interface PlanTask {
  action: string;
  args: string[];
  start?: number;    // optional in input; we normalize to number
  duration?: number; // optional in input; we normalize to number
}
export interface PlanMetrics {
  "total-duration": number;
  planner: string;
  status: string;        // "success" | "no-plan" | "unknown"
  "actions-used": number;
}
export interface PlanData {
  plan: PlanTask[];
  metrics: PlanMetrics;
}

/** Accepts either the raw API JSON (with a 'plan' field) or the 'plan' string itself */
export function adaptPlannerResponse(
  apiResult: { plan?: string } | string,
  plannerId?: "aries" | "fd" | "fd-opt" | "pp" | "enhsp",
  opts?: { defaultDuration?: number }
): PlanData {
  const text = typeof apiResult === "string" ? apiResult : (apiResult?.plan ?? "");
  const planner = prettyPlannerName(plannerId) ?? detectPlanner(text) ?? "unknown";

  // Early exits for empty / no-plan responses
  if (!text || /no\s*plan/i.test(text)) {
    return {
      plan: [],
      metrics: {
        "total-duration": 0,
        planner,
        status: "no-plan",
        "actions-used": 0,
      },
    };
  }

  // Extract the interesting lines: skip headers like "enhsp SequentialPlan:" etc.
  const rawLines = text.split(/\r?\n/).map((l) => l.trim());
  const bodyStart = findBodyStartIndex(rawLines);
  const lines = rawLines.slice(bodyStart).filter(Boolean);

  const tasks: Required<PlanTask & { end: number }>[] = [];
  const DFLT_DUR = Math.max(1, Math.floor(opts?.defaultDuration ?? 1));
  let cursor = 0;

  for (const line of lines) {
    // Common patterns:
    // 1) pick-up(a)
    // 2) stack(a, b)
    // 3) cover(gs1, s1) @ t=2 dur=1
    // 4) Optional leading index: "0: stack(a, b)" or "(stack a b)" → handle best-effort
    //    (We prioritize action(arg,arg) form used by Pianista.)
    const m =
      line.match(
        // action(args) with optional "@ t=K dur=D"
        /^(\d+:)?\s*([a-zA-Z0-9_-]+)\s*\(\s*([^)]+?)?\s*\)\s*(?:@?\s*t\s*=\s*([0-9.]+))?\s*(?:dur\s*=\s*([0-9.]+))?/i
      ) ||
      line.match(
        // Fallback: "(action arg1 arg2)" PDDL-ish printing
        /^\(?\s*([a-zA-Z0-9_-]+)\s+([a-zA-Z0-9_.-]+)(?:\s+([a-zA-Z0-9_.-]+))?\s*\)?(?:\s*@?\s*t\s*=\s*([0-9.]+))?\s*(?:dur\s*=\s*([0-9.]+))?/i
      );

    if (!m) continue;

    // Normalize captures across both regexes
    const action = (m[2] || m[1])?.toLowerCase?.() ?? "";
    if (!action) continue;

    // args: from "([^)]+)" or positional groups
    const argBlob = m[3];
    let args: string[] = [];
    if (argBlob !== undefined && argBlob !== null) {
      args = String(argBlob)
        .split(/\s*,\s*|\s+/)
        .map((s) => s.replace(/[(),]/g, "").trim())
        .filter(Boolean);
    } else if (m[3] || m[4]) {
      // From second pattern positional args:
      const a1 = m[2] ? m[2] : undefined;
      const a2 = m[3] ? m[3] : undefined;
      args = [a1, a2].filter(Boolean) as string[];
    }

    const hasT = m[4] !== undefined && m[4] !== null && m[4] !== "";
    const hasDur = m[5] !== undefined && m[5] !== null && m[5] !== "";

    const start = hasT ? Math.max(0, Math.floor(Number(m[4]))) : cursor;
    const duration = hasDur ? Math.max(1, Math.ceil(Number(m[5]))) : DFLT_DUR;

    tasks.push({
      action,
      args,
      start,
      duration,
      end: start + duration,
    });

    if (!hasT) cursor += duration; // pack sequentially when no explicit t
  }

  const maxEnd = tasks.reduce((mx, t) => Math.max(mx, t.end), 0);
  const plan = tasks.map(({ action, args, start, duration }) => ({ action, args, start, duration }));

  return {
    plan,
    metrics: {
      "total-duration": maxEnd,
      planner,
      status: plan.length ? "success" : "unknown",
      "actions-used": plan.length,
    },
  };
}

/* ---------- helpers ---------- */

function prettyPlannerName(
  id?: "aries" | "fd" | "fd-opt" | "pp" | "enhsp"
): string | undefined {
  if (!id) return;
  switch (id) {
    case "aries": return "Aries";
    case "fd": return "Fast Downward";
    case "fd-opt": return "Fast Downward (Optimal)";
    case "pp": return "Pyperplan";
    case "enhsp": return "ENHSP";
  }
}

function detectPlanner(text: string): string | undefined {
  if (/fast\s*downward/i.test(text)) return "Fast Downward";
  if (/pyperplan|pp\s+sequentialplan/i.test(text)) return "Pyperplan";
  if (/enhsp/i.test(text)) return "ENHSP";
  if (/aries/i.test(text)) return "Aries";
  if (/sequentialplan/i.test(text)) return "Sequential Planner";
  return;
}

function findBodyStartIndex(lines: string[]): number {
  // Find a header like "... SequentialPlan:" and start **after** it.
  const idx = lines.findIndex((l) => /sequentialplan\s*:|^plan\s*:/i.test(l));
  if (idx >= 0) return idx + 1;

  // Otherwise, find first line that *looks* like an action
  const guess = lines.findIndex((l) => /[a-z0-9_-]+\s*\(.*\)/i.test(l));
  return Math.max(0, guess);
}
