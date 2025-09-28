/** Enqueues a MiniZinc solve and returns the queued job id. */
export type GenerateSolutionResponse = { id: string };

const BASE = import.meta.env.VITE_PIANISTA_BASE;
const KEY  = import.meta.env.VITE_PIANISTA_KEY;

/** Enqueue a MiniZinc solve; returns a job id. */
export async function generateSolution(
  model_str: string,
  model_params: Record<string, any> = {},
  opts: {
    solver_name?: string;       // optional (defaults to "or-tools")
    signal?: AbortSignal;
  } = {}
): Promise<GenerateSolutionResponse> {
  if (!BASE) throw new Error("Planner base URL missing (VITE_PIANISTA_BASE).");
  if (!KEY)  throw new Error("Planner API key missing (VITE_PIANISTA_KEY).");

  const { solver_name = "or-tools", signal } = opts;

  const res = await fetch(`${BASE}/solve/minizinc?solver_name=${encodeURIComponent(solver_name)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Ocp-Apim-Subscription-Key": KEY,
    },
    body: JSON.stringify({ model_str, model_params }),
    signal,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

  const id = data?.id;
  if (!id) throw new Error("Planner did not return a job id.");
  return { id };
}
