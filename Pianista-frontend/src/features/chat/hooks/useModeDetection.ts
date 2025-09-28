import { useEffect, useRef, useState } from "react";
import { detectProcessingMode, type ProcessingMode } from "@/features/chat/lib/detectProcessingMode";

export default function useModeDetection(
  text: string,
  opts?: {
    initial?: ProcessingMode;
    autoDetect?: boolean;          // default true
    manualPriorityMs?: number;     // default 1200
    onChange?: (m: ProcessingMode, reason: "auto" | "manual") => void;
  }
) {
  const {
    initial = "AI",
    autoDetect = true,
    manualPriorityMs = 1200,
    onChange,
  } = opts || {};

  const [mode, setMode] = useState<ProcessingMode>(initial);
  const lastManualRef = useRef<number>(0);

  // manual setter (pauses auto briefly)
  const setManual = (m: ProcessingMode) => {
    setMode((prev) => (prev === m ? prev : m));
    lastManualRef.current = Date.now();
    onChange?.(m, "manual");
  };

  // auto detect on text change
  useEffect(() => {
    if (!autoDetect) return;
    const sinceManual = Date.now() - lastManualRef.current;
    if (sinceManual < manualPriorityMs) return; // respect manual override briefly

    const detected = detectProcessingMode(text);
    setMode((prev) => {
      if (prev !== detected) onChange?.(detected, "auto");
      return detected;
    });
  }, [text, autoDetect, manualPriorityMs, onChange]);

  return { mode, setManual };
}
