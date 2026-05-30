import React from "react";
import { fmtCompact, fmtInt } from "../ui";

// Subtle, single-line dataset summary — meta/context numbers, not the story,
// so they sit quietly under the intro rather than as a hero KPI grid. The
// coverage/history caveat lives under the map (see OverviewPage).
export default function StatRail({ stats }) {
  if (!stats) return null;
  const parts = [
    `${fmtInt(stats.totalNotices)} notices`,
    `${fmtCompact(stats.totalWorkers)} workers`,
    `${fmtInt(stats.totalCompanies)} companies`,
    stats.dateRange,
  ].filter(Boolean);
  return <p className="mt-5 text-mini text-ink_muted tabular-nums">{parts.join("  ·  ")}</p>;
}
