export type MermaidUiMode = "D+P" | "D" | "P";

export function needsDomain(mode: MermaidUiMode) {
  return mode !== "P";
}

export function needsProblem(mode: MermaidUiMode) {
  return mode !== "D";
}
