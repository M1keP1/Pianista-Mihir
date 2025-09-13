// src/api/pianista/health.ts
export type PlannerHealth = {
  status: "ok" | "down";
  message?: string;
};

const BASE = import.meta.env.VITE_PIANISTA_BASE;
const KEY  = import.meta.env.VITE_PIANISTA_KEY;

export async function pingPlanner(signal?: AbortSignal): Promise<PlannerHealth> {
  if (!BASE) throw new Error("Planner base URL missing (VITE_PIANISTA_BASE).");
  if (!KEY) throw new Error("Planner API key missing (VITE_PIANISTA_KEY).");

  const res = await fetch(`${BASE}/`, {
    method: "GET",
    headers: {
      "Cache-Control": "no-cache",
      "Ocp-Apim-Subscription-Key": KEY,
    },
    signal,
  });

  const data = await res.json().catch(() => ({}));
  return {
    status: res.ok ? "ok" : "down",
    message: typeof data?.message === "string" ? data.message : undefined,
  };
}
