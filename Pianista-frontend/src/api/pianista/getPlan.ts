// src/api/pianista/getPlan.ts
export type PlanJobStatus = "queued" | "running" | "success" | "failure";
export type GetPlanResponse = {
  id: string;
  status: PlanJobStatus | string;
  plan?: string;
  message?: string;
  result_status?: "success" | "failure";
};

const BASE = import.meta.env.VITE_PIANISTA_BASE;
const KEY  = import.meta.env.VITE_PIANISTA_KEY;

/** Fetch planning job status by id (202 = not ready yet). */
export async function getPlan(id: string, signal?: AbortSignal): Promise<GetPlanResponse> {
  if (!BASE) throw new Error("Planner base URL missing (VITE_PIANISTA_BASE).");
  if (!KEY)  throw new Error("Planner API key missing (VITE_PIANISTA_KEY).");
  if (!id)   throw new Error("Job id required.");

  const res = await fetch(`${BASE}/solve/pddl?id=${encodeURIComponent(id)}`, {
    method: "GET",
    headers: {
      "Cache-Control": "no-cache",
      "Ocp-Apim-Subscription-Key": KEY,
    },
    signal,
  });

  // Not ready yet
  if (res.status === 202) {
    const data = await res.json().catch(() => ({}));
    return {
      id,
      status: "running",
      message: data?.detail || data?.message,
    };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

  const plan =
    data?.plan ?? data?.output ?? data?.result ?? data?.text ?? "";

  const status: PlanJobStatus | string =
    plan
      ? "success"
      : data?.result_status === "failure"
      ? "failure"
      : (data?.status as PlanJobStatus) || "running";

  return {
    id: data?.id ?? id,
    status,
    plan: plan || undefined,
    message: data?.message ?? data?.detail,
    result_status: data?.result_status,
  };
}
