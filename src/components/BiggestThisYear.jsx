import React, { useMemo } from "react";
import { DataTable } from "../kit";
import { companySlug, eventPill, fmtCompact, fmtDate, Link, Pill, RowLinkNav } from "../ui";

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

  const columns = [
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
  ];

  if (rows.length === 0) {
    return <p className="dk-hint">No filings yet for {y}.</p>;
  }

  return <DataTable columns={columns} rows={rows.map((n, i) => ({ ...n, _rank: i + 1 }))} rowKey={(n) => n.id} />;
}
