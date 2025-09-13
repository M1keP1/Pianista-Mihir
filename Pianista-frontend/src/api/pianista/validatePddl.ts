// src/api/validatePddl.ts
export type ValidateResponse = {
  result: "success" | "failure";
  pddl_type: string | null;
  message: string;
};

const BASE = import.meta.env.VITE_PIANISTA_BASE;
const KEY = import.meta.env.VITE_PIANISTA_KEY; 


export async function validatePddl(
  pddl: string,
  type: "domain" | "problem",
  signal?: AbortSignal
): Promise<ValidateResponse> {
  if (!KEY) throw new Error("Planner API key missing (VITE_PLANNER_KEY).");

  const res = await fetch(`${BASE}/validate/pddl?pddl_type=${type}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Ocp-Apim-Subscription-Key": KEY,
    },
    body: JSON.stringify({ pddl }),
    signal,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return {
    result: data?.result === "success" ? "success" : "failure",
    pddl_type: data?.pddl_type ?? null,
    message: data?.message ?? "",
  };
}