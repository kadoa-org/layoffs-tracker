import React from "react";
import { fmtCompact, fmtInt, Link } from "../ui";

// Subtle, single-line dataset summary — these are meta/context numbers, not the
// story, so they sit quietly under the intro rather than as a hero KPI grid.
// The trailing link discloses that coverage and history depth vary by state.
export default function StatRail({ stats }) {
  if (!stats) return null;
  const parts = [
    `${fmtInt(stats.totalNotices)} notices`,
    `${fmtCompact(stats.totalWorkers)} workers`,
    `${fmtInt(stats.totalCompanies)} companies`,
    stats.dateRange,
  ].filter(Boolean);
  return (
    <p className="mt-5 text-mini text-ink_muted">
      <span className="tabular-nums">{parts.join("  ·  ")}</span>
      <span className="mx-2 text-ink_faint" aria-hidden="true">
        ·
      </span>
      <Link
        to="/about"
        className="text-ink_muted hover:text-ink underline decoration-dotted decoration-ink_faint underline-offset-2"
      >
        coverage &amp; history vary by state
      </Link>
    </p>
  );
}
