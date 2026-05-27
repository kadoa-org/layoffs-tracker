import { useMemo, useState } from "react";
import { Card, fmtCompact, fmtInt, Link, SectionHeader, SortHeader, TABLE_HEADER_CLS, TABLE_ZEBRA_CLS } from "../ui";
import { query } from "../useDatabase";

// Mobile: # / State(+agency subtitle) / Notices / Workers — 4 columns.
// Desktop: adds Agency and Coverage as their own columns.
const COLS = "grid gap-3 px-4 grid-cols-[28px_1fr_64px_76px] sm:grid-cols-[40px_56px_1fr_90px_90px_120px]";

const SORT_MAP = {
  state: "state ASC",
  agency: "agency ASC",
  notices: "notices DESC",
  workers: "workers DESC",
  coverage: "first_filed ASC",
};

export default function StatesPage({ db }) {
  const [sort, setSort] = useState("workers");

  const rows = useMemo(() => {
    const order = SORT_MAP[sort] ?? "workers DESC";
    return query(
      db,
      `SELECT state, agency, notices, workers, coverage
       FROM states
       ORDER BY ${order}`,
    );
  }, [db, sort]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <SectionHeader title="States" subtitle={`${fmtInt(rows.length)} states`} />
      <Card className="overflow-hidden">
        <div className={`${COLS} ${TABLE_HEADER_CLS} h-9 items-center border-b border-stroke`}>
          <span className="text-right">#</span>
          <SortHeader label="State" sortKey="state" sort={sort} setSort={setSort} />
          <span className="hidden sm:block">
            <SortHeader label="Agency" sortKey="agency" sort={sort} setSort={setSort} />
          </span>
          <SortHeader label="Notices" sortKey="notices" sort={sort} setSort={setSort} align="right" />
          <SortHeader label="Workers" sortKey="workers" sort={sort} setSort={setSort} align="right" />
          <span className="hidden sm:block">
            <SortHeader label="Coverage" sortKey="coverage" sort={sort} setSort={setSort} align="right" />
          </span>
        </div>
        <div className={`text-small ${TABLE_ZEBRA_CLS}`}>
          {rows.map((s, i) => (
            <Link
              key={s.state}
              to={`/state/${s.state}`}
              className={`${COLS} h-11 sm:h-10 items-center hover:bg-hover border-b border-stroke_soft last:border-b-0 no-underline hover:no-underline text-ink`}
            >
              <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>
              <span className="font-medium min-w-0">
                {s.state}
                <span className="sm:hidden block text-mini text-ink_faint font-normal truncate">{s.agency ?? ""}</span>
              </span>
              <span className="hidden sm:block truncate text-ink_muted">{s.agency ?? "--"}</span>
              <span className="text-right tabular-nums">{fmtInt(s.notices)}</span>
              <span className="text-right tabular-nums">{s.workers > 0 ? fmtCompact(s.workers) : "--"}</span>
              <span className="hidden sm:block text-right tabular-nums text-ink_muted">{s.coverage ?? "--"}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
