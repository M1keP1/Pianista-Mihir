/** Full-page MiniZinc workflow for submitting models and retrieving solutions. */
import React from "react";
import BrandLogo from "@/shared/components/VS_BrandButton";
import Textarea, { type TextAreaStatus } from "@/shared/components/Inputbox/TextArea";
import PillButton from "@/shared/components/PillButton";
import { generateSolution } from "@/api/pianista/generateSolution";
import getSolution from "@/api/pianista/getSolution";
import MiniZincEditorCard from "@/features/minizinc/components/MiniZincEditorCard";
import ActionBar from "@/shared/components/layout/ActionBar";

type Phase = "compose" | "result";
type RunState = "idle" | "submitting" | "polling" | "error" | "done";

const DEFAULT_MODEL = `int: target;
var 0..100: x;
var 0..100: y;

constraint x + y == target;

solve satisfy;`;

const DEFAULT_PARAMS = `{
  "target": 199
}`;

export default function MiniZincPage() {
  const [phase, setPhase] = React.useState<Phase>("compose");
  const [run, setRun] = React.useState<RunState>("idle");

  const [modelStr, setModelStr] = React.useState(DEFAULT_MODEL);
  const [paramsText, setParamsText] = React.useState(DEFAULT_PARAMS);

  const [modelStatus, setModelStatus] = React.useState<TextAreaStatus>("idle");
  const [paramsStatus, setParamsStatus] = React.useState<TextAreaStatus>("idle");
  const [statusHint, setStatusHint] = React.useState<string>("");

  const [responseText, setResponseText] = React.useState<string>("");
  const [jobId, setJobId] = React.useState<string | null>(null);

  const isBusy = run === "submitting" || run === "polling";
  const canSend = modelStr.trim().length > 0 && paramsText.trim().length > 0 && !isBusy;

  // Guard against setState after unmount during polling
  const aliveRef = React.useRef(true);
  React.useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const resetAll = () => {
    setPhase("compose");
    setRun("idle");
    setModelStatus("idle");
    setParamsStatus("idle");
    setStatusHint("");
    setResponseText("");
    setJobId(null);
  };
  const handleSend = async () => {
    if (!canSend) return;

    // Put both editors into a "thinking" state so the user sees progress immediately.
    setRun("submitting");
    setModelStatus("ai-thinking");
    setParamsStatus("ai-thinking");
    setStatusHint("");

    // Fail fast if the parameter JSON is invalid before touching the API.
    let modelParams: Record<string, any> = {};
    try {
      modelParams = JSON.parse(paramsText);
    } catch {
      setRun("error");
      setModelStatus("error");
      setParamsStatus("error");
      setStatusHint("Parameters must be valid JSON.");
      return;
    }

    try {
      // Enqueue the solve so we get a job id to poll.
      const { id } = await generateSolution(modelStr, modelParams /* solverName default inside */);
      if (!aliveRef.current) return;
      setJobId(id);

      // Poll until the job resolves or we time out.
      setRun("polling");
      setModelStatus("ai-thinking");
      setParamsStatus("ai-thinking");

      const intervalMs = 1500;
      const maxPolls = 120; // Bail after ~3 minutes to avoid spinning forever.
      let attempt = 0;

      while (attempt < maxPolls && aliveRef.current) {
        const resp = await getSolution(id);
        if (!aliveRef.current) return;

        // Treat 404 and "not yet ready" responses as transient.
        const notReady =
          resp.status === 404 ||
          (resp.ok &&
            resp.data &&
            typeof resp.data === "object" &&
            typeof resp.data.detail === "string" &&
            /not yet ready/i.test(resp.data.detail));

        if (notReady) {
          attempt++;
          await new Promise((r) => setTimeout(r, intervalMs));
          continue;
        }

        if (!resp.ok) {
          const reason = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
          throw new Error(`Status ${resp.status}: ${reason}`);
        }

        setResponseText(
          typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data, null, 2)
        );
        setRun("done");
        setPhase("result");
        setModelStatus("verified");
        setParamsStatus("verified");
        setStatusHint(`Solution ready (id: ${id})`);
        return;
      }

      throw new Error("Timed out waiting for solution.");
    } catch (e: any) {
      if (!aliveRef.current) return;
      setRun("error");
      setModelStatus("error");
      setParamsStatus("error");
      setStatusHint(e?.message || "Request failed.");
    }
  };

  return (
    <main
      role="main"
      aria-label="MiniZinc"
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        zIndex: 5,
        padding: "1rem",
        background: "var(--color-bg)",
        color: "var(--color-text)",
      }}
    >
      <BrandLogo />

      <div
        style={{
          display: "grid",
          justifyItems: "center",
          gap: "1rem",
          width: "min(1100px, 96vw)",
          transform: "translateY(-8vh)",
        }}
      >
        <h1 style={{ marginBottom: 8  }}>MiniZinc</h1>

      {phase === "compose" ? (
        <>
          {/* Editor view keeps model and params adjacent for quicker cross-referencing. */}
          <div
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12, // Keep editors visually linked without wasting space.
              alignItems: "stretch",
            }}
          >
            <MiniZincEditorCard
              title="Model (.mzn)"
              value={modelStr}
              onChange={setModelStr}
              status={modelStatus}
              statusHint={statusHint || undefined}
              placeholder="Write your MiniZinc model here"
              disabled={isBusy}
            />

            <MiniZincEditorCard
              title="Parameters (JSON)"
              value={paramsText}
              onChange={setParamsText}
              status={paramsStatus}
              statusHint={statusHint || undefined}
              placeholder='e.g. { "target": 199 }'
              disabled={isBusy}
            />
          </div>

          {/* Action row sticks to the bottom-right so the primary CTA mirrors reading order. */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 12,
            }}
          >
            <PillButton
              onClick={handleSend}
              className={isBusy ? "glow-pulse" : undefined}
              ariaLabel="Generate Solution"
              label={isBusy ? "Solving..." : "Generate Solution"}
              disabled={!canSend}
            />
          </div>
        </>
      ) : (
        /* Result view: show the solver response but keep editing disabled. */
        <div style={{ width: "100%" }}>
            <label style={{ display: "block", textAlign: "left", marginBottom: 6 }}>
              Solution {jobId ? `(id: ${jobId})` : ""}
            </label>
            <div style={{ height: "56vh", minHeight: 360, display: "grid" }}>
              <Textarea
                value={responseText}
                onChange={() => {}}
                readOnly
                spellCheck={false}
                style={{ height: "100%" } as React.CSSProperties}
                minRows={14}
                maxRows={30}
                width="100%"
                showStatusPill
                status="verified"
                statusHint="Fetched successfully"
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
              <button
                onClick={resetAll}
                className="btn btn--outline btn--md"
                style={{ borderRadius: 999 }}
                aria-label="New request"
              >
                New request
              </button>
            </div>
          </div>
        )}
      </div>
      <ActionBar>
        <PillButton
          to="/chat"
          ariaLabel="Go to Chat"
          label="Go to Chat"
        />
      </ActionBar>
    </main>
  );
}
