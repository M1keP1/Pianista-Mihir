import { useState } from "react";

type PlanViewMode = "raw" | "json" | "gantt";

/** Keeps the selected plan visualization mode in React state. */
export function usePlanView(initial: PlanViewMode = "gantt") {
  const [view, setView] = useState<PlanViewMode>(initial);
  return { view, setView };
}
