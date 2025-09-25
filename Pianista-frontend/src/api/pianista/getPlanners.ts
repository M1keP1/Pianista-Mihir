// src/api/pianista/getPlanners.ts
export type Planner = { id: string; name: string };

const BASE = import.meta.env.VITE_PIANISTA_BASE;
const KEY  = import.meta.env.VITE_PIANISTA_KEY;

/** List available planners (adds 'auto' client-side) */
export async function getPlanners(signal?: AbortSignal): Promise<Planner[]> {
  if (!BASE) throw new Error("Planner base URL missing (VITE_PIANISTA_BASE).");
  if (!KEY)  throw new Error("Planner API key missing (VITE_PIANISTA_KEY).");

  const res = await fetch(`${BASE}/planners`, {
    method: "GET",
    headers: {
      "Cache-Control": "no-cache",
      "Ocp-Apim-Subscription-Key": KEY,
    },
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch planners (HTTP ${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data) ? (data as Planner[]) : [];
}
