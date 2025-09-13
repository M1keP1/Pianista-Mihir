// src/api/convertMermaid.ts
export type ConvertMermaidResponse = {
  result_status: "success" | "failure";
  conversion_result?: string; // may contain domain + problem in one blob
  message?: string;
};

const BASE = import.meta.env.VITE_PIANISTA_BASE;
const KEY  = import.meta.env.VITE_PIANISTA_KEY;

export async function convertMermaid(
  text: string,
  attempts = 1,
  signal?: AbortSignal
): Promise<ConvertMermaidResponse> {
  if (!KEY) throw new Error("Planner API key missing (VITE_PIANISTA_KEY).");

  const url = `${BASE}/convert/mermaid?attempts=${attempts}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Ocp-Apim-Subscription-Key": KEY,
    },
    body: JSON.stringify({ text }),
    signal,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return data as ConvertMermaidResponse;
}
