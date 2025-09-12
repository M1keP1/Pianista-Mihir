// src/flows/flow.chat.ai.ts
import toast from "react-hot-toast";
import { makeFlow, type Flow } from "@/hooks/useMessagePipeline";
import { convertNaturalBoth } from "@/api/pianista";

/** Extract domain & problem from a combined textarea string */
function splitPddlBlocks(text: string): { domain?: string; problem?: string } {
  // Try to find explicit (define (domain ...)) and (define (problem ...)) blocks
  const domMatch = text.match(/\(define\s*\(\s*domain[\s\S]*?\)\s*\)/i);
  const probMatch = text.match(/\(define\s*\(\s*problem[\s\S]*?\)\s*\)/i);
  if (domMatch && probMatch) {
    // Preserve original order if user rearranged
    const domain = domMatch[0];
    const problem = probMatch[0];
    return { domain, problem };
  }

  // Fallback: split on a blank line boundary
  const [domain, ...rest] = text.split(/\n\s*\n/);
  const problem = rest.join("\n\n") || undefined;
  return { domain, problem };
}

/**
 * Chat — AI mode:
 * 1) Convert NL → PDDL (Domain+Problem)
 * 2) Fill textarea with result
 * 3) Validate Domain+Problem match
 */
export const flowChatAI: Flow = makeFlow({
  name: "AI: NL→PDDL → Validate",
  settle: "stay",
  steps: [
    // Step 1: Convert
    async ({ input, setStatus, setOutput, signal }) => {
      setStatus("ai-thinking");
      const toastId = "Convert NL→PDDL";
      toast.loading("Converting…", { id: toastId });

      const res = await convertNaturalBoth(input, 1, signal /*, disableTimeout? */);

      if (res.result_status !== "success") {
        toast.error("Conversion failed", { id: toastId });
        throw new Error("conversion failed");
      }

      const combined = [res.generated_domain ?? "", res.generated_problem ?? ""]
        .filter(Boolean)
        .join("\n\n");

      setOutput(combined);
      toast.success("Converted ✓", { id: toastId });
    },
  ],
});
