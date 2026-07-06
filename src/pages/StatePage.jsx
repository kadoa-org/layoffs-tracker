import React, { useMemo, useState } from "react";
import NoticesTable from "../components/NoticesTable";
import {
  Card,
  DownloadCsvButton,
  downloadCsv,
  fmtCompact,
  fmtDate,
  fmtInt,
  Link,
  noticesToCsv,
  SectionHeader,
  StatGrid,
} from "../ui";
import { query, queryOne } from "../useDatabase";

export default function StatePage({ code, db }) {
  const [sort, setSort] = useState("-received_date");
  // Pull pre-aggregated totals from the states table (43 rows) and only the
  // first 500 filings for display.
  const meta = useMemo(
    () => queryOne(db, "SELECT agency, notices, workers, companies, last_filed FROM states WHERE state = ?", [code]),
    [db, code],
  );
  const sorted = useMemo(
    () =>
      query(
        db,
        `SELECT id, state, company, city, county, num_affected,
                received_date, effective_date, event_type
         FROM notices
         WHERE state = ?
         ORDER BY received_date DESC NULLS LAST
         LIMIT 500`,
        [code],
      ),
    [db, code],
  );

  if (!meta) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
        <p className="text-small text-ink_muted">
          No notices found for state <code className="font-mono text-mini bg-muted px-1 rounded">{code}</code>.{" "}
          <Link to="/states">Back to states</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <div className="mb-8">
        <p className="text-mini text-ink_muted mb-2">
          <Link to="/states" className="no-underline hover:underline">
            States
          </Link>{" "}
          /
        </p>
        <h1 className="dk-h1" style={{ marginBottom: 2 }}>{code}</h1>
        {meta?.agency && <p className="text-small text-ink_muted mt-1">{meta.agency}</p>}
      </div>
      <Card className="mb-8 overflow-hidden">
        <StatGrid
          items={[
            { label: "Notices filed", value: fmtInt(meta.notices) },
            { label: "Workers affected", value: meta.workers > 0 ? fmtCompact(meta.workers) : "--" },
            { label: "Unique companies", value: fmtInt(meta.companies) },
            { label: "Latest filing", value: fmtDate(meta.last_filed) },
          ]}
        />
      </Card>
      <SectionHeader
        title="Filings"
        right={
          <DownloadCsvButton
            count={meta.notices}
            onClick={() => {
              const all = query(
                db,
                `SELECT company, state, city, county, num_affected, event_type, received_date, effective_date
                 FROM notices WHERE state = ? ORDER BY received_date DESC NULLS LAST`,
                [code],
              );
              downloadCsv(`us-layoffs-warn-${code.toLowerCase()}.csv`, noticesToCsv(all));
            }}
          />
        }
      />
      <NoticesTable notices={sorted} sort={sort} setSort={setSort} limit={500} />
    </div>
  );
}
