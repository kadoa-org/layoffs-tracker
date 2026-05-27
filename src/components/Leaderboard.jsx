import React, { useState } from "react";
import { navigate } from "../router";
import { Card, companySlug, eventPill, fmtCompact, fmtDate, fmtInt, Link, Pill, Segmented } from "../ui";

// Same column shape as NoticesTable so the dashboard reads consistently.
// Mobile collapses Type / City / Effective; only Company / State / Workers remain.
const COLS =
  "grid gap-3 px-4 grid-cols-[24px_1fr_50px_60px] sm:grid-cols-[24px_minmax(0,1.6fr)_88px_48px_minmax(0,1fr)_72px_104px]";

export default function Leaderboard({ topLayoffs, totals, limit = 10 }) {
  const [range, setRange] = useState("ytd");
  const currentYear = new Date().getFullYear();

  // `topLayoffs` is { ytd: [...], "12m": [...], all: [...] } — each is the
  // pre-ranked top-25 from the build step. Static, tiny, no DB needed.
  const rows = (topLayoffs?.[range] ?? []).slice(0, limit);
  const totalWorkers = totals?.[range] ?? 0;

  const rangeLabel = range === "ytd" ? `${currentYear} YTD` : range === "12m" ? "Last 12 months" : "All time";

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b border-stroke flex items-center justify-between gap-3 flex-wrap">
        <div className="text-mini text-ink_muted">
          <span className="text-ink font-medium">{rangeLabel}</span>
          <span className="mx-1">·</span>
          {fmtInt(totalWorkers)} workers
        </div>
        <Segmented
          size="sm"
          value={range}
          onChange={setRange}
          options={[
            { value: "ytd", label: "YTD" },
            { value: "12m", label: "12m" },
            { value: "all", label: "All time" },
          ]}
        />
      </div>
      <div className={`${COLS} h-9 items-center border-b border-stroke text-mini font-medium text-ink_muted`}>
        <span className="text-right">#</span>
        <span>Company</span>
        <span className="hidden sm:block">Type</span>
        <span>State</span>
        <span className="hidden sm:block">City</span>
        <span className="text-right">Workers</span>
        <span className="hidden sm:block text-right">Effective</span>
      </div>
      <div className="text-small [&>*:nth-child(even)]:bg-muted/30">
        {rows.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-mini text-ink_muted">
            No filings in this range.
          </div>
        ) : (
          rows.map((n, i) => {
            const slug = companySlug(n.company);
            const ep = eventPill(n.event_type);
            return (
              <div
                key={n.id}
                onClick={() => navigate(`/company/${slug}`)}
                className={`${COLS} h-11 sm:h-10 items-center hover:bg-hover cursor-pointer border-b border-stroke_soft last:border-b-0`}
              >
                <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>
                <span className="truncate text-ink min-w-0">{n.company}</span>
                <span className="hidden sm:block">
                  {n.event_type ? (
                    <Pill tone={ep.tone} size="xs">
                      {ep.label}
                    </Pill>
                  ) : (
                    <span className="text-ink_faint text-mini">--</span>
                  )}
                </span>
                <span>
                  <Link
                    to={`/state/${n.state}`}
                    onClick={(e) => e.stopPropagation()}
                    className="no-underline hover:no-underline text-ink_muted"
                  >
                    {n.state}
                  </Link>
                </span>
                <span className="hidden sm:block truncate text-ink_muted">{n.city ?? "--"}</span>
                <span className="text-right tabular-nums text-ink font-medium">{fmtCompact(n.num_affected)}</span>
                <span className="hidden sm:block text-right tabular-nums text-ink_muted whitespace-nowrap">
                  {fmtDate(n.effective_date)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
