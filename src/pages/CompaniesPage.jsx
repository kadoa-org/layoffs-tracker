import { useMemo, useState } from "react";
import {
  Card,
  companySlug,
  fmtCompact,
  fmtInt,
  Link,
  SectionHeader,
  SortHeader,
  TABLE_HEADER_CLS,
  TABLE_ZEBRA_CLS,
} from "../ui";
import { query } from "../useDatabase";

const COLS = "grid gap-3 px-4 grid-cols-[30px_1fr_60px_70px] sm:grid-cols-[40px_1fr_90px_90px_120px]";

const SORT_MAP = {
  name: "name ASC",
  notices: "notices DESC",
  workers: "workers DESC",
  last_filed: "last_filed DESC",
};

export default function CompaniesPage({ db }) {
  const [sort, setSort] = useState("workers");
  const [search, setSearch] = useState("");

  const total = useMemo(() => query(db, "SELECT count(*) AS n FROM companies")[0]?.n ?? 0, [db]);

  const rows = useMemo(() => {
    const term = search.trim();
    const order = SORT_MAP[sort] ?? "workers DESC";
    if (term) {
      return query(
        db,
        `SELECT canon, name, notices, workers, last_filed
         FROM companies
         WHERE lower(name) LIKE ?
         ORDER BY ${order}
         LIMIT 500`,
        [`%${term.toLowerCase()}%`],
      );
    }
    return query(
      db,
      `SELECT canon, name, notices, workers, last_filed
       FROM companies
       ORDER BY ${order}
       LIMIT 500`,
    );
  }, [db, sort, search]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <SectionHeader title="Companies" subtitle={`${fmtInt(rows.length)} of ${fmtInt(total)}`} />
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search company..."
        className="h-8 px-3 mb-4 text-small border border-stroke rounded-md bg-panel min-w-[260px] focus:outline-none focus:border-accent placeholder:text-ink_faint"
      />
      <Card className="overflow-hidden">
        <div className={`${COLS} ${TABLE_HEADER_CLS} h-9 items-center border-b border-stroke`}>
          <span className="text-right">#</span>
          <SortHeader label="Company" sortKey="name" sort={sort} setSort={setSort} />
          <SortHeader label="Notices" sortKey="notices" sort={sort} setSort={setSort} align="right" />
          <SortHeader label="Workers" sortKey="workers" sort={sort} setSort={setSort} align="right" />
          <span className="hidden sm:block">
            <SortHeader label="Latest filing" sortKey="last_filed" sort={sort} setSort={setSort} align="right" />
          </span>
        </div>
        <div className={`text-small ${TABLE_ZEBRA_CLS}`}>
          {rows.map((c, i) => (
            <Link
              key={c.name}
              to={`/company/${companySlug(c.name)}`}
              className={`${COLS} h-11 sm:h-10 items-center hover:bg-hover border-b border-stroke_soft last:border-b-0 no-underline hover:no-underline text-ink`}
            >
              <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>
              <span className="truncate">{c.name}</span>
              <span className="text-right tabular-nums">{fmtInt(c.notices)}</span>
              <span className="text-right tabular-nums">{fmtCompact(c.workers)}</span>
              <span className="hidden sm:block text-right tabular-nums text-ink_muted">{c.last_filed ?? "--"}</span>
            </Link>
          ))}
        </div>
      </Card>
      {total > 500 && !search && <p className="text-mini text-ink_muted mt-3">Showing top 500. Search to narrow.</p>}
    </div>
  );
}
