import React, { lazy, Suspense, useEffect, useState } from "react";
import Leaderboard from "../components/Leaderboard";
import MonthlyTimeline from "../components/MonthlyTimeline";
import NoticesTable from "../components/NoticesTable";
import SectorChart from "../components/SectorChart";
import StatRail from "../components/StatRail";
import { Link, SectionHeader } from "../ui";

// The map ships ~50KB gz of d3-geo + US geometry. Code-split it so the landing
// paints from the 7KB overview.json first and the map streams in after.
const LayoffsMap = lazy(() => import("../components/LayoffsMap"));

// The Overview page is the Reddit landing experience. It deliberately doesn't
// touch sql.js — we fetch a small pre-aggregated JSON (~7 KB gzipped) instead,
// so the first paint costs ~80 KB on the wire and ~4 MB JS heap. SQLite is
// loaded only when the user navigates to a deeper page.
function useOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/data/overview.json")
      .then((r) => {
        if (!r.ok) throw new Error(`overview.json: ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { data, error };
}

export default function OverviewPage() {
  const { data, error } = useOverview();

  if (error) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8">
        <p className="text-small text-ink_muted">Could not load overview: {String(error.message ?? error)}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-10 animate-pulse">
        <div className="h-10 w-3/4 bg-muted rounded mb-3" />
        <div className="h-4 w-2/3 bg-muted rounded mb-8" />
        <div className="h-24 w-full bg-muted/40 rounded mb-8" />
        <div className="h-[520px] w-full bg-muted/30 rounded" />
      </div>
    );
  }

  const { stats, timeline, topLayoffs, leaderboardTotals, recent, stateStats, mapWindow, sectors, sectorsClassified } =
    data;
  const headline = "Monitor every US layoff disclosed under the WARN Act";
  const subline =
    "The federal WARN Act requires employers with 100+ workers to give 60 days notice before mass layoffs or plant closings (different thresholds by state, but roughly: 50+ jobs lost). But the notices are scattered across 50 state websites, each with its own format, broken links, and no API.";

  return (
    <>
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-6">
        <div className="max-w-3xl">
          <h1 className="text-[2rem] sm:text-display font-semibold leading-[1.08] tracking-[-0.016em] text-ink mb-4">
            {headline}
          </h1>
          <p className="text-regular text-ink_muted">{subline}</p>
        </div>
        <div className="mt-8">
          <StatRail stats={stats} />
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-14">
        <Suspense fallback={<div className="border border-stroke rounded-md bg-panel h-[520px] animate-pulse" />}>
          <LayoffsMap stateStats={stateStats} window={mapWindow} />
        </Suspense>
      </section>

      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-14">
        <MonthlyTimeline timeline={timeline} />
      </section>

      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-14">
        <SectionHeader
          title="Biggest layoffs"
          right={
            <Link to="/notices" className="text-small no-underline hover:no-underline">
              See all →
            </Link>
          }
        />
        <Leaderboard topLayoffs={topLayoffs} totals={leaderboardTotals} limit={10} />
      </section>

      {sectors && sectors.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-14">
          <SectionHeader title="Layoffs by sector" />
          <SectorChart sectors={sectors} classified={sectorsClassified} />
        </section>
      )}

      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-20">
        <SectionHeader
          title="Latest filings"
          right={
            <Link to="/notices" className="text-small no-underline hover:no-underline">
              See all →
            </Link>
          }
        />
        <NoticesTable notices={recent} sortable={false} />
      </section>
    </>
  );
}
