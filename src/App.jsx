import React, { useEffect } from "react";
import Masthead from "./Masthead";
import AboutPage from "./pages/AboutPage";
import CompaniesPage from "./pages/CompaniesPage";
import CompanyPage from "./pages/CompanyPage";
import NoticesPage from "./pages/NoticesPage";
import OverviewPage from "./pages/OverviewPage";
import StatePage from "./pages/StatePage";
import StatesPage from "./pages/StatesPage";
import { useRoute } from "./router";
import { useDatabase } from "./useDatabase";

// Routes that need the full SQLite database. Overview + About render from
// static JSON (overview.json) and pure markup, so Reddit visitors don't pay
// the ~6 MB sql.js + DB cost up front.
const ROUTES_NEEDING_DB = new Set(["notices", "companies", "states", "company", "state"]);

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-20">
        <div className="h-4 w-40 bg-muted rounded animate-pulse mb-4" />
        <div className="h-10 w-3/4 bg-muted rounded animate-pulse mb-3" />
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse mb-8" />
        <div className="border border-[#b1b4b6]  bg-panel overflow-hidden">
          {/* 2 cols on mobile, 3 at sm, 5 at md+. A fixed grid-cols-5 forced
              ~450px of min width and overflowed the phone viewport during load.
              Borders are drawn with divide-* so wrapped rows don't leave a
              dangling right border. */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-stroke">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-4 sm:px-5">
                <div className="h-3 w-16 max-w-full bg-muted rounded animate-pulse mb-3" />
                <div className="h-6 w-20 max-w-full bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 h-6 w-64 bg-muted rounded animate-pulse" />
        <div className="mt-4 border border-[#b1b4b6]  bg-panel p-4 animate-pulse h-[520px]" />
      </div>
    </div>
  );
}

function ErrorScreen({ error }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-large font-semibold text-ink mb-2">Could not load the dataset</h1>
        <p className="text-small text-ink_muted">{String(error?.message ?? error)}</p>
      </div>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const needsDb = ROUTES_NEEDING_DB.has(route.name);
  // useDatabase is keyed by `enabled`; the hook itself decides whether to
  // kick off the sql.js + DB fetch. On the Overview/About paths nothing is
  // loaded until the user navigates somewhere that needs it.
  const { db, loading, error } = useDatabase(needsDb);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name, route.slug, route.code]);

  if (needsDb && error) return <ErrorScreen error={error} />;
  if (needsDb && (loading || !db)) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <Masthead />
        <LoadingScreen />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Masthead />
      {route.name === "overview" && <OverviewPage />}
      {route.name === "notices" && <NoticesPage db={db} />}
      {route.name === "companies" && <CompaniesPage db={db} />}
      {route.name === "states" && <StatesPage db={db} />}
      {route.name === "company" && <CompanyPage slug={route.slug} db={db} />}
      {route.name === "state" && <StatePage code={route.code} db={db} />}
      {route.name === "about" && <AboutPage />}
    </div>
  );
}
