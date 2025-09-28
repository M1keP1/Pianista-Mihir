/** Requests a Mermaid diagram representation for the supplied planning data. */
export type MermaidMode = "none" | "domain" | "problem" | "plan";

export type GenerateMermaidResult = {
  result_status: "success" | "failure";
  mermaid?: string;
  message?: string;
};

const BASE = import.meta.env.VITE_PIANISTA_BASE;
const KEY  = import.meta.env.VITE_PIANISTA_KEY;

const MODE_SEGMENT: Record<MermaidMode, string> = {
  none: "None",           // D+P → pddl: "<domain>\n<problem>"
  domain: "domain",       // D → pddl: "<domain>"
  problem: "problem",     // P → pddl: "<problem>"
  plan: "plan",           // future: plan → { plan: string }
};

function joinPddl(domain?: string, problem?: string) {
  const d = (domain ?? "").trim();
  const p = (problem ?? "").trim();
  return [d, p].filter(Boolean).join("\n");
}

/**
 * Calls: POST {BASE_URL}/convert/mermaid/{None|domain|problem|plan}
 * Body:
 *  - mode none/domain/problem: { pddl: string }
 *  - mode plan: { plan: string }
 * Response: { result_status: "success", conversion_result: "graph TD\n..." }
 */
export async function generateMermaid(
  mode: MermaidMode,
  domain: string,
  problem: string,
  plan?: string,
  signal?: AbortSignal
): Promise<GenerateMermaidResult> {
    if (!BASE) throw new Error("Planner base URL missing (VITE_PIANISTA_BASE).");
    if (!KEY)  throw new Error("Planner API key missing (VITE_PIANISTA_KEY).");
  const url = `${BASE}/convert/mermaid/${MODE_SEGMENT[mode]}`;
  const payload =
    mode === "plan"
      ? { plan: String(plan ?? "").trim() }
      : {
          pddl:
            mode === "domain"
              ? (domain ?? "").trim()
              : mode === "problem"
              ? (problem ?? "").trim()
              : joinPddl(domain, problem),
        };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Ocp-Apim-Subscription-Key": KEY, // ← key always from env
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      return { result_status: "failure", message: `HTTP ${res.status}` };
    }

    const data = await res.json();
    if (data?.result_status === "success" && typeof data?.conversion_result === "string") {
      return { result_status: "success", mermaid: data.conversion_result };
    }
    return { result_status: "failure", message: data?.message || "Conversion failed." };
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "Request aborted" : (e?.message || "Network error");
    return { result_status: "failure", message: msg };
  }
}
