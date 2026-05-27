/**
 * Build the client-side SQLite database from the viz JSON files exported by the
 * dataset's vizDataExporter.
 *
 * Run:
 *   bun scripts/build-db.js
 *
 * Memory strategy:
 * - `notices` is the raw row store (one row per filing). Always queried with
 *   tight WHERE + LIMIT clauses, never `SELECT * FROM notices`.
 * - `timeline_monthly` / `timeline_yearly` are pre-aggregated buckets. The
 *   Overview chart reads ~340 monthly rows or ~40 yearly rows, never the
 *   underlying 47K notices.
 * - `top_layoffs_*` are pre-sliced leaderboards (top 100 by num_affected within
 *   YTD / 12m / all-time), so the Overview leaderboard reads at most 100 rows.
 * - `companies` / `states` are already aggregates.
 *
 * Result: the Overview page touches under 600 rows total, even though the
 * database itself indexes 47K filings.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "public", "data");

// Canonical NAICS 2-digit sectors (census.gov/naics). The manufacturing,
// retail, and transportation sectors span code ranges, so 31/32/33, 44/45,
// 48/49 all collapse to one label.
const NAICS_SECTORS = {
  11: "Agriculture, Forestry & Fishing",
  21: "Mining, Quarrying, Oil & Gas",
  22: "Utilities",
  23: "Construction",
  31: "Manufacturing",
  32: "Manufacturing",
  33: "Manufacturing",
  42: "Wholesale Trade",
  44: "Retail Trade",
  45: "Retail Trade",
  48: "Transportation & Warehousing",
  49: "Transportation & Warehousing",
  51: "Information",
  52: "Finance & Insurance",
  53: "Real Estate & Rental",
  54: "Professional & Technical Services",
  55: "Management of Companies",
  56: "Administrative & Waste Services",
  61: "Educational Services",
  62: "Health Care & Social Assistance",
  71: "Arts, Entertainment & Recreation",
  72: "Accommodation & Food Services",
  81: "Other Services",
  92: "Public Administration",
};

// Keyword fallback for industry strings that carry no NAICS code (e.g. "Retail
// Trade", "Call Center"). Ordered: first match wins.
const NAICS_KEYWORDS = [
  [/manufactur|pharmaceutical|factory|plant/, "Manufacturing"],
  [/wholesale/, "Wholesale Trade"],
  [/retail|store/, "Retail Trade"],
  [/health|hospital|medical|\bcare\b|nursing|clinic/, "Health Care & Social Assistance"],
  [/transport|warehous|logistic|trucking|airline|aviation/, "Transportation & Warehousing"],
  [/construction|contractor/, "Construction"],
  [/financ|insurance|\bbank|credit|invest/, "Finance & Insurance"],
  [/information|software|\btech|\bdata\b|telecom|media|publish|internet/, "Information"],
  [/professional|scientific|engineering|consulting|legal|account|research/, "Professional & Technical Services"],
  [/accommodation|food|restaurant|hotel|hospitality|catering/, "Accommodation & Food Services"],
  [/education|school|university|college|academ/, "Educational Services"],
  [/administrative|support|waste|call center|staffing|security/, "Administrative & Waste Services"],
  [/real estate|rental|leasing/, "Real Estate & Rental"],
  [/arts|entertainment|recreation|casino|gaming|fitness/, "Arts, Entertainment & Recreation"],
  [/agricultur|forestry|fishing|farm/, "Agriculture, Forestry & Fishing"],
  [/mining|quarry|\boil\b|\bgas\b|petroleum/, "Mining, Quarrying, Oil & Gas"],
  [/utilit|electric|power|water/, "Utilities"],
  [/management of companies|headquarters|holding/, "Management of Companies"],
  [/public admin|government|municipal/, "Public Administration"],
];

// Map a messy industry string to a canonical NAICS sector, or null.
function naicsSector(raw) {
  if (!raw) return null;
  const code = String(raw).match(/\b(\d{2})(?:[-,\s]*\d+)?/);
  if (code && NAICS_SECTORS[Number(code[1])]) return NAICS_SECTORS[Number(code[1])];
  const lower = String(raw).toLowerCase();
  for (const [re, sector] of NAICS_KEYWORDS) if (re.test(lower)) return sector;
  return null;
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // 1 KB pages cut padding overhead on tall narrow tables.
  db.run("PRAGMA page_size = 1024");
  db.run("PRAGMA journal_mode = OFF");
  db.run("PRAGMA synchronous = OFF");

  // ── Schema ────────────────────────────────────────────────────────────────
  // Notices: dropped source_id (debug-only) and industry (mostly null and not
  // surfaced anywhere in the UI).
  db.run(`
    CREATE TABLE notices (
      id TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      company TEXT NOT NULL,
      city TEXT,
      county TEXT,
      num_affected INTEGER,
      received_date TEXT,
      effective_date TEXT,
      event_type TEXT
    )
  `);
  db.run(`
    CREATE TABLE companies (
      canon TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      notices INTEGER,
      workers INTEGER,
      states INTEGER,
      last_filed TEXT,
      first_filed TEXT
    )
  `);
  db.run(`
    CREATE TABLE states (
      state TEXT PRIMARY KEY,
      agency TEXT,
      notices INTEGER,
      workers INTEGER,
      companies INTEGER,
      last_filed TEXT,
      first_filed TEXT,
      coverage TEXT
    )
  `);
  db.run(`
    CREATE TABLE stats (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
  // Pre-aggregated timeline buckets. month is "YYYY-MM"; year is "YYYY".
  db.run(`
    CREATE TABLE timeline_monthly (
      month TEXT PRIMARY KEY,
      notices INTEGER NOT NULL,
      workers INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE timeline_yearly (
      year TEXT PRIMARY KEY,
      notices INTEGER NOT NULL,
      workers INTEGER NOT NULL
    )
  `);
  // Pre-sliced leaderboards. range is one of "ytd" / "12m" / "all".
  db.run(`
    CREATE TABLE top_layoffs (
      range TEXT NOT NULL,
      rank INTEGER NOT NULL,
      id TEXT NOT NULL,
      state TEXT NOT NULL,
      company TEXT NOT NULL,
      city TEXT,
      num_affected INTEGER NOT NULL,
      received_date TEXT,
      effective_date TEXT,
      event_type TEXT,
      PRIMARY KEY (range, rank)
    )
  `);

  // Indexes only on access paths the UI actually walks.
  // - idx_notices_received: recent-filings LIMIT 15 on Overview, State page sort.
  // - idx_notices_state: State page lookups.
  // (Sorting by num_affected happens once at build time for top_layoffs, so we
  // don't pay the bytes for a runtime workers index.)
  db.run("CREATE INDEX idx_notices_received ON notices(received_date DESC)");
  db.run("CREATE INDEX idx_notices_state ON notices(state)");

  // ── Load JSON ─────────────────────────────────────────────────────────────
  const notices = JSON.parse(readFileSync(join(DATA_DIR, "notices.json"), "utf-8"));
  const companies = JSON.parse(readFileSync(join(DATA_DIR, "companies.json"), "utf-8"));
  const states = JSON.parse(readFileSync(join(DATA_DIR, "states.json"), "utf-8"));
  const stats = JSON.parse(readFileSync(join(DATA_DIR, "stats.json"), "utf-8"));

  // ── Insert notices ────────────────────────────────────────────────────────
  const noticeStmt = db.prepare("INSERT INTO notices VALUES (?,?,?,?,?,?,?,?,?)");
  db.run("BEGIN");
  for (const n of notices) {
    noticeStmt.run([
      n.id,
      n.state,
      n.company,
      n.city ?? null,
      n.county ?? null,
      n.num_affected ?? null,
      n.received_date ?? null,
      n.effective_date ?? null,
      n.event_type ?? null,
    ]);
  }
  db.run("COMMIT");
  noticeStmt.free();

  // ── Insert companies ─────────────────────────────────────────────────────
  const compStmt = db.prepare("INSERT INTO companies VALUES (?,?,?,?,?,?,?)");
  db.run("BEGIN");
  for (const c of companies) {
    compStmt.run([
      c.canon,
      c.name,
      c.notices,
      c.workers,
      c.states ?? null,
      c.last_filed ?? null,
      c.first_filed ?? null,
    ]);
  }
  db.run("COMMIT");
  compStmt.free();

  // ── Insert states ────────────────────────────────────────────────────────
  const stateStmt = db.prepare("INSERT INTO states VALUES (?,?,?,?,?,?,?,?)");
  db.run("BEGIN");
  for (const s of states) {
    stateStmt.run([
      s.state,
      s.agency ?? null,
      s.notices,
      s.workers,
      s.companies ?? null,
      s.last_filed ?? null,
      s.first_filed ?? null,
      s.coverage ?? null,
    ]);
  }
  db.run("COMMIT");
  stateStmt.free();

  // ── Insert stats KV ──────────────────────────────────────────────────────
  const statsStmt = db.prepare("INSERT INTO stats VALUES (?, ?)");
  for (const [k, v] of Object.entries(stats)) {
    statsStmt.run([k, typeof v === "string" ? v : JSON.stringify(v)]);
  }
  statsStmt.free();

  // ── Build aggregates from the inserted notices table ──────────────────────
  // We bucket by received_date (when the filing landed), not effective_date
  // (which scatters into the future and confuses the chart).
  // Bound at 1998 + today to drop the small handful of source-data typos
  // (years like 3030, 2121, etc) and not-yet-arrived effective dates.
  const todayMonth = new Date().toISOString().slice(0, 7);
  const todayYear = todayMonth.slice(0, 4);

  // Bucket by received_date, falling back to effective_date when a state only
  // publishes the effective layoff date (FL is 99.7% null received_date — without
  // the fallback its entire 2015-2026 history collapses into one month). The
  // `<= today` clamp drops the handful of future-dated effective rows so the
  // chart never shows bars past the current month.
  const bucketExpr = "COALESCE(received_date, effective_date)";
  db.run(
    `INSERT INTO timeline_monthly (month, notices, workers)
     SELECT substr(${bucketExpr}, 1, 7) AS month,
            COUNT(*) AS notices,
            COALESCE(SUM(num_affected), 0) AS workers
     FROM notices
     WHERE ${bucketExpr} IS NOT NULL
       AND substr(${bucketExpr}, 1, 7) >= '1998-01'
       AND substr(${bucketExpr}, 1, 7) <= ?
     GROUP BY month
     ORDER BY month`,
    [todayMonth],
  );
  db.run(
    `INSERT INTO timeline_yearly (year, notices, workers)
     SELECT substr(${bucketExpr}, 1, 4) AS year,
            COUNT(*) AS notices,
            COALESCE(SUM(num_affected), 0) AS workers
     FROM notices
     WHERE ${bucketExpr} IS NOT NULL
       AND substr(${bucketExpr}, 1, 4) >= '1998'
       AND substr(${bucketExpr}, 1, 4) <= ?
     GROUP BY year
     ORDER BY year`,
    [todayYear],
  );

  // Top layoffs leaderboards. Three ranges, top 100 each.
  const now = new Date();
  const ytdCutoff = `${now.getUTCFullYear()}-01-01`;
  const m12 = new Date(now);
  m12.setUTCMonth(m12.getUTCMonth() - 12);
  const m12Cutoff = m12.toISOString().slice(0, 10);

  const ranges = [
    { name: "ytd", cutoff: ytdCutoff },
    { name: "12m", cutoff: m12Cutoff },
    { name: "all", cutoff: null },
  ];
  const topStmt = db.prepare("INSERT INTO top_layoffs VALUES (?,?,?,?,?,?,?,?,?,?)");
  db.run("BEGIN");
  for (const r of ranges) {
    const where = r.cutoff
      ? "WHERE num_affected IS NOT NULL AND num_affected > 0 AND COALESCE(received_date, effective_date) >= ?"
      : "WHERE num_affected IS NOT NULL AND num_affected > 0";
    const sql = `SELECT id, state, company, city, num_affected, received_date, effective_date, event_type
                 FROM notices
                 ${where}
                 ORDER BY num_affected DESC
                 LIMIT 100`;
    const stmt = db.prepare(sql);
    if (r.cutoff) stmt.bind([r.cutoff]);
    let rank = 1;
    while (stmt.step()) {
      const row = stmt.getAsObject();
      topStmt.run([
        r.name,
        rank,
        row.id,
        row.state,
        row.company,
        row.city ?? null,
        row.num_affected,
        row.received_date ?? null,
        row.effective_date ?? null,
        row.event_type ?? null,
      ]);
      rank += 1;
    }
    stmt.free();
  }
  db.run("COMMIT");
  topStmt.free();

  // ── Emit overview.json — the static landing-page payload ──────────────────
  // Reddit visitors should never have to download sql.js + the full DB just to
  // see the dashboard. The Overview page reads this small JSON instead; sql.js
  // is loaded on-demand only when the user navigates to a deeper page.
  const overviewTimeline = {
    monthly: db
      .exec("SELECT month AS key, notices, workers FROM timeline_monthly ORDER BY month")[0]
      .values.map(([key, notices, workers]) => ({ key, notices, workers })),
    yearly: db
      .exec("SELECT year AS key, notices, workers FROM timeline_yearly ORDER BY year")[0]
      .values.map(([key, notices, workers]) => ({ key, notices, workers })),
  };
  const overviewTopByRange = {};
  for (const r of ["ytd", "12m", "all"]) {
    const rows = db.exec(
      `SELECT id, state, company, city, num_affected, received_date, effective_date, event_type
         FROM top_layoffs WHERE range = ? ORDER BY rank LIMIT 25`,
      [r],
    )[0];
    overviewTopByRange[r] = rows
      ? rows.values.map(([id, state, company, city, num_affected, received_date, effective_date, event_type]) => ({
          id,
          state,
          company,
          city,
          num_affected,
          received_date,
          effective_date,
          event_type,
        }))
      : [];
  }
  // Pre-compute the YTD / 12m / all totals so the Leaderboard header doesn't
  // need a SQL connection to show the "X workers" headline. We reuse the
  // cutoffs computed above for the top_layoffs slices.
  const totals = {};
  totals.ytd = db.exec(
    `SELECT COALESCE(SUM(num_affected), 0) FROM notices
     WHERE num_affected > 0 AND COALESCE(received_date, effective_date) >= ?`,
    [ytdCutoff],
  )[0].values[0][0];
  totals["12m"] = db.exec(
    `SELECT COALESCE(SUM(num_affected), 0) FROM notices
     WHERE num_affected > 0 AND COALESCE(received_date, effective_date) >= ?`,
    [m12Cutoff],
  )[0].values[0][0];
  totals.all = db.exec(`SELECT COALESCE(SUM(num_affected), 0) FROM notices WHERE num_affected > 0`)[0].values[0][0];

  const overviewRecent = db
    .exec(
      `SELECT id, state, company, city, num_affected, received_date, effective_date, event_type
       FROM notices WHERE received_date IS NOT NULL
       ORDER BY received_date DESC, effective_date DESC NULLS LAST, company ASC LIMIT 15`,
    )[0]
    .values.map(([id, state, company, city, num_affected, received_date, effective_date, event_type]) => ({
      id,
      state,
      company,
      city,
      num_affected,
      received_date,
      effective_date,
      event_type,
    }));

  // Per-state stats for the choropleth/bubble map. We carry both all-time and
  // trailing-12-month figures so the map can size bubbles by recent activity
  // while still distinguishing three states of coverage:
  //   - no notices at all  -> hatched ("no public WARN data")
  //   - notices, no counts -> marked ("reports notices, not worker counts": NY, OK)
  //   - notices + counts   -> proportional bubble
  const stateStatsRows = db.exec(
    `SELECT state,
            COUNT(*) AS notices_all,
            COALESCE(SUM(num_affected), 0) AS workers_all,
            SUM(CASE WHEN COALESCE(received_date, effective_date) >= ? THEN 1 ELSE 0 END) AS notices_12,
            COALESCE(SUM(CASE WHEN COALESCE(received_date, effective_date) >= ? AND num_affected > 0
                              THEN num_affected ELSE 0 END), 0) AS workers_12
     FROM notices
     GROUP BY state`,
    [m12Cutoff, m12Cutoff],
  )[0];
  const stateStats = {};
  if (stateStatsRows) {
    for (const [state, nAll, wAll, n12, w12] of stateStatsRows.values) {
      stateStats[state] = { noticesAll: nAll, workersAll: wAll, notices12mo: n12, workers12mo: w12 };
    }
  }

  // Layoffs by NAICS sector, aggregated from the notices that carry an industry.
  // Coverage is partial (only states that report industry), so the component
  // frames it as "among notices with reported industry".
  const sectorMap = new Map();
  let classified = 0;
  for (const n of notices) {
    const sector = naicsSector(n.industry);
    if (!sector) continue;
    classified++;
    const cur = sectorMap.get(sector) ?? { sector, notices: 0, workers: 0 };
    cur.notices += 1;
    cur.workers += n.num_affected ?? 0;
    sectorMap.set(sector, cur);
  }
  const sectors = [...sectorMap.values()].sort((a, b) => b.workers - a.workers);

  const overview = {
    stats,
    timeline: overviewTimeline,
    topLayoffs: overviewTopByRange,
    leaderboardTotals: totals,
    recent: overviewRecent,
    stateStats,
    mapWindow: { since: m12Cutoff, asOf: new Date().toISOString().slice(0, 10) },
    sectors,
    sectorsClassified: classified,
  };
  const overviewPath = join(DATA_DIR, "overview.json");
  writeFileSync(overviewPath, JSON.stringify(overview));

  // ── VACUUM to keep the file tight ────────────────────────────────────────
  db.run("VACUUM");

  const blob = db.export();
  const outPath = join(DATA_DIR, "layoffs.db");
  writeFileSync(outPath, Buffer.from(blob));

  // Report aggregate row counts so we can verify they're tiny.
  const aggCounts = db.exec(
    `SELECT 'timeline_monthly' AS t, COUNT(*) AS n FROM timeline_monthly
     UNION ALL SELECT 'timeline_yearly', COUNT(*) FROM timeline_yearly
     UNION ALL SELECT 'top_layoffs', COUNT(*) FROM top_layoffs`,
  )[0];

  console.log(`Built ${outPath}`);
  console.log(`  ${notices.length.toLocaleString()} notices`);
  console.log(`  ${companies.length.toLocaleString()} companies`);
  console.log(`  ${states.length} states`);
  for (const [t, n] of aggCounts.values) console.log(`  ${n} ${t} rows`);
  console.log(`  ${(blob.length / 1024).toFixed(1)} KB on disk`);

  db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
