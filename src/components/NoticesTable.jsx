import React, { useMemo } from "react";
import { DataTable } from "../kit";
import { companySlug, eventPill, fmtCompact, fmtDate, Link, Pill, RowLinkNav, STATE_WARN_URL } from "../ui";

// data-kit DataTable over the notices dataset.
// Columns: Company / Type / State / City / Workers / Filed / Effective / Source.

function sortNotices(notices, sort) {
  const key = (sort || "").replace(/^-/, "");
  if (!key) return notices;
  const desc = (sort || "").startsWith("-");
  return [...notices].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    const aNull = av == null || av === "";
    const bNull = bv == null || bv === "";
    if (aNull && bNull) return 0;
    if (aNull) return 1;
    if (bNull) return -1;
    const cmp = key === "num_affected" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
    return desc ? -cmp : cmp;
  });
}

function SourceLink({ state }) {
  const url = STATE_WARN_URL[state];
  if (!url) return <span style={{ color: "var(--dk-faint)" }}>--</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`${state} official WARN source`}
      aria-label={`${state} official WARN source`}
      style={{ color: "var(--dk-muted)", display: "inline-flex" }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

export default function NoticesTable({ notices, sort, setSort, limit, sortable = true }) {
  const sorted = useMemo(() => (sortable ? sortNotices(notices, sort) : notices), [notices, sort, sortable]);
  const rows = limit ? sorted.slice(0, limit) : sorted;

  // DataTable sort contract: {key, dir} + onSort(key). Ours is a signed string.
  const key = (sort || "").replace(/^-/, "");
  const dir = (sort || "").startsWith("-") ? "desc" : "asc";
  const onSort = sortable ? (k) => setSort?.(sort === `-${k}` ? k : `-${k}`) : undefined;
  const kitSort = sortable && key ? { key, dir } : undefined;

  const columns = [
    {
      key: "company",
      header: "Company",
      sortable,
      render: (n) => (
        <RowLinkNav to={`/company/${companySlug(n.company)}`}>
          <span style={{ display: "block", fontWeight: 500 }} className="truncate">
            {n.company}
          </span>
        </RowLinkNav>
      ),
    },
    {
      key: "event_type",
      header: "Type",
      sortable,
      render: (n) => {
        if (!n.event_type) return <span style={{ color: "var(--dk-faint)" }}>--</span>;
        const ep = eventPill(n.event_type);
        return <Pill tone={ep.tone}>{ep.label}</Pill>;
      },
    },
    {
      key: "state",
      header: "State",
      sortable,
      render: (n) => (
        <Link to={`/state/${n.state}`} onClick={(e) => e.stopPropagation()}>
          {n.state}
        </Link>
      ),
    },
    {
      key: "city",
      header: "City",
      sortable,
      render: (n) => <span style={{ color: "var(--dk-muted)" }}>{n.city ?? "--"}</span>,
    },
    { key: "num_affected", header: "Workers", align: "right", sortable, render: (n) => fmtCompact(n.num_affected) },
    {
      key: "received_date",
      header: "Filed",
      align: "right",
      sortable,
      render: (n) => <span style={{ color: "var(--dk-muted)", whiteSpace: "nowrap" }}>{fmtDate(n.received_date)}</span>,
    },
    {
      key: "effective_date",
      header: "Effective",
      align: "right",
      sortable,
      render: (n) => (
        <span style={{ color: "var(--dk-muted)", whiteSpace: "nowrap" }}>{fmtDate(n.effective_date)}</span>
      ),
    },
    { key: "source", header: "Source", align: "right", render: (n) => <SourceLink state={n.state} /> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(n) => n.id}
      sort={kitSort}
      onSort={onSort}
      empty="No notices match."
    />
  );
}
