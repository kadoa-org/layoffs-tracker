import React, { useMemo } from "react";
import { navigate } from "../router";
import { Card, companySlug, eventPill, fmtCompact, fmtDate, Link, Pill } from "../ui";

const COLS = "grid grid-cols-[24px_1fr_56px_120px_90px_90px] gap-3 px-4";

// Top-N largest layoff filings for a given year. Reddit-friendly leaderboard.
export default function BiggestThisYear({ notices, year, limit = 10 }) {
  const y = year ?? new Date().getFullYear();
  const cutoff = `${y}-01-01`;
  const next = `${y + 1}-01-01`;

  const rows = useMemo(() => {
    return notices
      .filter((n) => {
        const d = n.received_date ?? n.effective_date;
        return d && d >= cutoff && d < next && (n.num_affected ?? 0) > 0;
      })
      .sort((a, b) => (b.num_affected ?? 0) - (a.num_affected ?? 0))
      .slice(0, limit);
  }, [notices, cutoff, next, limit]);

  if (rows.length === 0) {
    return (
      <Card className="h-32 flex items-center justify-center text-mini text-ink_muted">No filings yet for {y}.</Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[24px_1fr_56px_120px_90px_90px] gap-3 px-4 h-9 items-center border-b border-stroke text-mini font-medium text-ink_muted">
        <span className="text-right">#</span>
        <span>Company</span>
        <span>State</span>
        <span>City</span>
        <span className="text-right">Workers</span>
        <span className="text-right">Effective</span>
      </div>
      <div className="text-small [&>*:nth-child(even)]:bg-muted/30">
        {rows.map((n, i) => {
          const slug = companySlug(n.company);
          const ep = eventPill(n.event_type);
          return (
            <div
              key={n.id}
              onClick={() => navigate(`/company/${slug}`)}
              className={`${COLS} h-10 items-center hover:bg-hover cursor-pointer border-b border-stroke_soft last:border-b-0`}
            >
              <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>
              <span className="truncate text-ink flex items-center gap-2 min-w-0">
                <span className="truncate">{n.company}</span>
                <Pill tone={ep.tone} size="xs">
                  {ep.label}
                </Pill>
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
              <span className="truncate text-ink_muted">{n.city ?? "--"}</span>
              <span className="text-right tabular-nums text-ink font-medium">{fmtCompact(n.num_affected)}</span>
              <span className="text-right tabular-nums text-ink_muted">{fmtDate(n.effective_date)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
