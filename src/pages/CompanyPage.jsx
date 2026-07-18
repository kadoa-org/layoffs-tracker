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
import { query } from "../useDatabase";

export default function CompanyPage({ slug, db }) {
  const [sort, setSort] = useState("-received_date");
  // Every notice carries a precomputed `slug` column (build-db.js runs the same
  // companySlug fn), indexed for exact lookup. This covers DBA/Inc/LLC variants
  // of the same brand and — unlike a prefix scan derived from the slug — matches
  // names whose punctuation is stripped ("AT&T" -> "att").
  const filtered = useMemo(() => {
    if (!slug) return [];
    return query(
      db,
      `SELECT id, state, company, city, county, num_affected,
              received_date, effective_date, event_type
       FROM notices
       WHERE slug = ?`,
      [slug],
    );
  }, [db, slug]);

  const totals = useMemo(() => {
    const workers = filtered.reduce((acc, n) => acc + (n.num_affected ?? 0), 0);
    const states = new Set(filtered.map((n) => n.state).filter(Boolean));
    const lastFiled = filtered
      .map((n) => n.received_date)
      .filter(Boolean)
      .sort()
      .pop();
    return { workers, states: states.size, lastFiled };
  }, [filtered]);

  if (filtered.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
        <p className="text-small text-ink_muted">
          No notices found for slug <code className="font-mono text-mini bg-muted px-1 rounded">{slug}</code>.{" "}
          <Link to="/companies">Back to companies</Link>
        </p>
      </div>
    );
  }

  const name = filtered[0].company;
  const sorted = [...filtered].sort((a, b) => (b.received_date ?? "").localeCompare(a.received_date ?? ""));

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <div className="mb-8">
        <p className="text-mini text-ink_muted mb-2">
          <Link to="/companies" className="no-underline hover:underline">
            Companies
          </Link>{" "}
          /
        </p>
        <h1 className="dk-h1" style={{ marginBottom: 2 }}>
          {name}
        </h1>
      </div>
      <Card className="mb-8 overflow-hidden">
        <StatGrid
          items={[
            { label: "Notices filed", value: fmtInt(filtered.length) },
            { label: "Workers affected", value: fmtCompact(totals.workers) },
            { label: "States", value: fmtInt(totals.states) },
            { label: "Latest filing", value: fmtDate(totals.lastFiled) },
          ]}
        />
      </Card>
      <SectionHeader
        title="Filing history"
        right={
          <DownloadCsvButton
            count={filtered.length}
            onClick={() => downloadCsv(`us-layoffs-warn-${slug}.csv`, noticesToCsv(sorted))}
          />
        }
      />
      <NoticesTable notices={sorted} sort={sort} setSort={setSort} />
    </div>
  );
}
