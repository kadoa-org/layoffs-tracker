import React from "react";
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
  TABLE_HEADER_CLS,
  TABLE_ZEBRA_CLS,
} from "../ui";

// Desktop: 6 columns. Mobile (<sm): collapse to Company / State / Workers.
// Type, City, Effective hide below sm — discoverable via clicking through to the company page.
// Two flexible columns (Company + City) so the row spreads evenly instead of
// Company eating all the slack and leaving a big gap before the metrics.
// Effective gets a fixed, nowrap width so dates never wrap to two lines.
const COLS_BASE = "grid gap-3 px-4";
const COLS_DESKTOP = "sm:grid-cols-[minmax(0,1.6fr)_88px_48px_minmax(0,1fr)_72px_104px]";
const COLS_MOBILE = "grid-cols-[1fr_44px_60px]";
const COLS = `${COLS_BASE} ${COLS_MOBILE} ${COLS_DESKTOP}`;

export default function NoticesTable({ notices, sort, setSort, limit }) {
  const rows = limit ? notices.slice(0, limit) : notices;
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
