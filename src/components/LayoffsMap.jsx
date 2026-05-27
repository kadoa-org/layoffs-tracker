import { geoAlbersUsa, geoPath } from "d3-geo";
import React, { useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import statesTopo from "us-atlas/states-10m.json";
import { navigate } from "../router";
import { fmtCompact, fmtInt } from "../ui";

// Proportional-symbol map of WARN layoffs by state. Bubbles are area-scaled to
// workers affected in the trailing 12 months. Three coverage states are shown:
//   - hatched  : no public WARN data (state not in the dataset)
//   - plain     : reports notices but not worker counts (NY, OK)
//   - bubble    : notices + worker counts
//
// Geometry: us-atlas TopoJSON projected with albersUsa (insets AK + HI).

const WIDTH = 960;
const HEIGHT = 600;
const MAX_R = 34;
const MIN_R = 2.5;
const BUBBLE = "#c84a4a";

// FIPS (us-atlas state id) -> USPS 2-letter code.
const FIPS_TO_USPS = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  10: "DE",
  11: "DC",
  12: "FL",
  13: "GA",
  15: "HI",
  16: "ID",
  17: "IL",
  18: "IN",
  19: "IA",
  20: "KS",
  21: "KY",
  22: "LA",
  23: "ME",
  24: "MD",
  25: "MA",
  26: "MI",
  27: "MN",
  28: "MS",
  29: "MO",
  30: "MT",
  31: "NE",
  32: "NV",
  33: "NH",
  34: "NJ",
  35: "NM",
  36: "NY",
  37: "NC",
  38: "ND",
  39: "OH",
  40: "OK",
  41: "OR",
  42: "PA",
  44: "RI",
  45: "SC",
  46: "SD",
  47: "TN",
  48: "TX",
  49: "UT",
  50: "VT",
  51: "VA",
  53: "WA",
  54: "WV",
  55: "WI",
  56: "WY",
};

// Nice round legend values derived from the data max.
function legendValues(max) {
  if (max <= 0) return [];
  const top = niceRound(max);
  return [top, Math.round(top / 3), Math.round(top / 10)].filter((v) => v > 0);
}
function niceRound(v) {
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.round(v / mag) * mag;
}

export default function LayoffsMap({ stateStats, window: win }) {
  const [hover, setHover] = useState(null);
  const containerRef = useRef(null);
  const [width, setWidth] = useState(WIDTH);

  // Project once. albersUsa fitted to our viewbox.
  const { features, path, projection } = useMemo(() => {
    const fc = feature(statesTopo, statesTopo.objects.states);
    const proj = geoAlbersUsa().fitSize([WIDTH, HEIGHT], fc);
    return { features: fc.features, path: geoPath(proj), projection: proj };
  }, []);

  const max12 = useMemo(
    () => Math.max(1, ...Object.values(stateStats ?? {}).map((s) => s.workers12mo || 0)),
    [stateStats],
  );

  const onResize = (el) => {
    if (!el) return;
    const w = el.getBoundingClientRect().width;
    if (w && Math.abs(w - width) > 4) setWidth(w);
  };

  const radius = (w) => (w > 0 ? Math.max(MIN_R, Math.sqrt(w / max12) * MAX_R) : 0);

  // Build per-state render records: classify coverage + place bubble at centroid.
  const records = useMemo(() => {
    return features.map((f) => {
      const code = FIPS_TO_USPS[f.id];
      const s = code ? stateStats?.[code] : null;
      const noData = !s || s.noticesAll === 0;
      const noCounts = s && s.noticesAll > 0 && s.workersAll === 0;
      const [cx, cy] = path.centroid(f);
      return {
        id: f.id,
        code,
        d: path(f),
        cx,
        cy,
        noData,
        noCounts,
        workers12mo: s?.workers12mo ?? 0,
        notices12mo: s?.notices12mo ?? 0,
        r: radius(s?.workers12mo ?? 0),
      };
    });
  }, [features, path, stateStats, max12]);

  // Draw small bubbles last so they sit on top of large ones.
  const bubbles = records.filter((r) => r.r > 0 && Number.isFinite(r.cx)).sort((a, b) => b.r - a.r);

  const legend = legendValues(niceRound(max12));
  const scale = width / WIDTH;
  const focused = hover ? records.find((r) => r.code === hover) : null;
  // On phones the 2-letter labels become unreadable noise over tiny bubbles —
  // hide them and let tap-through to the state page carry the detail.
  const isMobile = width < 560;

  return (
    <div ref={onResize} className="border border-stroke rounded-md bg-panel p-3 sm:p-4">
      <div className="mb-2 sm:mb-3">
        <div className="text-small font-medium text-ink">Where WARN layoffs are hitting hardest</div>
        {/* Single-line, never wraps — a fixed line that doesn't push into the map. */}
        <div className="text-mini text-ink_muted truncate">
          {focused && focused.code ? (
            focused.noData ? (
              <span>
                <span className="text-ink font-medium">{focused.code}</span> · no public WARN data
              </span>
            ) : focused.noCounts ? (
              <span>
                <span className="text-ink font-medium">{focused.code}</span> · {fmtInt(focused.notices12mo)} notices ·
                counts not reported
              </span>
            ) : (
              <span>
                <span className="text-ink font-medium">{focused.code}</span> · {fmtInt(focused.workers12mo)} workers ·{" "}
                {fmtInt(focused.notices12mo)} notices
              </span>
            )
          ) : (
            <span>Affected workers by state · last 12 months</span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        className="block -mx-3 mt-1 w-[calc(100%+1.5rem)] max-w-none sm:mx-0 sm:w-full"
        role="img"
        aria-label="US map of WARN Act layoffs by state, sized by workers affected in the last 12 months"
      >
        <defs>
          <pattern id="nodata-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="lch(95% 0 282)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="lch(82% 0 282)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* State shapes */}
        {records.map((r) => (
          <path
            key={r.id}
            d={r.d}
            fill={r.noData ? "url(#nodata-hatch)" : "lch(93% 0 282)"}
            stroke="#fff"
            strokeWidth="0.75"
            onMouseEnter={() => setHover(r.code)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: r.noData || r.r === 0 ? "default" : "pointer" }}
            onClick={() => !r.noData && r.code && navigate(`/state/${r.code}`)}
          />
        ))}

        {/* Bubbles */}
        {bubbles.map((r) => (
          <circle
            key={`b-${r.id}`}
            cx={r.cx}
            cy={r.cy}
            r={r.r}
            fill={BUBBLE}
            fillOpacity={hover && hover !== r.code ? 0.3 : 0.55}
            stroke={BUBBLE}
            strokeWidth="1"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHover(r.code)}
            onMouseLeave={() => setHover(null)}
            onClick={() => navigate(`/state/${r.code}`)}
          />
        ))}

        {/* State labels — desktop only; on mobile they're unreadable over small bubbles */}
        {!isMobile &&
          records.map((r) =>
            Number.isFinite(r.cx) && (r.r >= 9 || (!r.noData && r.r === 0)) ? (
              <text
                key={`t-${r.id}`}
                x={r.cx}
                y={r.cy + 3}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill={r.r >= 9 ? "#7a1f1f" : "lch(45% 0 282)"}
                pointerEvents="none"
              >
                {r.code}
              </text>
            ) : null,
          )}

        {/* Size legend — nested circles, bottom-left. Desktop only; at phone
            scale the nested-circle text is illegible, so mobile gets an HTML
            caption below the map instead. */}
        {!isMobile &&
          legend.length > 0 &&
          (() => {
            const lx = 70;
            const baseY = HEIGHT - 30;
            const rTop = radius(legend[0]);
            return (
              <g>
                {legend.map((v, i) => {
                  const rr = radius(v);
                  return (
                    <g key={i}>
                      <circle cx={lx} cy={baseY - rr} r={rr} fill="none" stroke="lch(55% 0 282)" strokeWidth="1" />
                      <text
                        x={lx + rTop + 8}
                        y={baseY - 2 * rr + 4}
                        fontSize="10"
                        fill="lch(40% 0 282)"
                        className="tabular-nums"
                      >
                        {fmtCompact(v)}
                      </text>
                    </g>
                  );
                })}
                <text x={lx} y={baseY + 16} textAnchor="middle" fontSize="10" fill="lch(40% 0 282)">
                  Affected workers
                </text>
              </g>
            );
          })()}
      </svg>

      {/* Mobile legend caption (the in-SVG nested circles are hidden on phones). */}
      <p className="sm:hidden text-mini text-ink_muted mt-2">Circle size = workers affected, last 12 months.</p>
      <p className="text-mini text-ink_muted mt-1 sm:mt-2 leading-relaxed">
        Hatched states don't publicly disclose WARN notices.
      </p>
    </div>
  );
}
