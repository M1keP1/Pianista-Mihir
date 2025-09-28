import { useMemo } from "react";

export type TimeUnit = "second" | "minute" | "hour" | "day";

export interface PlanTask {
  action: string;
  args: string[];
  start?: number;
  duration?: number;
}

export interface PlanMetrics {
  "total-duration"?: number;
  planner?: string;
  status?: string;
  "actions-used"?: number;
}

export interface PlanData {
  plan: PlanTask[];
  metrics?: PlanMetrics;
}

export interface ProcessedTask {
  id: string;
  action: string;
  satellite: string;
  target: string;
  start: number;
  duration: number;
  end: number;
  subRow: number;
}

export interface ProcessedLane {
  name: string;
  tasks: ProcessedTask[];
  maxRows: number;
}

export interface ProcessedData {
  lanes: ProcessedLane[];
  maxDuration: number;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const R = (n: number) => Math.round(n);
export const ceil = Math.ceil;
export const floor = Math.floor;

const hash = (s: string) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export const colorFor = (key: string) => `hsl(${hash(key) % 360} 62% 52%)`;

export const textOn = (hsl: string) =>
  /hsl\(\s*\d+\s+\d+%\s+(\d+)%\s*\)/i.test(hsl) && Number(RegExp.$1) > 60
    ? "var(--color-bg)"
    : "#fff";

export function toProcessed(planData: PlanData): ProcessedData {
  const tasks: ProcessedTask[] = [];
  let cursor = 0;

  planData.plan.forEach((t, i) => {
    const start = Number.isFinite(t.start as number) ? Math.max(0, Math.floor(t.start!)) : cursor;
    const duration = Number.isFinite(t.duration as number) ? Math.max(1, Math.ceil(t.duration!)) : 1;
    const satellite = t.args?.[0] ?? t.action;
    const target = t.args?.[1] ?? "";
    tasks.push({
      id: `${satellite}:${t.action}:${i}`,
      action: t.action,
      satellite,
      target,
      start,
      duration,
      end: start + duration,
      subRow: 0,
    });
    if (!Number.isFinite(t.start as number)) cursor += duration;
  });

  const laneMap = new Map<string, ProcessedLane>();
  for (const tk of tasks) {
    if (!laneMap.has(tk.satellite)) laneMap.set(tk.satellite, { name: tk.satellite, tasks: [], maxRows: 1 });
    laneMap.get(tk.satellite)!.tasks.push(tk);
  }

  for (const lane of laneMap.values()) {
    const rows: ProcessedTask[][] = [[]];
    for (const tk of lane.tasks.sort((a, b) => a.start - b.start || a.end - b.end)) {
      let placed = false;
      for (let r = 0; r < rows.length; r++) {
        const last = rows[r][rows[r].length - 1];
        if (!last || last.end <= tk.start) {
          tk.subRow = r;
          rows[r].push(tk);
          placed = true;
          break;
        }
      }
      if (!placed) {
        tk.subRow = rows.length;
        rows.push([tk]);
      }
    }
    lane.maxRows = rows.length;
  }

  const maxDuration =
    planData.metrics?.["total-duration"] ?? tasks.reduce((mx, t) => Math.max(mx, t.end), 0);

  return { lanes: Array.from(laneMap.values()), maxDuration };
}

export const useProcessedPlan = (planData: PlanData) => useMemo(() => toProcessed(planData), [planData]);
