// src/hooks/useMessagePipeline.ts
import * as React from "react";

/* ---------------------------------- Types ---------------------------------- */

export type Status =
  | "idle"
  | "ai-thinking"
  | "verification"
  | "verified"
  | "error";

export type StepCtx = {
  /** Latest input sent to run() */
  input: string;
  /** Update the pill/glow state */
  setStatus: (s: Status) => void;
  /** Write back into the textarea (pipeline-controlled) */
  setOutput: (v: string) => void;
  /** Read the latest textarea value (e.g., after a previous step changed it) */
  getOutput: () => string;
  /** Cancel in-flight network calls */
  signal: AbortSignal;
};

export type Step = (ctx: StepCtx) => Promise<void> | void;

export type Flow = {
  /** Human label for debugging/logs (optional) */
  name?: string;
  /** Ordered steps to execute */
  steps: Step[];
  /**
   * What to do after success:
   *  - "stay": keep current status (typically "verified")
   *  - "reset": bounce back to "idle" after a short delay
   */
  settle?: "stay" | "reset";
};

export type PipelineEvents = {
  /** Called whenever status changes */
  onStatusChange?: (s: Status) => void;
  /** Called with thrown error from any step (after status="error") */
  onError?: (e: unknown) => void;
  /** Called after all steps succeed (after status set to "verified") */
  onSuccess?: () => void;
};

/* ------------------------------- Hook: Pipeline ------------------------------ */

export function useMessagePipeline(
  initialFlow: Flow,
  events: PipelineEvents = {}
) {
  const { onStatusChange, onError, onSuccess } = events;

  // Public state: status + textarea value (output)
  const [status, setStatusState] = React.useState<Status>("idle");
  const [output, setOutput] = React.useState<string>("");

  // Current flow (can be replaced at runtime)
  const [flow, setFlow] = React.useState<Flow>(initialFlow);

  // Internal: for cancellation + reading latest output inside steps
  const abortRef = React.useRef<AbortController | null>(null);
  const outputRef = React.useRef<string>(output);
  outputRef.current = output;

  // Wrap setStatus to also notify listeners
  const setStatus = React.useCallback(
    (s: Status) => {
      setStatusState(s);
      onStatusChange?.(s);
    },
    [onStatusChange]
  );

  // Soft reset → return to idle after success (used when flow.settle === "reset")
  const softReset = React.useCallback(() => {
    setTimeout(() => setStatus("idle"), 600);
  }, [setStatus]);

  // Cancel any in-flight work
  const cancel = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
  }, [setStatus]);

  /**
   * Execute the flow: run steps in order.
   * @param text          The input to process (usually the textarea value)
   * @param flowOverride  Optional: run with a different flow this time
   */
  const run = React.useCallback(
    async (text: string, flowOverride?: Flow) => {
      const activeFlow = flowOverride ?? flow;
      const trimmed = text.trim();
      if (!trimmed || !activeFlow?.steps?.length) return;

      // Cancel previous run (if any)
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      // Shared step context
      const ctx: StepCtx = {
        input: trimmed,
        setStatus,
        setOutput,
        getOutput: () => outputRef.current,
        signal: ac.signal,
      };

      try {
        // Execute steps sequentially
        for (const step of activeFlow.steps) {
          // Steps decide their own interim statuses, e.g. "ai-thinking" or "verification"
          // Common pattern inside steps:
          //   setStatus("ai-thinking"); await fetch(...);
          await step(ctx);
        }

        // Mark success (unless a step already moved to error)
        setStatus("verified");
        onSuccess?.();

        if (activeFlow.settle === "reset") softReset();
      } catch (err) {
        if (!ac.signal.aborted) {
          setStatus("error");
          onError?.(err);
          // Keep status visible; caller may choose to soft-reset or leave as error
        }
      } finally {
        // Only clear our abort controller if it's still the one we created
        if (abortRef.current === ac) {
          abortRef.current = null;
        }
      }
    },
    [flow, onError, onSuccess, setStatus, softReset]
  );

  return {
    // State
    status,
    output,
    // Two-way binding for your Textarea
    setOutput,
    // Control
    run,
    cancel,
    // Flow management
    flow,
    setFlow,
  };
}

/* ----------------------------- Helper: makeFlow ----------------------------- */
/**
 * Tiny helper to define flows with good intellisense.
 * Usage:
 *   const flowChatAI_real = makeFlow({
 *     name: "AI: NL→PDDL",
 *     settle: "stay",
 *     steps: [ async ({setStatus, ...}) => { ... } ],
 *   });
 */
export function makeFlow(f: Flow): Flow {
  return f;
}
