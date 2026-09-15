import React, { useEffect, useState } from "react";
import Leaderboard from "../components/Leaderboard";
import MonthlyTimeline from "../components/MonthlyTimeline";
import NoticesTable from "../components/NoticesTable";
import SectorChart from "../components/SectorChart";
import StatRail from "../components/StatRail";
import { useNavigate } from "../router";
import { Link, SectionHeader } from "../ui";

// The map ships ~50KB gz of d3-geo + US geometry. Code-split it so the landing
// paints from the 7KB overview.json first and the map streams in after.
function MapLoader(props) {
  const [Map, setMap] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let active = true;
    import("../components/LayoffsMap").then(module => { if (active) setMap(() => module.default); }).catch(error => { console.error("Layoffs map load failed", error); if (active) setError(error); });
    return () => { active = false; };
  }, []);
  return Map ? <Map {...props} /> : <div className="border border-stroke bg-muted h-[520px] p-4" aria-busy={!error}><p role={error ? "alert" : "status"}>{error ? "Could not load the map." : "Loading map…"}</p></div>;
}

// The Overview page is the Reddit landing experience. It deliberately doesn't
// touch sql.js — we fetch a small pre-aggregated JSON (~7 KB gzipped) instead,
// so the first paint costs ~80 KB on the wire and ~4 MB JS heap. SQLite is
// loaded only when the user navigates to a deeper page.
function useOverview(initialData) {
  const [data, setData] = useState(initialData ?? null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (initialData) return;
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/overview.json`)
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
  }, [initialData]);
  return { data, error };
}

export default function OverviewPage({ pendingContent, initialData }) {
  const navigate = useNavigate();
  const { data, error } = useOverview(initialData);

  if (error || !data) return pendingContent(error);

  const { stats, timeline, topLayoffs, leaderboardTotals, recent, stateStats, mapWindow, sectors, sectorsClassified } =
    data;
  const headline = "Monitor every US layoff disclosed under the WARN Act";
  const subline =
    "The federal WARN Act requires employers with 100+ workers to give 60 days notice before mass layoffs or plant closings (thresholds vary by state, but roughly 50+ jobs lost). This site is a fully open-source aggregator that makes the data easy to access.";

  return (
    <>
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-6">
        <div className="max-w-3xl">
          <h1 className="dk-h1">
            {headline}
          </h1>
          <p className="text-regular text-ink_muted">{subline}</p>
          <StatRail stats={stats} />
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-14">
        <MapLoader stateStats={stateStats} window={mapWindow} />
      </section>

      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-14">
        <MonthlyTimeline timeline={timeline} asOf={stats.generatedAt} />
      </section>

      {/* Latest filings sits below the map + timeline so the visual story
          (where + when) lands first, and the interactive table follows. */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-14">
        <SectionHeader
          title="Latest filings"
          right={
            <Link to="/notices" className="text-small no-underline hover:no-underline">
              See all →
            </Link>
          }
        />
        {/* Preview is a fixed 15-row slice; in-place sorting wouldn't help.
            Make the headers feel interactive by deep-linking to /notices
            with the requested sort applied. */}
        <NoticesTable compact
          notices={recent}
          sort={null}
          setSort={(key) => navigate(`/notices?sort=${encodeURIComponent(key)}`)}
        />
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
        <Leaderboard asOf={stats.generatedAt} topLayoffs={topLayoffs} totals={leaderboardTotals} limit={10} />
      </section>

      {sectors && sectors.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-20">
          <SectionHeader title="Layoffs by sector" />
          <SectorChart sectors={sectors} classified={sectorsClassified} />
        </section>
      )}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-12">
        <details><summary>Browse layoffs by state</summary>
          <ul>{(data.states ?? Object.keys(stateStats)).sort().map(state => <li key={state}><Link to={`/state/${state}`}>{state}</Link></li>)}</ul>
        </details>
        {data.topCompanies && <details><summary>Browse major employers</summary>
          <ul>{data.topCompanies.map(company => <li key={company.slug}><Link to={`/company/${company.slug}`}>{company.name}</Link></li>)}</ul>
        </details>}
        <p><Link to="/companies">Browse all companies</Link></p>
      </section>
    </>
  );
}
