import React, { useMemo } from "react";

// All 50 states + DC + PR, alphabetical so the grid stays predictable.
const ALL_JURISDICTIONS = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "PR",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

// States with no public WARN portal (legally confidential or no publication).
// Mirrors `status: "blocked"` rows in services/custom/datasets/layoffs/sources.json.
const BLOCKED = new Set(["AR", "MS", "NH", "PR", "WY"]);

export default function CoverageBar({ states = [] }) {
  const live = useMemo(() => new Set(states.map((s) => s.state)), [states]);
  const liveCount = live.size;
  const blockedCount = BLOCKED.size;
  const pendingCount = ALL_JURISDICTIONS.length - liveCount - blockedCount;

  return (
    <div className="border border-[#b1b4b6]  bg-panel px-4 py-2.5 flex items-center gap-4 flex-wrap">
      <span className="text-mini text-ink_muted whitespace-nowrap">
        Coverage{" "}
        <span className="text-ink font-medium tabular-nums">
          {liveCount}/{ALL_JURISDICTIONS.length}
        </span>
        <span className="mx-1.5">·</span>
        <span className="text-accent font-medium tabular-nums">{liveCount}</span> live
        <span className="mx-1.5">·</span>
        <span className="tabular-nums">{pendingCount}</span> pending
        <span className="mx-1.5">·</span>
        <span className="tabular-nums">{blockedCount}</span> no public data
      </span>
      <div className="flex flex-wrap gap-[3px]">
        {ALL_JURISDICTIONS.map((code) => {
          const isLive = live.has(code);
          const isBlocked = BLOCKED.has(code);
          const cls = isLive
            ? "bg-accent text-white border-accent"
            : isBlocked
              ? "bg-canvas text-ink_faint border-[#b1b4b6] line-through decoration-ink_faint/60"
              : "bg-muted text-ink_muted border-[#b1b4b6]";
          const title = isLive ? `${code}, live` : isBlocked ? `${code}, no public WARN portal` : `${code}, pending`;
          return (
            <div
              key={code}
              title={title}
              className={`h-5 px-1.5  border text-[10px] font-medium font-mono flex items-center justify-center tabular-nums ${cls}`}
            >
              {code}
            </div>
          );
        })}
      </div>
    </div>
  );
}
