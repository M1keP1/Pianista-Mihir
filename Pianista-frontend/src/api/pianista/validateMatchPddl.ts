/** Confirms that a domain/problem pair are structurally compatible. */
export type ValidateMatchResponse = {
  result: "success" | "failure";
  pddl_type: string | null;   // backend sends "problem" on success
  message: string;
};

const BASE = import.meta.env.VITE_PIANISTA_BASE;
const KEY  = import.meta.env.VITE_PIANISTA_KEY;

export async function validateMatchPddl(
  domain: string,
  problem: string,
  signal?: AbortSignal
): Promise<ValidateMatchResponse> {
  if (!KEY) throw new Error("Planner API key missing (VITE_PIANISTA_KEY).");

  const res = await fetch(`${BASE}/validate/match/pddl`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Ocp-Apim-Subscription-Key": KEY,
    },
    body: JSON.stringify({ domain, problem }),
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
