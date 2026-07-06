import React, { useMemo, useRef, useState } from "react";
import { fmtCompact, fmtInt, Segmented } from "../ui";

// Time-series chart of workers affected. SVG, no chart lib.
//
// Design notes:
// - Aggregation switches with the visible range so bars stay readable:
//     1y -> 12 monthly bars, 5y -> 60 monthly bars, All -> per-year bars.
// - The chart should be informative as a static screenshot — the tooltip
//   defaults to the most recent bucket; hovering overrides it.
// - Mouseover is captured on a chart-wide overlay so 3-4px bars stay
//   addressable, including on touch via tap.
// - Y-axis ticks are "nice" round numbers (10K / 50K / 100K) so the eye can
//   read a bar's value without arithmetic.
// - A dashed median line gives the reader an anchor for "what's normal".

const PAD_L = 56;
const PAD_R = 16;
const PAD_T = 14;
const PAD_B = 28;
const HEIGHT = 280;
const MIN_BAR_W = 2;
const BAR_COLOR = "#c84a4a";

// ── Time-bucketing helpers ───────────────────────────────────────────────────

function bucketLabel(key, granularity) {
  if (granularity === "year") return key;
  const [y, m] = key.split("-");
  return new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function nextKey(key, granularity) {
  if (granularity === "year") return String(Number(key) + 1);
  const [y, m] = key.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

function buildSeries(timeline, granularity, sinceKey) {
  // `timeline` is { monthly: [{key, notices, workers}], yearly: [...] } from
  // overview.json. We slice + gap-fill for the active range/granularity.
  const rows = (granularity === "year" ? timeline.yearly : timeline.monthly) ?? [];
  const filtered = sinceKey ? rows.filter((r) => r.key >= sinceKey) : rows;
  if (filtered.length === 0) return [];

  const filled = [];
  let k = filtered[0].key;
  const last = filtered[filtered.length - 1].key;
  const map = new Map(filtered.map((r) => [r.key, r]));
  while (k <= last) {
    const v = map.get(k) ?? { notices: 0, workers: 0 };
    filled.push({ key: k, notices: v.notices, workers: v.workers });
    k = nextKey(k, granularity);
  }
  return filled;
}

// ── Axis helpers ─────────────────────────────────────────────────────────────

// "Nice" ticks: round to 1/2/5 × 10^n so the eye reads them as round numbers.
function niceTicks(max, targetCount = 4) {
  if (max <= 0) return [0];
  const rawStep = max / targetCount;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const norm = rawStep / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const ticks = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  // Drop the 0 tick (baseline carries that signal already)
  return ticks.slice(1);
}

// ── Range modes ──────────────────────────────────────────────────────────────

const RANGES = [
  { value: "1y", label: "1Y", granularity: "month" },
  { value: "5y", label: "5Y", granularity: "month" },
  { value: "all", label: "All", granularity: "year" },
];

function sinceKeyFor(range, granularity) {
  const now = new Date();
  if (range === "1y") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 11);
    return d.toISOString().slice(0, 7);
  }
  if (range === "5y") {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 5);
    return d.toISOString().slice(0, 7);
  }
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MonthlyTimeline({ timeline, height = HEIGHT }) {
  const [width, setWidth] = useState(1200);
  const [range, setRange] = useState("5y");
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const cfg = RANGES.find((r) => r.value === range) ?? RANGES[2];
  const sinceKey = sinceKeyFor(range, cfg.granularity);
  const series = useMemo(() => buildSeries(timeline, cfg.granularity, sinceKey), [timeline, cfg.granularity, sinceKey]);

  const containerRef = (el) => {
    if (!el) return;
    const w = el.getBoundingClientRect().width;
    if (w && Math.abs(w - width) > 4) setWidth(w);
  };

  if (series.length === 0) {
    return (
      <div className="border border-[#b1b4b6]  bg-panel h-48 flex items-center justify-center text-mini text-ink_muted">
        No timeline data yet.
      </div>
    );
  }

  const innerW = Math.max(200, width - PAD_L - PAD_R);
  const innerH = height - PAD_T - PAD_B;
  const max = Math.max(...series.map((s) => s.workers), 1);
  const barStep = innerW / series.length;
  const barW = Math.max(MIN_BAR_W, barStep - 1);

  const yTicks = niceTicks(max, 4);
  const yMax = Math.max(yTicks[yTicks.length - 1] ?? max, max);
  const xTickIndexes = computeXTicks(series, cfg.granularity, innerW);

  // Default tooltip: most recent bucket. Hover overrides.
  const focused = hoverIdx != null ? series[hoverIdx] : series[series.length - 1];

  // Snap mousemove to nearest bar
  const onMove = (e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const localX = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.max(0, Math.min(series.length - 1, Math.floor((localX - PAD_L) / barStep)));
    setHoverIdx(idx);
  };
  const onLeave = () => setHoverIdx(null);

  return (
    <div ref={containerRef} className="border border-[#b1b4b6]  bg-panel p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-small font-medium text-ink truncate">Workers affected per {cfg.granularity}</div>
        <div className="shrink-0">
          <Segmented
            size="sm"
            value={range}
            onChange={setRange}
            options={RANGES.map(({ value, label }) => ({ value, label }))}
          />
        </div>
      </div>
      <div className="text-mini text-ink_muted h-4 tabular-nums mb-2 truncate">
        <span className="text-ink font-medium">{bucketLabel(focused.key, cfg.granularity)}</span>
        <span className="mx-1.5">·</span>
        {fmtInt(focused.workers)} workers
        <span className="mx-1.5">·</span>
        {fmtInt(focused.notices)} {focused.notices === 1 ? "notice" : "notices"}
      </div>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
        role="img"
        aria-label={`Workers affected per ${cfg.granularity}. Range: ${cfg.label}. ${fmtInt(focused.workers)} workers in ${bucketLabel(focused.key, cfg.granularity)}.`}
      >
        <title>
          Workers affected per {cfg.granularity}, {range} view
        </title>

        {/* Y gridlines + labels */}
        {yTicks.map((v, i) => {
          const y = PAD_T + innerH - (v / yMax) * innerH;
          return (
            <g key={i}>
              <line
                x1={PAD_L}
                x2={width - PAD_R}
                y1={y}
                y2={y}
                stroke="lch(94% 0 282)"
                strokeWidth="1"
                shapeRendering="crispEdges"
              />
              <text
                x={PAD_L - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fill="lch(50% 0 282)"
                className="tabular-nums"
              >
                {fmtCompact(v)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {series.map((s, i) => {
          const h = (s.workers / yMax) * innerH;
          const x = PAD_L + i * barStep;
          const y = PAD_T + innerH - h;
          const isFocused = hoverIdx === i;
          return (
            <rect
              key={s.key}
              x={x}
              y={y}
              width={barW}
              height={Math.max(0, h)}
              fill={BAR_COLOR}
              opacity={hoverIdx == null ? 0.85 : isFocused ? 1 : 0.35}
            />
          );
        })}

        {/* X axis ticks. Year-boundary labels align to bar start (year edge);
            short-range labels (e.g. "Jun 2025") align to bar midpoint. */}
        {xTickIndexes.map((t) => {
          const x = PAD_L + (t.idx + (t.center ? 0.5 : 0)) * barStep;
          return (
            <g key={t.idx}>
              <line x1={x} x2={x} y1={PAD_T + innerH} y2={PAD_T + innerH + 4} stroke="lch(70% 0 282)" strokeWidth="1" />
              <text
                x={x}
                y={PAD_T + innerH + 16}
                textAnchor="middle"
                fontSize="10"
                fill="lch(45% 0 282)"
                className="tabular-nums"
              >
                {t.label}
              </text>
            </g>
          );
        })}

        {/* "Today" marker — only when "today" is on-chart */}
        {(() => {
          const todayKey = new Date().toISOString().slice(0, cfg.granularity === "year" ? 4 : 7);
          const idx = series.findIndex((s) => s.key === todayKey);
          if (idx < 0) return null;
          const x = PAD_L + (idx + 0.5) * barStep;
          return (
            <line
              x1={x}
              x2={x}
              y1={PAD_T - 4}
              y2={PAD_T + innerH}
              stroke="lch(50% 0 282)"
              strokeWidth="1"
              strokeDasharray="2 3"
              opacity={0.35}
            />
          );
        })()}

        {/* Bottom baseline */}
        <line
          x1={PAD_L}
          x2={width - PAD_R}
          y1={PAD_T + innerH}
          y2={PAD_T + innerH}
          stroke="lch(75% 0 282)"
          strokeWidth="1"
          shapeRendering="crispEdges"
        />

        {/* Focus indicator on the hovered/default bar */}
        {focused &&
          (() => {
            const idx = hoverIdx != null ? hoverIdx : series.length - 1;
            const x = PAD_L + (idx + 0.5) * barStep;
            return (
              <line
                x1={x}
                x2={x}
                y1={PAD_T}
                y2={PAD_T + innerH}
                stroke={BAR_COLOR}
                strokeWidth="1"
                opacity={hoverIdx != null ? 0.45 : 0}
              />
            );
          })()}

        {/* Mouse + touch capture overlay covering the plot area */}
        <rect
          x={PAD_L}
          y={PAD_T}
          width={innerW}
          height={innerH}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) onMove({ clientX: t.clientX, clientY: t.clientY });
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (t) onMove({ clientX: t.clientX, clientY: t.clientY });
          }}
          onTouchEnd={onLeave}
          style={{ cursor: "crosshair" }}
        />
      </svg>
    </div>
  );
}

// Pick x-axis label positions. Behaviour differs by granularity:
//   - yearly view: label every (n-th) bar at its midpoint
//   - monthly view: pin year labels to the year boundary (bar start)
//   - short monthly ranges (1Y): label every other quarter at bar midpoint
// `center: true` -> render label at the bar's midpoint;
// `center: false` -> render label exactly at the bar's start (year edge).
function computeXTicks(series, granularity, innerW) {
  if (series.length === 0) return [];

  if (granularity === "year") {
    const step = Math.max(1, Math.ceil(series.length / Math.floor(innerW / 40)));
    return series.map((s, idx) => ({ idx, label: s.key, center: true })).filter((_, i) => i % step === 0);
  }

  if (series.length <= 24) {
    return series
      .map((s, idx) => ({ idx, label: bucketLabel(s.key, "month"), center: true }))
      .filter((_, i) => i % Math.ceil(series.length / 6) === 0);
  }

  // Monthly multi-year view: one label per year at the year boundary.
  const yearStarts = [];
  for (let i = 0; i < series.length; i++) {
    if (series[i].key.endsWith("-01")) {
      yearStarts.push({ idx: i, label: series[i].key.slice(0, 4), center: false });
    }
  }
  const maxTicks = Math.max(2, Math.floor(innerW / 60));
  const step = Math.max(1, Math.ceil(yearStarts.length / maxTicks));
  return yearStarts.filter((_, i) => i % step === 0);
}
