// src/pages/plan.tsx
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BrandLogo from "@/components/VS_BrandButton";
import PillButton from "@/components/PillButton";
import Textarea, { type TextAreaStatus } from "@/components/Inputbox/TextArea";
import { getPlan } from "@/api/pianista/getPlan";

const MESSAGE_MIN_H = 40;
const RETRIES = 3;         // tiny safety net
const RETRY_DELAY = 2000;  // 2s between quick retries

export default function PlanPage() {
  const [params] = useSearchParams();
  const job = params.get("job")?.trim() || "";

  const [status, setStatus] = useState<TextAreaStatus>("idle");
  const [msg, setMsg] = useState("");
  const [plan, setPlan] = useState("");

  const tries = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchOnce() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await getPlan(job, ctrl.signal);
      const s = String(res.status).toLowerCase();

      if (s === "success" && res.plan?.trim()) {
        setPlan(res.plan.trim());
        setStatus("verified");
        setMsg("Plan ready.");
        return;
      }
      if (s === "failure") {
        setStatus("error");
        setMsg(res.message || "Planning failed.");
        return;
      }
      // Rare: backend returned 202/running even though we only navigate on success.
      if (tries.current < RETRIES) {
        tries.current += 1;
        setStatus("ai-thinking");
        setMsg(res.message || "Finalizing plan…");
        retryTimer.current = setTimeout(fetchOnce, RETRY_DELAY);
      } else {
        setStatus("error");
        setMsg("Plan not ready yet. Please retry.");
      }
    } catch (e: any) {
      if (tries.current < RETRIES) {
        tries.current += 1;
        setStatus("ai-thinking");
        setMsg(e?.message || "Still working…");
        retryTimer.current = setTimeout(fetchOnce, RETRY_DELAY);
      } else {
        setStatus("error");
        setMsg(e?.message || "Network error. Please retry.");
      }
    }
  }

  useEffect(() => {
    if (!job) {
      setStatus("error");
      setMsg("Missing plan job id. Go back and generate a plan first.");
      return;
    }
    setStatus("ai-thinking");
    setMsg("Fetching plan…");
    fetchOnce();

    return () => {
      abortRef.current?.abort();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [job]);

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
      <div
        style={{
          position: "absolute",
          bottom: "calc(1rem + 42px + 0.75rem)",
          left: "1rem",
          zIndex: 9,
        }}
      >
        <PillButton to="/pddl-edit" label="<- Back to Editor" />
      </div>

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
                style={{ width: 10, height: 10, borderRadius: 999, background: "var(--color-accent)" }}
              />
              <strong>Plan (raw)</strong>
            </div>
          </div>

          <Textarea
            value={plan}
            onChange={() => {}}
            placeholder="Waiting for plan…"
            height="55vh"
            autoResize={false}
            showStatusPill
            status={status}
            statusPillPlacement="top-right"
          />

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

          {status === "error" && job && (
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <PillButton onClick={() => { tries.current = 0; fetchOnce(); }} label="Retry" />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
