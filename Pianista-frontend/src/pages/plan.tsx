// src/pages/plan.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import PillButton from "@/components/PillButton";
import Textarea, { type TextAreaStatus } from "@/components/Inputbox/TextArea";
import ModeSlider from "@/components/Inputbox/Controls/ModeSlider";

import { getPlan } from "@/api/pianista/getPlan";
import { validatePlan } from "@/api/pianista/validatePlan";

// STORE + ADAPTER
import {
  loadPlan,
  savePlanResult,
  loadPlanAdapted,
  savePlanAdapted,
  subscribePlanAdapted,
} from "@/lib/pddlStore";
import { adaptPlannerResponse, type PlanData } from "@/lib/plannerAdapter";

import GanttLite from "@/components/gantt-lite";

export default function PlanPage() {
  const [params] = useSearchParams();
  const job = params.get("job")?.trim() || "";

  // Visible JSON editor (adapted plan)
  const [planJsonText, setPlanJsonText] = useState<string>("");

  // RAW planner text (for fetch/validate/persist)
  const [rawPlan, setRawPlan] = useState<string>("");

  const [view, setView] = useState<"raw" | "json" | "gantt">("gantt");
  const [status, setStatus] = useState<TextAreaStatus>("idle");
  const [msg, setMsg] = useState<string>("");

  // Live sources for Gantt
  const [planFromStore, setPlanFromStore] = useState<PlanData | null>(null);
  const [planParsed, setPlanParsed] = useState<PlanData | null>(null);

  // Debouncers + abort controller
  const saveRawDeb = useRef<number | null>(null);
  const saveJsonDeb = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // --- Compute PlanData from RAW (fallback source) ---
  const planFromRaw: PlanData = useMemo(() => {
    try {
      return adaptPlannerResponse(rawPlan || "");
    } catch {
      return { plan: [], metrics: {} as any };
    }
  }, [rawPlan]);

  // Keep JSON editor synced when RAW changes (without clobbering user edits)
  useEffect(() => {
    const pretty = JSON.stringify(planFromRaw, null, 2);
    setPlanJsonText((prev) => {
      try {
        const current = JSON.parse(prev);
        if (JSON.stringify(current) === JSON.stringify(planFromRaw)) return prev;
      } catch {}
      return pretty;
    });
  }, [planFromRaw]);

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
          setStatus("error");
          setMsg("Planner returned no plan text.");
          return;
        }
        setRawPlan(text); // update RAW → sync JSON via effect
        savePlanResult(job, text); // persist RAW
        try {
          savePlanAdapted(job, adaptPlannerResponse(text));
        } catch {}
        setStatus("verified");
        setMsg("Plan ready (adapted).");
        return;
      }

      if (statusText === "failed" || statusText === "error") {
        setStatus("error");
        setMsg(res?.message || "Planning failed.");
        return;
      }

      setStatus("error");
      setMsg("Plan is not ready yet. Please try again later.");
    } catch (e: any) {
      setStatus("error");
      setMsg(e?.message || "Network error. Please try again later.");
    }
  };

  // Initial load: store → fetch
  useEffect(() => {
    if (!job) {
      setStatus("error");
      setMsg("Missing plan job id. Generate a plan first.");
      return;
    }

    // 1) Try adapted JSON from store
    try {
      const stored = loadPlanAdapted?.(job) as PlanData | null;
      if (stored && stored.plan) {
        setPlanFromStore(stored);
        setPlanJsonText(JSON.stringify(stored, null, 2));
      }
    } catch {}

    // 2) Try RAW from store (still needed for validation & as fallback)
    try {
      const rec: any = loadPlan?.(job);
      if (rec?.plan?.trim()) {
        const text = rec.plan.trim();
        setRawPlan(text);
        setStatus("verified");
        setMsg("Plan ready (adapted).");
      } else {
        setStatus("ai-thinking");
        setMsg("Fetching plan…");
        fetchOnce();
      }
    } catch {
      setStatus("ai-thinking");
      setMsg("Fetching plan…");
      fetchOnce();
    }

    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  // Subscribe to adapted-plan store updates (cross-tab / other components)
  useEffect(() => {
    if (!job) return;
    const unsub = subscribePlanAdapted?.(job, (pd: any) => {
      if (!pd) return;
      setPlanFromStore(pd as PlanData);
      // keep JSON editor in sync unless it already matches
      setPlanJsonText((prev) => {
        try {
          const cur = JSON.parse(prev);
          if (JSON.stringify(cur) === JSON.stringify(pd)) return prev;
        } catch {}
        return JSON.stringify(pd, null, 2);
      });
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [job]);

  // Persist RAW + its adapted form (debounced) whenever RAW changes
  useEffect(() => {
    if (!job) return;
    if (saveRawDeb.current) window.clearTimeout(saveRawDeb.current);
    saveRawDeb.current = window.setTimeout(() => {
      try {
        savePlanResult?.(job, rawPlan);
      } catch {}
      try {
        savePlanAdapted?.(job, planFromRaw as any);
      } catch {}
    }, 250) as unknown as number;
    return () => {
      if (saveRawDeb.current) {
        window.clearTimeout(saveRawDeb.current);
        saveRawDeb.current = null;
      }
    };
  }, [job, rawPlan, planFromRaw]);

  // Live-parse JSON editor; persist adapted (debounced)
  useEffect(() => {
    if (!job) return;
    try {
      const obj = JSON.parse(planJsonText);
      if (obj && Array.isArray(obj.plan)) {
        setPlanParsed(obj);
        if (saveJsonDeb.current) window.clearTimeout(saveJsonDeb.current);
        saveJsonDeb.current = window.setTimeout(() => {
          try {
            savePlanAdapted?.(job, obj);
          } catch {}
        }, 300) as unknown as number;
      }
    } catch {
      // ignore invalid JSON while typing
    }
    return () => {
      if (saveJsonDeb.current) {
        window.clearTimeout(saveJsonDeb.current);
        saveJsonDeb.current = null;
      }
    };
  }, [planJsonText, job]);

  // Source-of-truth preference for Gantt
  const planForGantt: PlanData = useMemo(() => {
    return planFromStore ?? planParsed ?? planFromRaw;
  }, [planFromStore, planParsed, planFromRaw]);

  // Validate using RAW (not the adapted JSON)
  const validateNow = async () => {
    const current = rawPlan.trim();
    if (!current) {
      setStatus("error");
      setMsg("Plan is empty.");
      return;
    }

    const rec = loadPlan(job);
    const domain = rec?.domain?.trim() || "";
    const problem = rec?.problem?.trim() || "";
    if (!domain || !problem) {
      setStatus("error");
      setMsg("Missing domain/problem for validation.");
      return;
    }

    setStatus("verification");
    setMsg("Validating plan…");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await validatePlan(domain, problem, current, ctrl.signal);
      if ((res as any).result === "success") {
        setStatus("verified");
        setMsg((res as any).message || "Plan is valid.");
        savePlanResult(job, current); // persist RAW
      } else {
        setStatus("error");
        setMsg((res as any).message || "Plan is NOT valid.");
      }
    } catch (e: any) {
      setStatus("error");
      setMsg(e?.message || "Validation failed.");
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
        padding: "12px 12px 84px 12px", // extra bottom padding for fixed footer
      }}
    >
          <style>{`
      /* Force the Raw editor to fully fill its container */
      .raw-fill-abs { position: relative; flex: 1; min-height: 0; }
      .raw-fill-abs > .abs { position: absolute; inset: 0; display: flex; }
      .raw-fill-abs textarea { height: 100% !important; }
      `}</style>



      {/* Content (wider & taller than before) */}
      <div style={{ display: "grid", gap: "12px", width: "min(1400px, 96vw)" }}>
        {/* Plan Container */}
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
          {/* Header */}
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
            {/* Title (left) */}
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
              <ModeSlider<"raw" | "json" | "gantt">
                value={view}
                onChange={setView}
                modes={[
                  { key: "raw",  short: "Raw",  full: "Planner Response (RAW)" },
                  { key: "json", short: "JSON", full: "Adapted Plan (JSON)" },
                  { key: "gantt", short: "Gantt", full: "Gantt Timeline" },
                ]}
                size="xs"
                aria-label="Plan view mode"
              />
            </div>

          </div>

          {/* Body */}
          <div style={{ position: "relative", padding: 10, minHeight: 520 }}>
          {view === "raw" && (
            <div style={{
              height: "70vh",
              minHeight: 520,
              border: "1px solid var(--color-border-muted)",
              borderRadius: 10,
              background: "var(--color-surface)",
              boxShadow: "0 1px 4px var(--color-shadow) inset",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}>
              <div className="raw-fill-abs">
                <div className="abs">
                  <Textarea
                    value={rawPlan}                 // ← RESPONSE here
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
                      fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace)"
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          {view === "json" && (
          <div style={{
            height: "70vh",
            minHeight: 520,
            border: "1px solid var(--color-border-muted)",
            borderRadius: 10,
            background: "var(--color-surface)",
            boxShadow: "0 1px 4px var(--color-shadow) inset",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            <div className="raw-fill-abs">
              <div className="abs">
                <Textarea
                  value={planJsonText}            // ← ADAPTED JSON here
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
                    fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace)"
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
            {view === "raw"  && "Hint: Planner response (RAW). Editing this updates the adapted JSON and Gantt."}
            {view === "json" && "Hint: Adapted Plan (JSON). Editing this updates the Gantt and persists."}
            {view === "gantt" && "Hint: Timeline visualization of plan execution across different agents/satellites."}
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
