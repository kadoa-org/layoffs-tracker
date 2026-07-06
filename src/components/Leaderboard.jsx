import React, { useState } from "react";
import { DataTable } from "../kit";
import { Card, companySlug, eventPill, fmtCompact, fmtDate, fmtInt, Link, Pill, RowLinkNav, Segmented } from "../ui";

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
      <DataTable
        plain
        columns={[
          { key: "rank", header: "#", width: 32, align: "right", render: (n) => <span style={{ color: "var(--dk-muted)" }}>{n._rank}</span> },
          {
            key: "company",
            header: "Company",
            clamp: true,
            render: (n) => {
              const ep = eventPill(n.event_type);
              return (
                <span className="flex items-center gap-2 min-w-0">
                  <RowLinkNav to={`/company/${companySlug(n.company)}`}>
                    <span style={{ fontWeight: 500 }} className="truncate">{n.company}</span>
                  </RowLinkNav>
                  <Pill tone={ep.tone}>{ep.label}</Pill>
                </span>
              );
            },
          },
          { key: "state", header: "State", hideBelow: "sm", render: (n) => <Link to={`/state/${n.state}`}>{n.state}</Link> },
          { key: "city", header: "City", hideBelow: "sm", render: (n) => <span style={{ color: "var(--dk-muted)" }}>{n.city ?? "--"}</span> },
          { key: "workers", header: "Workers", align: "right", render: (n) => <strong>{fmtCompact(n.num_affected)}</strong> },
          { key: "effective", header: "Effective", align: "right", hideBelow: "sm", render: (n) => <span style={{ color: "var(--dk-muted)" }}>{fmtDate(n.effective_date)}</span> },
        ]}
        rows={rows.map((n, i) => ({ ...n, _rank: i + 1 }))}
        rowKey={(n) => n.id}
        empty="No filings in this range."
      />
    </Card>
  );
}
