import React, { useEffect, useState } from "react";
import Leaderboard from "../components/Leaderboard";
import MonthlyTimeline from "../components/MonthlyTimeline";
import NoticesTable from "../components/NoticesTable";
import SectorChart from "../components/SectorChart";
import { ChangeTag, KeyFigures } from "../kit";
import { STATE_NAMES } from "../states";
import { useNavigate } from "../router";
import { companyPath, fmtDate, fmtInt, Link, SectionHeader } from "../ui";

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
  const h = data.headline;
  const asOf = fmtDate(stats.generatedAt.slice(0, 10));

  return (
    <>
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-2">
        <div className="max-w-3xl">
          <h1 className="dk-h1">US Layoffs Tracker</h1>
          <p className="text-regular text-ink_muted">
            Every US layoff disclosed under the WARN Act: {fmtInt(stats.totalNotices)} notices from state labor departments since {stats.earliestYear}, updated daily.
          </p>
        </div>
      </section>

      {/* Headline figures: one period for the whole row, named in the heading. The change compares like with like,
          only states that already reported a year earlier, so a newly added state never reads as a rise. */}
      {h && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-6">
          <KeyFigures
            title="Layoffs, past 12 months"
            description={`Workers named in WARN notices. Changes cover the ${h.comparableStates} states reporting in both years.`}
            date={`Up to and including ${asOf}`}
            items={[
              { label: "Workers affected", value: fmtInt(h.workers), note: <><ChangeTag value={h.workersChange} size="small" /> on the year before</> },
              { label: "Companies filing", value: fmtInt(h.companies), note: <><ChangeTag value={h.companiesChange} size="small" /> on the year before</> },
              h.largest && {
                label: "Largest layoff",
                value: <Link to={companyPath(h.largest.company)}>{h.largest.company}</Link>,
                note: `${fmtInt(h.largest.num_affected)} workers, ${STATE_NAMES[h.largest.state] ?? h.largest.state}`,
              },
              h.topState && {
                label: "Most affected state",
                value: <Link to={`/state/${h.topState.state}`}>{STATE_NAMES[h.topState.state] ?? h.topState.state}</Link>,
                note: `${fmtInt(h.topState.workers)} workers`,
              },
            ]}
          />
        </section>
      )}

      <section className="max-w-[1440px] mx-auto px-4 sm:px-6">
        <MapLoader stateStats={stateStats} window={mapWindow} />
      </section>

      <section className="max-w-[1440px] mx-auto px-4 sm:px-6">
        <MonthlyTimeline timeline={timeline} asOf={stats.generatedAt} />
      </section>

      {/* Latest filings sits below the map + timeline so the visual story
          (where + when) lands first, and the interactive table follows. */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-14">
        <SectionHeader
          title="Latest filings"
          subtitle="The newest WARN notices, by the date they were filed."
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
          subtitle="The largest single notices by workers affected."
          right={
            <Link to="/notices" className="text-small no-underline hover:no-underline">
              See all →
            </Link>
          }
        />
        <Leaderboard asOf={stats.generatedAt} topLayoffs={topLayoffs} totals={leaderboardTotals} limit={10} />
      </section>

      {sectors && sectors.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-6">
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
