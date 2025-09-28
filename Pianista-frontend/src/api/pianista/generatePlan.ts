/** Enqueues a PDDL planning job and returns the job id. */
export type GeneratePlanResponse = { id: string };

const BASE = import.meta.env.VITE_PIANISTA_BASE;
const KEY  = import.meta.env.VITE_PIANISTA_KEY;

/** Enqueue a planning job; returns a job id. */
export async function generatePlan(
  domain: string,
  problem: string,
  opts: {
    convert_real_types?: boolean;
    planner?: string;            //optional planner id (e.g. "fd", "enhsp")
    signal?: AbortSignal;
  } = {}
): Promise<GeneratePlanResponse> {
  const { convert_real_types = true, planner, signal } = opts;

  if (!BASE) throw new Error("Planner base URL missing (VITE_PIANISTA_BASE).");
  if (!KEY)  throw new Error("Planner API key missing (VITE_PIANISTA_KEY).");
  if (!domain?.trim() || !problem?.trim()) {
    throw new Error("Domain and Problem are required.");
  }

  const res = await fetch(
    `${BASE}/solve/pddl?convert_real_types=${convert_real_types ? "true" : "false"}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Ocp-Apim-Subscription-Key": KEY,
      },
      // Only include `planner` if caller set it; backend defaults to auto otherwise
      body: JSON.stringify(
        planner ? { domain, problem, planner } : { domain, problem }
      ),
      signal,
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

  const id = data?.id;
  if (!id) throw new Error("Planner did not return a job id.");
  return { id };
}
