import React, { useMemo } from "react";
import { navigate } from "../router";
import {
  Card,
  companySlug,
  eventPill,
  fmtCompact,
  fmtDate,
  Link,
  Pill,
  SortHeader,
  STATE_WARN_URL,
  TABLE_HEADER_CLS,
  TABLE_ZEBRA_CLS,
} from "../ui";

// Desktop: Company / Type / State / City / Workers / Effective / Source.
// Mobile (<sm): Company (+ metadata line) / State / Workers.
// Two flexible columns (Company + City) so the row spreads evenly; Effective is
// fixed + nowrap so dates never wrap; a narrow trailing Source column links out.
const COLS_BASE = "grid gap-3 px-4";
const COLS_DESKTOP = "sm:grid-cols-[minmax(0,1.5fr)_84px_44px_minmax(0,1fr)_68px_100px_52px]";
const COLS_MOBILE = "grid-cols-[1fr_44px_60px]";
const COLS = `${COLS_BASE} ${COLS_MOBILE} ${COLS_DESKTOP}`;

// Client-side sort: key, optionally "-"-prefixed for descending. Nulls always
// sort last; num_affected sorts numerically, everything else as text.
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
  if (!url) return <span className="text-ink_faint text-mini">--</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`${state} official WARN source`}
      aria-label={`${state} official WARN source`}
      className="text-ink_faint hover:text-ink no-underline inline-flex"
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

export default function NoticesTable({ notices, sort, setSort, limit }) {
  const sorted = useMemo(() => sortNotices(notices, sort), [notices, sort]);
  const rows = limit ? sorted.slice(0, limit) : sorted;
  return (
    <Card className="overflow-hidden">
      <div className={`${COLS} ${TABLE_HEADER_CLS} h-9 items-center border-b border-stroke`}>
        <SortHeader label="Company" sortKey="company" sort={sort} setSort={setSort} />
        <span className="hidden sm:block">
          <SortHeader label="Type" sortKey="event_type" sort={sort} setSort={setSort} />
        </span>
        <SortHeader label="State" sortKey="state" sort={sort} setSort={setSort} />
        <span className="hidden sm:block">
          <SortHeader label="City" sortKey="city" sort={sort} setSort={setSort} />
        </span>
        <SortHeader label="Workers" sortKey="num_affected" sort={sort} setSort={setSort} align="right" />
        <span className="hidden sm:block">
          <SortHeader label="Effective" sortKey="effective_date" sort={sort} setSort={setSort} align="right" />
        </span>
        <span className="hidden sm:block text-right">Source</span>
      </div>
      <div className={`text-small ${TABLE_ZEBRA_CLS}`}>
        {rows.map((n) => {
          const ep = eventPill(n.event_type);
          const slug = companySlug(n.company);
          return (
            <div
              key={n.id}
              onClick={() => navigate(`/company/${slug}`)}
              className={`${COLS} py-2.5 sm:py-0 sm:h-10 items-center hover:bg-hover cursor-pointer border-b border-stroke_soft last:border-b-0`}
            >
              <div className="min-w-0">
                <div className="truncate text-ink">{n.company}</div>
                {/* Mobile-only second line: the columns we hide below sm, kept readable as a metadata row. */}
                <div className="sm:hidden flex items-center gap-1.5 mt-1 text-mini text-ink_faint">
                  {n.event_type && (
                    <Pill tone={ep.tone} size="xs">
                      {ep.label}
                    </Pill>
                  )}
                  {n.city && <span className="truncate">{n.city}</span>}
                  {n.effective_date && <span className="whitespace-nowrap">· {fmtDate(n.effective_date)}</span>}
                  {STATE_WARN_URL[n.state] && (
                    <a
                      href={STATE_WARN_URL[n.state]}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-ink_faint hover:text-ink no-underline inline-flex shrink-0"
                      aria-label={`${n.state} official WARN source`}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
              <div className="hidden sm:block">
                {n.event_type ? (
                  <Pill tone={ep.tone} size="xs">
                    {ep.label}
                  </Pill>
                ) : (
                  <span className="text-ink_faint text-mini">--</span>
                )}
              </div>
              <div>
                <Link
                  to={`/state/${n.state}`}
                  onClick={(e) => e.stopPropagation()}
                  className="no-underline hover:no-underline text-ink_muted"
                >
                  {n.state}
                </Link>
              </div>
              <div className="hidden sm:block truncate text-ink_muted">{n.city ?? "--"}</div>
              <div className="text-right tabular-nums text-ink">{fmtCompact(n.num_affected)}</div>
              <div className="hidden sm:block text-right tabular-nums text-ink_muted whitespace-nowrap">
                {fmtDate(n.effective_date)}
              </div>
              <div className="hidden sm:flex justify-end">
                <SourceLink state={n.state} />
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="h-24 flex items-center justify-center text-mini text-ink_muted">No notices match.</div>
        )}
      </div>
    </Card>
  );
}
