import { useMemo, useState } from "react";
import FilterBar, { defaultFilters, FILTER_KEYS, QUERY_DEFAULTS } from "../components/FilterBar";
import NoticesTable from "../components/NoticesTable";
import { useQueryState } from "../router";
import { DownloadCsvButton, downloadCsv, fmtInt, noticesToCsv, SectionHeader } from "../ui";
import { query, queryOne } from "../useDatabase";

const DISPLAY_LIMIT = 500;

const SIZE_BUCKETS = {
  small: { min: 0, max: 99 },
  medium: { min: 100, max: 499 },
  large: { min: 500, max: 999 },
  mega: { min: 1000, max: null },
};

const SINCE_DAYS = {
  "30d": 30,
  "90d": 90,
  ytd: "ytd",
  "12m": 365,
};

// Standard convention: "-key" is descending, plain "key" is ascending. The
// SortHeader's first-click rules match this (right-aligned numeric/date cols
// start at "-key" so the user sees biggest/newest first).
const SORT_MAP = {
  received_date: "received_date ASC NULLS LAST",
  "-received_date": "received_date DESC NULLS LAST",
  effective_date: "effective_date ASC NULLS LAST",
  "-effective_date": "effective_date DESC NULLS LAST",
  num_affected: "num_affected ASC NULLS LAST",
  "-num_affected": "num_affected DESC NULLS LAST",
  company: "company COLLATE NOCASE ASC",
  "-company": "company COLLATE NOCASE DESC",
  state: "state ASC",
  "-state": "state DESC",
  city: "city COLLATE NOCASE ASC NULLS LAST",
  "-city": "city COLLATE NOCASE DESC NULLS LAST",
  event_type: "event_type ASC NULLS LAST",
  "-event_type": "event_type DESC NULLS LAST",
};

// Translate the filter object into a (sql, params) pair that runs against the
// notices table. Filtering is pushed into SQLite — the page only materializes
// the LIMIT 500 display slice and a scalar COUNT(*), never the full 47K rows.
function buildWhere(f) {
  const where = [];
  const params = [];
  if (f.state && f.state !== "all") {
    where.push("state = ?");
    params.push(f.state);
  }
  if (f.type && f.type !== "all") {
    where.push("event_type = ?");
    params.push(f.type);
  }
  const bucket = SIZE_BUCKETS[f.size];
  if (bucket) {
    where.push("num_affected >= ?");
    params.push(bucket.min);
    if (bucket.max != null) {
      where.push("num_affected <= ?");
      params.push(bucket.max);
    }
  }
  const since = SINCE_DAYS[f.since];
  if (since != null) {
    let cutoff;
    if (since === "ytd") {
      cutoff = `${new Date().getFullYear()}-01-01`;
    } else {
      const d = new Date();
      d.setDate(d.getDate() - since);
      cutoff = d.toISOString().slice(0, 10);
    }
    where.push("COALESCE(received_date, effective_date) >= ?");
    params.push(cutoff);
  }
  const term = (f.search || "").trim().toLowerCase();
  if (term) {
    // Free-text search across company + city. County was searchable in the
    // old in-JS path but is mostly null and not worth a 3rd LIKE pattern.
    where.push("(lower(company) LIKE ? OR lower(city) LIKE ?)");
    params.push(`%${term}%`, `%${term}%`);
  }
  return { clause: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

function toFilters(qs) {
  return { ...defaultFilters, search: qs.q, state: qs.state, type: qs.type, size: qs.size, since: qs.since };
}

export default function NoticesPage({ db }) {
  const [qs, setQs] = useQueryState(FILTER_KEYS, QUERY_DEFAULTS);
  // Honor ?sort= from inbound links (e.g. clicking a header on the Overview
  // preview deep-links here with that sort already applied). Whitelist via
  // SORT_MAP so a hostile URL can't smuggle anything into the ORDER BY.
  const [sort, setSort] = useState(() => {
    const incoming = new URLSearchParams(window.location.search).get("sort");
    return incoming && SORT_MAP[incoming] ? incoming : "-received_date";
  });
  const filters = toFilters(qs);

  const setFilters = (updater) => {
    setQs((prev) => {
      const merged = typeof updater === "function" ? updater(toFilters(prev)) : { ...toFilters(prev), ...updater };
      return {
        q: merged.search,
        state: merged.state,
        type: merged.type,
        size: merged.size,
        since: merged.since,
      };
    });
  };

  // Pull the list of distinct states once for the FilterBar dropdown.
  // The states table is 43 rows; no need to scan notices.
  const stateOptions = useMemo(() => query(db, "SELECT state FROM states ORDER BY state").map((r) => r.state), [db]);

  const { rows, total } = useMemo(() => {
    const { clause, params } = buildWhere(filters);
    const orderBy = SORT_MAP[sort] ?? SORT_MAP.received_date;
    const rows = query(
      db,
      `SELECT id, state, company, city, county, num_affected,
              received_date, effective_date, event_type
       FROM notices
       ${clause}
       ORDER BY ${orderBy}
       LIMIT ${DISPLAY_LIMIT + 1}`,
      params,
    );
    const total = queryOne(db, `SELECT COUNT(*) AS n FROM notices ${clause}`, params)?.n ?? 0;
    return { rows, total };
  }, [db, filters, sort]);

  const showing = Math.min(rows.length, DISPLAY_LIMIT);
  const hasMore = rows.length > DISPLAY_LIMIT;

  // Export the FULL filtered/sorted set (not just the 500 shown), generated
  // client-side from sql.js. Re-runs the same WHERE/ORDER BY without the LIMIT.
  const exportCsv = () => {
    const { clause, params } = buildWhere(filters);
    const orderBy = SORT_MAP[sort] ?? SORT_MAP["-received_date"];
    const all = query(
      db,
      `SELECT company, state, city, county, num_affected, event_type, received_date, effective_date
       FROM notices ${clause} ORDER BY ${orderBy}`,
      params,
    );
    const tag = [filters.state !== "all" && filters.state, filters.type !== "all" && filters.type, filters.search]
      .filter(Boolean)
      .join("-")
      .replace(/[^\w-]/g, "")
      .toLowerCase();
    downloadCsv(`us-layoffs-warn${tag ? `-${tag}` : ""}.csv`, noticesToCsv(all));
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <SectionHeader
        title="All notices"
        subtitle={`${fmtInt(showing)} of ${fmtInt(total)}`}
        right={total > 0 ? <DownloadCsvButton onClick={exportCsv} count={total} /> : null}
      />
      <div className="mb-4">
        <FilterBar filters={filters} setFilters={setFilters} stateOptions={stateOptions} />
      </div>
      <NoticesTable notices={rows.slice(0, DISPLAY_LIMIT)} sort={sort} setSort={setSort} limit={DISPLAY_LIMIT} />
      {hasMore && (
        <p className="text-mini text-ink_muted mt-3">
          Showing first {DISPLAY_LIMIT}. Refine the filters to narrow further.
        </p>
      )}
    </div>
  );
}
