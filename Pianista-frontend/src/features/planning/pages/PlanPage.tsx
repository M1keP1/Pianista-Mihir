/** Plan viewer that toggles between raw output, JSON, and timeline views. */
import { useSearchParams } from "react-router-dom";

import PillButton from "@/shared/components/PillButton";
import Textarea from "@/shared/components/Inputbox/TextArea";
import ModeSlider from "@/shared/components/Inputbox/Controls/ModeSlider";

import GanttLite from "@/features/planning/components/GanttLite";
import { usePlanData } from "@/features/planning/hooks/usePlanData";
import { usePlanView } from "@/features/planning/hooks/usePlanView";

type PlanView = "raw" | "json" | "gantt";

export default function PlanPage() {
  const [params] = useSearchParams();
  const job = params.get("job")?.trim() || "";

  const {
    rawPlan,
    setRawPlan,
    planJsonText,
    setPlanJsonText,
    status,
    msg,
    planForGantt,
    validateNow,
    backToEditor,
  } = usePlanData(job);

  const { view, setView } = usePlanView();

  return (
    <main
      role="main"
      aria-label="Plan viewer"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        padding: "12px 12px 84px 12px", // extra bottom padding for fixed footer
      }}
    >
      <style>{`
      /* Force the Raw editor to fully fill its container */
      .raw-fill-abs { position: relative; flex: 1; min-height: 0; }
      .raw-fill-abs > .abs { position: absolute; inset: 0; display: flex; }
      .raw-fill-abs textarea { height: 100% !important; }
      `}</style>

      {/* Content rail stays wide so the Gantt timeline has breathing room. */}
      <div style={{ display: "grid", gap: "12px", width: "min(1400px, 96vw)" }}>
        {/* Card container keeps all plan views aligned under a common header. */}
        <section
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-muted)",
            borderRadius: 12,
            padding: 0,
            boxShadow: "0 1.5px 10px var(--color-shadow)",
            overflow: "hidden",
          }}
        >
          {/* Header hosts the mode picker and status affordances. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderBottom: "1px solid var(--color-border-muted)",
              background:
                "color-mix(in srgb, var(--color-surface) 88%, var(--color-bg))",
            }}
          >
            {/* Title cluster includes a subtle status dot for visual context. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background:
                    "color-mix(in srgb, var(--color-accent) 70%, #8b5cf6)",
                }}
              />
              <strong>Plan Viewer</strong>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {view === "raw" && (
                <PillButton
                  onClick={validateNow}
                  label="Validate"
                  ariaLabel="Validate current plan"
                  disabled={!rawPlan.trim()}
                />
              )}
              <ModeSlider<PlanView>
                value={view}
                onChange={setView}
                modes={[
                  { key: "raw", short: "Raw", full: "Planner Response (RAW)" },
                  { key: "json", short: "JSON", full: "Adapted Plan (JSON)" },
                  { key: "gantt", short: "Gantt", full: "Gantt Timeline" },
                ]}
                size="xs"
                aria-label="Plan view mode"
              />
            </div>
          </div>

          {/* Body area swaps between whichever view the user selects. */}
          <div style={{ position: "relative", padding: 10, minHeight: 520 }}>
            {view === "raw" && (
              <div
                style={{
                  height: "70vh",
                  minHeight: 520,
                  border: "1px solid var(--color-border-muted)",
                  borderRadius: 10,
                  background: "var(--color-surface)",
                  boxShadow: "0 1px 4px var(--color-shadow) inset",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="raw-fill-abs">
                  <div className="abs">
                    <Textarea
                      value={rawPlan}
                      onChange={setRawPlan}
                      onSubmit={validateNow}
                      placeholder="Fast Downward SequentialPlan:\n    communicate(s1, gs1)\n    ..."
                      autoResize={false}
                      height="100%"
                      showStatusPill
                      data-themed-scroll
                      status={status}
                      statusPillPlacement="top-right"
                      statusHint={msg || undefined}
                      style={{
                        flex: 1,
                        width: "100%",
                        height: "100%",
                        border: "none",
                        borderRadius: 0,
                        outline: "none",
                        overflow: "auto",
                        background: "transparent",
                        padding: 12,
                        fontFamily:
                          "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace)",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            {view === "json" && (
              <div
                style={{
                  height: "70vh",
                  minHeight: 520,
                  border: "1px solid var(--color-border-muted)",
                  borderRadius: 10,
                  background: "var(--color-surface)",
                  boxShadow: "0 1px 4px var(--color-shadow) inset",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="raw-fill-abs">
                  <div className="abs">
                    <Textarea
                      value={planJsonText}
                      onChange={setPlanJsonText}
                      onSubmit={validateNow}
                      placeholder='{"plan":[{"action":"communicate","args":["s1","gs1"],"start":0,"duration":2}], "metrics":{}}'
                      autoResize={false}
                      showStatusPill
                      status={status}
                      data-themed-scroll
                      statusPillPlacement="top-right"
                      statusHint={msg || undefined}
                      style={{
                        flex: 1,
                        width: "100%",
                        height: "100%",
                        border: "none",
                        borderRadius: 0,
                        outline: "none",
                        overflow: "auto",
                        background: "transparent",
                        padding: 12,
                        fontFamily:
                          "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace)",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Gantt tab renders from the freshest source — taller now */}
            {view === "gantt" && (planForGantt?.plan?.length ?? 0) > 0 && (
              <div
                style={{
                  height: "70vh",
                  minHeight: 520,
                  border: "1px solid var(--color-border-muted)",
                  borderRadius: "10px",
                  background: "var(--color-surface)",
                  boxShadow: "0 1px 4px var(--color-shadow) inset",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <GanttLite
                  planData={planForGantt}
                  timeUnit="hour"
                  boxed={false}
                  laneColumnWidth={220}
                  rowHeight={28}
                  pxPerUnitInitial={80}
                />
              </div>
            )}

            {/* Empty state for gantt when no plan */}
            {view === "gantt" && !((planForGantt?.plan?.length ?? 0) > 0) && (
              <div
                style={{
                  height: "70vh",
                  minHeight: 520,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-text-secondary)",
                  fontSize: "0.9rem",
                }}
              >
                No plan data available for timeline view
              </div>
            )}

            <div className="field-hint" style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
              {view === "raw" &&
                "Hint: Planner response (RAW). Editing this updates the adapted JSON and Gantt."}
              {view === "json" &&
                "Hint: Adapted Plan (JSON). Editing this updates the Gantt and persists."}
              {view === "gantt" &&
                "Hint: Timeline visualization of plan execution across different agents/satellites."}
            </div>
          </div>
        </section>

        {/* Spacer under content (footer is fixed) */}
        <div aria-hidden style={{ height: 8 }} />
      </div>

      {/* Fixed Footer with left-aligned Back button */}
      <div
        style={{
          width: "min(1400px, 96vw)",
          margin: "0 auto",
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <PillButton
          to={backToEditor}
          ariaLabel="Back to PDDL editor"
          label="Back to PDDL"
          leftIcon={<span aria-hidden>←</span>}
        />
      </div>
    </main>
  );
}
