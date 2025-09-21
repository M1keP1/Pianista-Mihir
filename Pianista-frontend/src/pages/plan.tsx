// src/pages/plan.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import BrandLogo from "@/components/VS_BrandButton";
import PillButton from "@/components/PillButton";
import Textarea, { type TextAreaStatus } from "@/components/Inputbox/TextArea";
import ModeSlider from "@/components/Inputbox/Controls/ModeSlider";

import { getPlan } from "@/api/pianista/getPlan";
import { validatePlan } from "@/api/pianista/validatePlan";

// STORE + ADAPTER (keep these)
import { loadPlan, savePlanResult } from "@/lib/pddlStore";
import { adaptPlannerResponse, type PlanData } from "@/lib/plannerAdapter";

// Gantt that accepts PlanData directly (no planTransform)
import GanttLite from "@/components/gantt-lite";

const MESSAGE_MIN_H = 40;

export default function PlanPage() {
  const [params] = useSearchParams();
  const job = params.get("job")?.trim() || "";

  // Visible textarea: ADAPTED plan.json (pretty)
  const [planJsonText, setPlanJsonText] = useState<string>("");

  // Hidden RAW planner text (for validate & persistence)
  const [rawPlan, setRawPlan] = useState<string>("");

  const [view, setView] = useState<"raw" | "gantt">("raw");
  const [status, setStatus] = useState<TextAreaStatus>("idle");
  const [msg, setMsg] = useState<string>("");

  const abortRef = useRef<AbortController | null>(null);

  // Compute PlanData once from RAW
  const planData: PlanData = useMemo(() => {
    const adapted = adaptPlannerResponse(rawPlan || "");
    // keep textarea synced (pretty JSON) whenever RAW changes
    setPlanJsonText(JSON.stringify(adapted, null, 2));
    return adapted;
  }, [rawPlan]);

  // One-shot fetch if not in store
  const fetchOnce = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res: any = await getPlan(job, ctrl.signal);
      const statusText = String(res?.status ?? res?.result_status ?? "").toLowerCase();

      if (statusText === "success") {
        const text = (res?.plan ?? res?.result_plan ?? "").trim?.() ?? "";
        if (!text) {
          setStatus("error"); setMsg("Planner returned no plan text."); return;
        }
        setRawPlan(text);                     // keep RAW
        savePlanResult(job, text);            // persist RAW
        setStatus("verified"); setMsg("Plan ready (adapted).");
        return;
      }

      if (statusText === "failed" || statusText === "error") {
        setStatus("error"); setMsg(res?.message || "Planning failed."); return;
      }

      setStatus("error");
      setMsg("Plan is not ready yet. Please try again later.");
    } catch (e: any) {
      setStatus("error"); setMsg(e?.message || "Network error. Please try again later.");
    }
  };

  useEffect(() => {
    if (!job) {
      setStatus("error"); setMsg("Missing plan job id. Generate a plan first.");
      return;
    }

    // fast path: store
    const rec = loadPlan(job);
    if (rec?.plan?.trim()) {
      const text = rec.plan.trim();
      setRawPlan(text);                       // triggers adapter + textarea sync
      setStatus("verified"); setMsg("Plan ready (adapted).");
      return;
    }

    // otherwise fetch once
    setStatus("ai-thinking"); setMsg("Fetching plan…");
    fetchOnce();

    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  // Validate using RAW (not the adapted JSON)
  const validateNow = async () => {
    const current = rawPlan.trim();
    if (!current) { setStatus("error"); setMsg("Plan is empty."); return; }

    const rec = loadPlan(job);
    const domain = rec?.domain?.trim() || "";
    const problem = rec?.problem?.trim() || "";
    if (!domain || !problem) { setStatus("error"); setMsg("Missing domain/problem for validation."); return; }

    setStatus("verification"); setMsg("Validating plan…");
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const res = await validatePlan(domain, problem, current, ctrl.signal);
      if (res.result === "success") {
        setStatus("verified"); setMsg(res.message || "Plan is valid.");
        savePlanResult(job, current); // persist RAW
      } else {
        setStatus("error"); setMsg(res.message || "Plan is NOT valid.");
      }
    } catch (e: any) {
      setStatus("error"); setMsg(e?.message || "Validation failed.");
    }
  };

  const backToEditor = job ? `/pddl-edit?job=${encodeURIComponent(job)}` : "/pddl-edit";

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
        padding: "1rem",
        paddingBottom: "72px",
      }}
    >
      <BrandLogo />

      {/* Content */}
      <div style={{ display: "grid", gap: "1rem", width: "min(1160px, 92vw)" }}>
        {/* Plan Container - matches PDDL edit page structure */}
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
          {/* Header - same structure as domain/problem containers */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderBottom: "1px solid var(--color-border-muted)",
              background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-bg))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span 
                aria-hidden 
                style={{ 
                  width: 10, 
                  height: 10, 
                  borderRadius: 999, 
                  background: "color-mix(in srgb, var(--color-accent) 70%, #8b5cf6)" 
                }} 
              />
              <strong>Plan Viewer</strong>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ModeSlider<"raw" | "gantt">
                value={view}
                onChange={setView}
                modes={[
                  { key: "raw", short: "Raw", full: "Raw JSON Plan" },
                  { key: "gantt", short: "Gantt", full: "Gantt Timeline" },
                ]}
                size="xs"
                aria-label="Plan view mode"
              />
{view === "raw" && (
                <PillButton 
                  onClick={validateNow} 
                  label="Validate" 
                  ariaLabel="Validate current plan"
                  disabled={!rawPlan.trim()}
                />
              )}
            </div>
          </div>



          {/* Content Body */}
          <div style={{ position: "relative", padding: 10, minHeight: "400px" }}>
            {/* RAW tab shows ADAPTED plan.json */}
            {view === "raw" && (
              <Textarea
                value={planJsonText}
                onChange={setPlanJsonText}
                onSubmit={validateNow}
                placeholder="Waiting for plan…"
                height="55vh"
                autoResize={false}
                showStatusPill
                status={status}
                statusPillPlacement="top-right"
                statusHint={msg || undefined}
              />
            )}

            {/* Gantt tab renders directly from PlanData */}
            {view === "gantt" && rawPlan.trim() && (
              <div style={{ 
                height: "55vh",
                minHeight: "400px",
                border: "1px solid var(--color-border-muted)",
                borderRadius: "10px",
                background: "var(--color-surface)",
                boxShadow: "0 1px 4px var(--color-shadow) inset",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column"
              }}>
                <GanttLite
                  planData={planData}
                  timeUnit="hour"
                  boxed={false}
                  laneColumnWidth={220}
                  rowHeight={28}
                  pxPerUnitInitial={80}
                  height={400}
                />
              </div>
            )}

            {/* Empty state for gantt when no plan */}
            {view === "gantt" && !rawPlan.trim() && (
              <div style={{
                height: "55vh",
                minHeight: "400px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-secondary)",
                fontSize: "0.9rem"
              }}>
                No plan data available for timeline view
              </div>
            )}

            <div className="field-hint">
              {view === "raw" 
                ? "Hint: This shows the adapted JSON structure from the raw planner output." 
                : "Hint: Timeline visualization of plan execution across different agents/satellites."
              }
            </div>
          </div>
        </section>

        {/* Spacer for fixed footer */}
        <div aria-hidden style={{ height: 56 }} />
      </div>
    </main>
  );
}