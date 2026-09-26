import React, { useMemo, useRef, useState } from "react";
import { ChartCard, DataTable, FilterSelect } from "../kit";
import { fmtCompact, fmtDate, fmtInt } from "../ui";

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
// The GOV.UK Analysis Function navy, shared with the other dataset sites' charts.
const BAR_COLOR = "#12436d";

// ── Time-bucketing helpers ───────────────────────────────────────────────────

function bucketLabel(key, granularity) {
  if (granularity === "year") return key;
  const [y, m] = key.split("-");
  return new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
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
  { value: "1y", label: "1 year", granularity: "month" },
  { value: "5y", label: "5 years", granularity: "month" },
  { value: "all", label: "All years", granularity: "year" },
];

function sinceKeyFor(range, granularity, asOf) {
  const now = new Date(asOf ?? Date.now());
  if (range === "1y") {
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() - 11);
    return d.toISOString().slice(0, 7);
  }
  if (range === "5y") {
    const d = new Date(now);
    d.setUTCFullYear(d.getUTCFullYear() - 5);
    return d.toISOString().slice(0, 7);
  }
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MonthlyTimeline({ timeline, height = HEIGHT, asOf }) {
  const [width, setWidth] = useState(1200);
  const [range, setRange] = useState("5y");
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const cfg = RANGES.find((r) => r.value === range) ?? RANGES[2];
  const sinceKey = sinceKeyFor(range, cfg.granularity, asOf);
  const series = useMemo(() => buildSeries(timeline, cfg.granularity, sinceKey), [timeline, cfg.granularity, sinceKey]);

  const containerRef = (el) => {
    if (!el) return;
    const w = el.getBoundingClientRect().width;
    if (w && Math.abs(w - width) > 4) setWidth(w);
  };

  if (series.length === 0) return <p className="text-mini text-ink_muted">No timeline data yet.</p>;

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

  const asOfDate = fmtDate(new Date(asOf ?? Date.now()).toISOString().slice(0, 10));
  const chart = (
    <div ref={containerRef}>
      <FilterSelect value={range} options={RANGES.map(({ value, label }) => [value, label])} onChange={setRange} />
      <p className="text-small text-ink_muted tabular-nums mb-2 truncate">
        <span className="text-ink font-medium">{bucketLabel(focused.key, cfg.granularity)}</span>: {fmtInt(focused.workers)} workers, {fmtInt(focused.notices)} {focused.notices === 1 ? "notice" : "notices"}
      </p>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
        role="img"
        aria-label={`Workers affected per ${cfg.granularity}. Range: ${cfg.label}. ${fmtInt(focused.workers)} workers in ${bucketLabel(focused.key, cfg.granularity)}.`}
      >
        <title>{`Workers affected per ${cfg.granularity}, ${range} view`}</title>

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
                stroke="#dfe1e2"
                strokeWidth="1"
                shapeRendering="crispEdges"
              />
              <text
                x={PAD_L - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="12"
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
                fontSize="12"
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
          const todayKey = new Date(asOf ?? Date.now()).toISOString().slice(0, cfg.granularity === "year" ? 4 : 7);
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
  const rows = [...series].reverse();
  return (
    <ChartCard
      id="timeline-title"
      title="Workers affected over time"
      description={`Workers named in WARN notices, by the ${cfg.granularity} the notice was received.`}
      date={`Up to and including ${asOfDate}`}
      tabs={[
        { label: "Chart", content: chart },
        {
          label: "Tabular data", short: "Tabular",
          content: (
            <DataTable
              plain
              rowKey={(r) => r.key}
              rows={rows}
              columns={[
                { key: "key", header: cfg.granularity === "year" ? "Year" : "Month", render: (r) => bucketLabel(r.key, cfg.granularity) },
                { key: "workers", header: "Workers", align: "right", render: (r) => fmtInt(r.workers) },
                { key: "notices", header: "Notices", align: "right", render: (r) => fmtInt(r.notices) },
              ]}
            />
          ),
        },
      ]}
    />
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
