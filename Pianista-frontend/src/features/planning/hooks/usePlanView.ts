import { useState } from "react";

type PlanViewMode = "raw" | "json" | "gantt";

export function usePlanView(initial: PlanViewMode = "gantt") {
  const [view, setView] = useState<PlanViewMode>(initial);
  return { view, setView };
}
