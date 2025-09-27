// src/hooks/useChatComposer.ts
import { useCallback, useRef, useState } from "react";
import { detectPddlKind, splitPddl } from "@/lib/pddl/utils";
import { convertMermaid } from "@/api/pianista/convertMermaid";
import { generateDomainFromNL } from "@/api/pianista/generateDomain";
import { savePddl, saveChatFirstInput } from "@/lib/pddlStore";
import { useNavigate } from "react-router-dom";

export type Mode = "AI" | "Mermaid" | "Domain" | "Domain+Problem";
type Status = "idle" | "verification" | "error" | "ai-thinking";

export function useChatComposer() {
  const [text, setText] = useState("");
  const [mmStatus, setMm] = useState<Status>("idle");
  const [aiStatus, setAi] = useState<Status>("idle");
  const [mmMsg, setMmMsg] = useState("");
  const [aiMsg, setAiMsg] = useState("");
  const firstSaved = useRef(false);
  const navigate = useNavigate();

  const resetIfCleared = useCallback((next: string) => {
    setText(next);
    if (next.trim() === "") { setMm("idle"); setAi("idle"); setMmMsg(""); setAiMsg(""); }
  }, []);

  const persistIfPddl = (payload: string) => {
    const kind = detectPddlKind(payload);
    if (kind === "AI") return;
    const { domain, problem } = splitPddl(payload);
    if (domain || problem) savePddl({ domain, problem });
  };

  const submit = useCallback(async (mode: Mode) => {
    const payload = text.trim();
    if (!payload) return;

    if (!firstSaved.current) {
      const inputType =
        mode === "Mermaid" ? "mermaid" :
        mode === "AI"      ? "nl"      :
        mode === "Domain"  ? "domain"  :
        mode === "Domain+Problem" ? "pddl" : "unknown";
      saveChatFirstInput(payload, inputType);
      firstSaved.current = true;
    }

    if (mode === "Domain+Problem" || mode === "Domain") {
      const { domain, problem } = splitPddl(payload);
      if (!domain && mode === "Domain+Problem" && !problem) return;
      if (!domain && mode === "Domain") return;
      savePddl({ domain, problem });
      navigate("/pddl-edit");
      return;
    }

    if (mode === "Mermaid") {
      setMm("verification");
      try {
        const res = await convertMermaid(payload, 1);
        if (res.result_status !== "success" || !res.conversion_result) {
          setMm("error"); setMmMsg(res?.message || "Mermaid conversion failed."); return;
        }
        const converted = res.conversion_result.trim();
        setText(converted);
        persistIfPddl(converted);
        setMm("idle"); setMmMsg("");
      } catch (e: any) {
        setMm("error"); setMmMsg(e?.message || "Mermaid conversion failed.");
      }
      return;
    }

    // AI
    setAi("ai-thinking");
    try {
      const res = await generateDomainFromNL(payload, { attempts: 3, generate_both: true });
      if (res.result_status !== "success" || !res.generated_domain) {
        setAi("error"); setAiMsg(res?.message || "Domain generation failed."); return;
      }
      const domain = res.generated_domain?.trim() ?? "";
      const problem = res.generated_problem?.trim() ?? "";
      const combined = problem ? `${domain}\n\n${problem}` : domain;
      setText(combined);
      persistIfPddl(combined);
      setAi("idle"); setAiMsg("");
    } catch (e: any) {
      setAi("error"); setAiMsg(e?.message || "Domain generation failed.");
    }
  }, [navigate, text]);

  const status = (mmStatus !== "idle" ? mmStatus : aiStatus !== "idle" ? aiStatus : "idle") as Status;
  const statusHint =
    mmStatus !== "idle"
      ? (mmStatus === "error" ? mmMsg : mmStatus === "verification" ? "Converting…" : undefined)
      : aiStatus !== "idle"
      ? (aiStatus === "error" ? aiMsg : aiStatus === "ai-thinking" ? "Thinking…" : undefined)
      : undefined;

  return { text, setText, resetIfCleared, submit, status, statusHint };
}
