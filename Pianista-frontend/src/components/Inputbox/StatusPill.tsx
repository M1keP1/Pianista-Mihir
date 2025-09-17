import Check from "@/components/icons/Check";
import Cross from "@/components/icons/Cross";
import Spinner from "@/components/icons/Spinner";
import Brain from "@/components/icons/Brain";

export type TextAreaStatus = "idle" | "verification" | "verified" | "error" | "ai-thinking";

export default function StatusPill({
  state,
  placement = "top-right",
  hint,
  
}: {
  state: TextAreaStatus;
  placement?: "top-right" | "top-left";
  hint?: string;
}) {
  if (state === "idle") return null;

  const isLeft = placement === "top-left";
  return (
    <div
      className={`status-pill${isLeft ? " is-left" : ""}`}
      data-state={state}
      data-hint={hint || undefined}
      aria-hidden
    >
      {state === "verification" && <Spinner />}
      {state === "verified" && <Check />}
      {state === "error" && <Cross />}
      {state === "ai-thinking" && <Brain />}
    </div>
  );
}
