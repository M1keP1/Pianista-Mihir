export type MermaidMode = "none" | "domain" | "problem" | "plan";

export type GenerateMermaidResult = {
  result_status: "success" | "failure";
  mermaid?: string;
  message?: string;
};

export async function generateMermaid(
  _mode: MermaidMode,
  _domain: string,
  _problem: string,
  _plan?: string,
  _signal?: AbortSignal
): Promise<GenerateMermaidResult> {
  return { result_status: "failure", message: "stub" };
}
