// src/api/pianista/validatePlan.ts
export type ValidatePlanResponse = {
  result: "success" | "failure";
  pddl_type: string | null;
  message: string;
};

const BASE = import.meta.env.VITE_PIANISTA_BASE;
const KEY  = import.meta.env.VITE_PIANISTA_KEY;

export async function validatePlan(
  domain: string,
  problem: string,
  plan: string,
  signal?: AbortSignal
): Promise<ValidatePlanResponse> {
  if (!KEY) throw new Error("Planner API key missing (VITE_PIANISTA_KEY).");

  const res = await fetch(`${BASE}/validate/plan/pddl`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Ocp-Apim-Subscription-Key": KEY,
    },
    body: JSON.stringify({ domain, problem, plan }),
    signal,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return {
    result: data?.result === "success" ? "success" : "failure",
    pddl_type: data?.pddl_type ?? "plan",
    message: data?.message ?? "",
  };
}
