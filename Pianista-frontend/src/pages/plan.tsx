// src/pages/plan.tsx
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import BrandLogo from "@/components/VS_BrandButton";
import PillButton from "@/components/PillButton";
import Textarea, { type TextAreaStatus } from "@/components/Inputbox/TextArea";

import { getPlan } from "@/api/pianista/getPlan";
import { validatePlan } from "@/api/pianista/validatePlan";

import { loadPlan, savePlanResult } from "@/lib/pddlStore";

/* -----------------------------------------------------------------------------
 * Plan Page
 * - Displays the raw plan for a given job (?job=...)
 * - Lets the user edit the plan text and validate it against stored domain/problem
 * - If plan isn’t in the store yet, performs a single fetch attempt
 * --------------------------------------------------------------------------- */

const MESSAGE_MIN_H = 40;

export default function PlanPage() {
  /* --------------------------------- Routing -------------------------------- */
  const [params] = useSearchParams();
  const job = params.get("job")?.trim() || "";

  /* --------------------------------- State ---------------------------------- */
  const [plan, setPlan] = useState<string>("");
  const [status, setStatus] = useState<TextAreaStatus>("idle");
  const [msg, setMsg] = useState<string>("");

  /* ------------------------------ Abort control ----------------------------- */
  const abortRef = useRef<AbortController | null>(null);

  /* ------------------------------- Fetch (once) ----------------------------- */
  const fetchOnce = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res: any = await getPlan(job, ctrl.signal);
      const statusText = String(res?.status ?? res?.result_status ?? "").toLowerCase();

      if (statusText === "success") {
        // plan may be in res.plan or res.result_plan
        const text = (res?.plan ?? res?.result_plan ?? "").trim?.() ?? "";
        if (text) {
          setPlan(text);
          setStatus("verified");
          setMsg("Plan ready.");
          savePlanResult(job, text);
          return;
        }
        // success but no plan text
        setStatus("error");
        setMsg("Plan ready, but empty response.");
        return;
      }

      if (statusText === "failure") {
        setStatus("error");
        setMsg(res?.message || "Planning failed.");
        return;
      }

      // queued / running / unknown state — no retries, just inform
      setStatus("error");
      setMsg("Plan is not ready yet. Please try again later.");
    } catch (e: any) {
      setStatus("error");
      setMsg(e?.message || "Network error. Please try again later.");
    }
  };

  /* ---------------------------------- Init ---------------------------------- */
  useEffect(() => {
    if (!job) {
      setStatus("error");
      setMsg("Missing plan job id. Generate a plan from the editor first.");
      return;
    }

    // Fast path: load from store if present
    const rec = loadPlan(job);
    if (rec?.plan?.trim()) {
      setPlan(rec.plan.trim());
      setStatus("verified");
      setMsg("Plan ready.");
      return;
    }

    // Otherwise, try a single fetch
    setStatus("ai-thinking");
    setMsg("Fetching plan…");
    fetchOnce();

    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  /* ---------------------------- Validate (manual) ---------------------------- */
  const validateNow = async () => {
    const current = plan.trim();
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
      if (res.result === "success") {
        setStatus("verified");
        setMsg(res.message || "Plan is valid.");
        // Persist the edited plan text
        savePlanResult(job, current);
      } else {
        setStatus("error");
        setMsg(res.message || "Plan is NOT valid.");
      }
    } catch (e: any) {
      setStatus("error");
      setMsg(e?.message || "Validation failed.");
    }
  };

  /* ---------------------------------- UI ------------------------------------ */
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
        paddingBottom: "72px", // breathing room near footer
      }}
    >
      {/* Brand (top-left) */}
      <BrandLogo />

      {/* Back to Editor */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(1rem + 42px + 0.75rem)",
          left: "1rem",
          zIndex: 9,
        }}
      >
        <PillButton to={backToEditor} label="<- Back to Editor" />
      </div>

      {/* Content */}
      <div style={{ display: "grid", gap: "1rem", width: "min(1160px, 92vw)" }}>
        <section
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-muted)",
            borderRadius: 12,
            padding: 14,
            boxShadow: "0 1.5px 10px var(--color-shadow)",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "var(--color-accent)",
                }}
              />
              <strong>Plan (raw)</strong>
            </div>

            {/* Validate button only when there is content */}
            {plan.trim() && (
              <PillButton onClick={validateNow} label="Validate Plan" ariaLabel="Validate current plan text" />
            )}
          </div>

          {/* Editable plan textarea */}
          <Textarea
            value={plan}
            onChange={setPlan}
            onSubmit={validateNow} // Cmd/Ctrl + Enter to validate
            placeholder="Waiting for plan…"
            height="55vh"
            autoResize={false}
            showStatusPill
            status={status} // 'idle' | 'verification' | 'verified' | 'ai-thinking' | 'error'
            statusPillPlacement="top-right"
          />

          {/* Message (reserved height to avoid layout shift) */}
          <div
            style={{
              minHeight: MESSAGE_MIN_H,
              marginTop: 8,
              fontSize: ".85rem",
              opacity: msg ? 0.9 : 0,
              color:
                status === "verified"
                  ? "var(--color-success, #16a34a)"
                  : status === "error"
                  ? "var(--color-danger, #dc2626)"
                  : "var(--color-text-muted)",
              transition: "opacity 120ms ease",
            }}
          >
            {msg || " "}
          </div>
        </section>
      </div>
    </main>
  );
}
