/** Polls the MiniZinc solve endpoint for the given job id. */
export type GetSolutionResponse = {
  ok: boolean;
  status: number;
  data: any;
};

const BASE = import.meta.env.VITE_PIANISTA_BASE;
const KEY  = import.meta.env.VITE_PIANISTA_KEY;

export default async function getSolution(id: string): Promise<GetSolutionResponse> {
  if (!BASE) throw new Error("Planner base URL missing (VITE_PIANISTA_BASE).");
  if (!KEY)  throw new Error("Planner API key missing (VITE_PIANISTA_KEY).");
  if (!id)   throw new Error("id is required");

  const url = `${BASE}/solve/minizinc?id=${encodeURIComponent(id)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Cache-Control": "no-cache",
      "Ocp-Apim-Subscription-Key": KEY,
    },
  });

  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  return { ok: res.ok, status: res.status, data };
}
