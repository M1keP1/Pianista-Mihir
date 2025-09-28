// src/components/gantt-lite.tsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import GanttHeader from "./GanttHeader";
import GanttLegend from "./GanttLegend";
import { useTooltip } from "./useTooltip";
import type { PlanData, TimeUnit } from "./processing";
import { clamp, R, ceil, floor, colorFor, textOn, useProcessedPlan } from "./processing";

type GanttLiteProps = {
  planData: PlanData;
  timeUnit?: TimeUnit;
  /** If omitted, fills parent container. */
  height?: number;
  laneColumnWidth?: number;
  rowHeight?: number;
  pxPerUnitInitial?: number;
  showLegend?: boolean;
  showRuler?: boolean;
  showTooltips?: boolean;
  /** Card chrome on/off (default = on). */
  boxed?: boolean;
  className?: string;
};

const HEADER_SPACER = 20;   // space above rows for lane names
const ROW_INSET = 0;        // 1px inside rails to avoid bleed
const COL_INSET = 2;        // 2px inside time dividers for safety

const GanttLite: React.FC<GanttLiteProps> = ({
  planData,
  timeUnit = "hour",
  height,
  laneColumnWidth = 220,
  rowHeight = 40,
  pxPerUnitInitial = 64,
  showLegend = true,
  showRuler = true,
  showTooltips = true,
  boxed = true,
  className = "",
}) => {
  const processed = useProcessedPlan(planData);
  const [pxPerUnit, setPxPerUnit] = useState(pxPerUnitInitial);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  const { hoverId, tip, onEnter, onLeave } = useTooltip({ enabled: showTooltips, timeUnit });

  // geometry helpers (shared)
  const xSnap = useCallback((t: number) => R(t * pxPerUnit), [pxPerUnit]);
  const rowTop    = useCallback((rowIdx: number) => R(HEADER_SPACER + rowIdx * rowHeight), [rowHeight]);
  const rowBottom = useCallback((rowIdx: number) => R(HEADER_SPACER + (rowIdx + 1) * rowHeight), [rowHeight]);
  const contentWidth = useMemo(() => R(Math.max(1, Math.ceil(processed.maxDuration)) * pxPerUnit), [processed.maxDuration, pxPerUnit]);

  const barBox = useCallback((start: number, duration: number) => {
    const x0r = start * pxPerUnit;
    const x1r = (start + duration) * pxPerUnit;
    const left  = clamp(ceil(x0r) + COL_INSET, 0, contentWidth);
    const right = clamp(floor(x1r) - COL_INSET, 0, contentWidth);
    const width = Math.max(1, right - left);
    return { left, right, width };
  }, [pxPerUnit, contentWidth]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
      el.scrollLeft += e.deltaX || e.deltaY;
      e.preventDefault();
    }
  }, []);

  const zoomIn = () => setPxPerUnit((v) => clamp(R(v * 1.25), 8, 256));
  const zoomOut = () => setPxPerUnit((v) => clamp(R(v / 1.25), 8, 256));

  const ticks = useMemo(() => {
    const max = Math.max(0, Math.ceil(processed.maxDuration));
    return Array.from({ length: max + 1 }, (_, i) => i);
  }, [processed.maxDuration]);

  // action → color map (for legend too)
  const actionColors = useMemo(() => {
    const set = new Set(processed.lanes.flatMap(l => l.tasks.map(t => t.action)));
    const map = new Map<string, string>();
    for (const a of set) map.set(a, colorFor(a));
    return map;
  }, [processed]);

  const wrapStyle: React.CSSProperties = boxed
    ? { borderRadius: 12, border: "1px solid var(--color-border-muted)", background: "var(--color-surface)" }
    : { borderRadius: 0, border: "none", background: "transparent" };

  const timelineHeaderStyle: React.CSSProperties = boxed
    ? { borderBottom: "1px solid var(--color-border-muted)", background: "var(--color-surface-bridge)" }
    : { borderBottom: "none", background: "transparent" };

  const onTimelineScroll = () => {
    const r = scrollRef.current;
    const l = lanesRef.current;
    if (!r || !l || syncingRef.current) return;
    syncingRef.current = true;
    l.scrollTop = r.scrollTop;
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  };

  const onLanesScroll = () => {
    const r = scrollRef.current;
    const l = lanesRef.current;
    if (!r || !l || syncingRef.current) return;
    syncingRef.current = true;
    r.scrollTop = l.scrollTop;
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  };


  return (
    <div
      className={className}
      style={{
        height: typeof height === "number" ? height : "100%",
        width: "100%",
        minHeight: 0, minWidth: 0, boxSizing: "border-box",
        color: "var(--color-text)",
        display: "flex", flexDirection: "column", overflow: "hidden", flex: 1,
        ...wrapStyle,
      }}
    >
      <GanttHeader
        planner={planData.metrics?.planner}
        boxed={boxed}
        pxPerUnit={pxPerUnit}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onPxPerUnitChange={(value) => setPxPerUnit(value)}
      />

      {/* Body */}
      <div style={{ display: "grid", gridTemplateColumns: `${laneColumnWidth}px 1fr`, minHeight: 0, flex: 1 }}>
        {/* LHS lanes (rails aligned to timeline) */}
        <div
        ref={lanesRef}
        onScroll={onLanesScroll}
        data-themed-scroll
        style={{ overflowY: "auto", overflowX: "hidden", borderRight: "1px solid var(--color-border-muted)", background: "transparent", minHeight: 0 }}
        >

          {showRuler && <div style={{ height: 36 }} />} {/* ruler spacer */}
          {processed.lanes.map((lane) => {
            const laneTotalH = HEADER_SPACER + lane.maxRows * rowHeight;
            return (
              <div key={lane.name} style={{ position: "relative", height: laneTotalH, borderBottom: "1px dashed var(--color-border-muted)" }}>
                {/* lane label */}
                <div
                  style={{
                    position: "absolute", top: "50%", left: 10, right: 10,
transform: "translateY(-50%)",
                    fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}
                  title={lane.name}
                >
                  {lane.name}
                </div>

                {/* horizontal rails */}
                {/* rails (skip r=0 to remove the top line above the lane) */}
                {Array.from({ length: lane.maxRows }).map((_, i) => {
                const r = i + 1; // 1..maxRows
                return (
                    <div
                    key={r}
                    style={{
                        position: "absolute", left: 0, right: 0,
                        top: rowTop(r), height: 1,
                        background: "var(--color-border-muted)",
                        pointerEvents: "none",
                    }}
                    />
                );
                })}

              </div>
            );
          })}
        </div>

        {/* Timeline */}
        <div
        ref={scrollRef}
        onWheel={onWheel}
        onScroll={onTimelineScroll}
        data-themed-scroll
        style={{ position: "relative", overflow: "auto", background: "transparent", minHeight: 0, contain: "layout paint" }}
        >

          {/* Ruler */}
          {showRuler && (
            <div style={{ position: "sticky", top: 0, zIndex: 3, ...timelineHeaderStyle }}>
              <div style={{ position: "relative", height: 36, width: contentWidth }}>
                {ticks.map((t) => {
                  const x = xSnap(t);
                  return (
                    <div key={t} style={{ position: "absolute", left: x, top: 0, height: "100%" }}>
                      <div style={{ position: "absolute", top: 18, width: 1, height: 18, background: "color-mix(in srgb, var(--color-text-secondary) 55%, transparent)" }} />
                      <div style={{ position: "absolute", top: 2, transform: "translateX(-10%)", fontSize: 11, color: "var(--color-text-secondary)" }}>
                        {t}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rows + bars */}
          <div style={{ position: "relative" }}>
            {/* vertical grid */}
            <div style={{ position: "absolute", inset: 0, width: contentWidth, zIndex: 0 }}>
              {ticks.map((t) => {
                const x = xSnap(t);
                return (
                  <div
                    key={`grid-${t}`}
                    style={{
                      position: "absolute", left: x, top: 0, bottom: 0, width: 1,
                      background: t % 5 === 0
                        ? "color-mix(in srgb, var(--color-text-secondary) 35%, transparent)"
                        : "color-mix(in srgb, var(--color-text-secondary) 18%, transparent)",
                    }}
                  />
                );
              })}
            </div>

            {/* lanes */}
            <div style={{ position: "relative", zIndex: 1 }}>
              {processed.lanes.map((lane) => (
                <div
                  key={`lane-${lane.name}`}
                  style={{
                    position: "relative",
                    borderBottom: "1px dashed var(--color-border-muted)",
                    width: contentWidth,
                    height: HEADER_SPACER + lane.maxRows * rowHeight,
                  }}
                >
                  {/* rails */}
                    {/* rails (skip top line) */}
                    {Array.from({ length: lane.maxRows }).map((_, i) => {
                    const r = i + 1; // 1..maxRows
                    return (
                        <div
                        key={r}
                        style={{
                            position: "absolute", left: 0, right: 0,
                            top: rowTop(r), height: 1,
                            background: "var(--color-border-muted)",
                            pointerEvents: "none",
                        }}
                        />
                    );
                    })}


                  {/* bars */}
                  {lane.tasks.map((tk) => {
                    const { left, width } = barBox(tk.start, tk.duration);

                    // Extend first row upward into the header so the bar spans header+row
                    const headOverlap = tk.subRow === 0 ? HEADER_SPACER : 0;
                    const yTop = rowTop(tk.subRow) - headOverlap;
                    const yBottom = rowBottom(tk.subRow);

                    const top = clamp(ceil(yTop + ROW_INSET), 0, yBottom);
                    const bottom = clamp(floor(yBottom - ROW_INSET), top + 1, yBottom);
                    const heightPx = bottom - top;


                    const color = actionColors.get(tk.action) ?? colorFor(tk.action);
                    const fg = textOn(color);

                    // label behavior
                    const centerLabel = width < 72;
                    const padX = centerLabel ? 4 : 8;

                    return (
                      <div
                        key={tk.id}
                        onMouseEnter={(e) => onEnter(e, tk)}
                        onMouseLeave={onLeave}
                        title={
                          showTooltips
                            ? undefined
                            : `${tk.action} ${tk.satellite}${tk.target ? " → " + tk.target : ""} @ ${tk.start}..${tk.end} ${timeUnit}`
                        }
                        style={{
                          position: "absolute",
                          left, top, width, height: heightPx,
                          background: color, color: fg,
                          borderRadius: 4,                         // square-ish corners
                          border: hoverId === tk.id ? "1px solid var(--color-accent)" : "1px solid rgba(0,0,0,0.12)",
                          boxSizing: "border-box",                 // keep border inside the box
                            boxShadow: "none",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: `0 ${padX}px`,
                            fontSize: 12, letterSpacing: 0.2,
                            userSelect: "none",
                            // no fixed lineHeight here (we want two lines)
                        }}
                      >
<div style={{
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  textAlign: "center",
  lineHeight: 1.1,
  pointerEvents: "none", // keep hover on the bar
}}>
  <span style={{
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  }}>
    {tk.action}
  </span>
  {tk.target && (
    <span style={{
      fontSize: 8,
      opacity: 0.6,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: "100%",
    }}>
      {tk.target}
    </span>
  )}
</div>

                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Tooltip */}
          {showTooltips && tip &&
            createPortal(
              <div
                style={{
                  position: "fixed",
                  left: tip.x,
                  top: tip.y,
                  transform: "translate(0, -50%)", // vertically center on pointer/bar mid
                  background: "var(--color-surface, color-mix(in srgb, var(--color-bg) 85%, #000 15%))",
                  color: "var(--tooltip-fg, var(--color-fg, #111))",
                  border: "1px solid var(--tooltip-border, rgba(0,0,0,.18))",
                  borderRadius: 8,
                  padding: "4px 8px",
                  lineHeight: 1.2,
                  fontSize: 12,
                  textAlign: "center", // center the content
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  boxShadow: "0 10px 24px var(--tooltip-shadow, rgba(0,0,0,.25))",
                  backdropFilter: "blur(2px)",
                  zIndex: 2147483647, // always on top
                  fontVariantNumeric: "tabular-nums",
                }}
                dangerouslySetInnerHTML={{ __html: tip.html }}
              />,
              document.body
            )}
        </div>
      </div>

      {showLegend && (
        <GanttLegend
          boxed={boxed}
          actionColors={actionColors}
          timeUnit={timeUnit}
          maxDuration={processed.maxDuration}
        />
      )}
    </div>
  );
};

export default GanttLite;
