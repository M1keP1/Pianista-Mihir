/** Generates a PDDL domain from natural language input. */
export type GenerateDomainResponse = {
  result_status: "success" | "failure";
  generated_domain?: string;
  generated_problem?: string; // backend may include it, we ignore here
  message?: string;
};

const BASE = import.meta.env.VITE_PIANISTA_BASE;
const KEY  = import.meta.env.VITE_PIANISTA_KEY;

export async function generateDomainFromNL(
  text: string,
  {
    attempts = 1,
    generate_both = false,
    signal,
  }: { attempts?: number; generate_both?: boolean; signal?: AbortSignal } = {}
): Promise<GenerateDomainResponse> {
  if (!KEY) throw new Error("Planner API key missing (VITE_PIANISTA_KEY).");

  const url = `${BASE}/convert/natural_language/domain?generate_both=${generate_both}&attempts=${attempts}`;
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
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data as GenerateDomainResponse;
}
