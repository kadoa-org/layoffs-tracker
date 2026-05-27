import React, { useMemo } from "react";
import NoticesTable from "../components/NoticesTable";
import { Card, companySlug, fmtCompact, fmtDate, fmtInt, Link, SectionHeader, StatGrid } from "../ui";
import { query } from "../useDatabase";

export default function CompanyPage({ slug, db }) {
  // Pull every notice that hashes to this slug. We can't index on the slug
  // directly so we filter by canonical company name patterns.
  // Strategy: candidate-match by name fragment, then filter by canonical slug
  // in JS. This keeps SQL simple and covers DBA/Inc/LLC variants of the same
  // brand without needing a separate index.
  const filtered = useMemo(() => {
    if (!slug) return [];
    // Try a first-letter prefix to narrow the scan
    const firstChars = slug.replace(/-/g, " ").trim().slice(0, 3).toLowerCase();
    const candidates = query(
      db,
      `SELECT id, state, company, city, county, num_affected,
              received_date, effective_date, event_type
       FROM notices
       WHERE lower(company) LIKE ?`,
      [`${firstChars}%`],
    );
    return candidates.filter((n) => companySlug(n.company) === slug);
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
        <h1 className="text-title font-semibold text-ink tracking-[-0.012em]">{name}</h1>
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
      <SectionHeader title="Filing history" />
      <NoticesTable notices={sorted} sort="received_date" setSort={() => {}} />
    </div>
  );
}
