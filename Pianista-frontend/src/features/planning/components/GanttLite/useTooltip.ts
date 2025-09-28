import { useCallback, useState } from "react";
import type { ProcessedTask, TimeUnit } from "./processing";

type TooltipState = { x: number; y: number; html: string } | null;

type UseTooltipOptions = {
  enabled: boolean;
  timeUnit: TimeUnit;
};

export const useTooltip = ({ enabled, timeUnit }: UseTooltipOptions) => {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tip, setTip] = useState<TooltipState>(null);

  const onEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>, tk: ProcessedTask) => {
      setHoverId(tk.id);
      if (!enabled) return;

      const targetEl = e.currentTarget as HTMLElement;
      const barRect = targetEl.getBoundingClientRect();

      const offset = 12;
      const baseX = barRect.right + offset;
      const baseY = barRect.top + barRect.height / 2;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 12;

      const preferredX = baseX > vw - 180 ? barRect.left - offset : baseX;
      const x = Math.max(margin, Math.min(preferredX, vw - margin));
      const y = Math.max(margin, Math.min(baseY, vh - margin));

      const duration = tk.end - tk.start;
      const title = `${tk.action}${tk.target ? " → " + tk.target : ""}`;
      const sub = `${tk.start}–${tk.end} ${timeUnit} • Δ${duration}`;

      const html =
        `<div style="font-weight:600">${title}</div>` +
        `<div style="opacity:.8;font-size:11px;line-height:1.2">${sub}</div>`;

      setTip({ x, y, html });
    },
    [enabled, timeUnit]
  );

  const onLeave = useCallback(() => {
    setHoverId(null);
    setTip(null);
  }, []);

  return { hoverId, tip, onEnter, onLeave };
};

export type UseTooltipResult = ReturnType<typeof useTooltip>;
