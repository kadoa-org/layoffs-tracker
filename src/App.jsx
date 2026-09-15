import React, { useEffect, useMemo } from "react";
import { SiteFooter } from "./kit";
import Masthead from "./Masthead";
import AboutPage from "./pages/AboutPage";
import CompaniesPage from "./pages/CompaniesPage";
import CompanyPage from "./pages/CompanyPage";
import NoticesPage from "./pages/NoticesPage";
import OverviewPage from "./pages/OverviewPage";
import { readPageData } from "./pageData";
import StatePage from "./pages/StatePage";
import StatesPage from "./pages/StatesPage";
import { NavigationContext, navigate, useRoute } from "./router";
import { useDatabase } from "./useDatabase";

// Routes that need the full SQLite database. Overview + About render from
// static JSON (overview.json) and pure markup, so Reddit visitors don't pay
// the sql.js + full database download up front.
const ROUTES_NEEDING_DB = new Set(["notices", "companies", "states", "company", "state"]);

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-canvas" aria-busy="true">
      <p role="status" className="max-w-[1440px] mx-auto px-4 pt-8">Loading layoff data…</p>
      <div aria-hidden="true" className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8">
        <div className="h-4 w-40 bg-muted rounded mb-4" />
        <div className="h-10 w-3/4 bg-muted rounded mb-3" />
        <div className="h-4 w-2/3 bg-muted rounded mb-8" />
        <div className="border border-[#b1b4b6]  bg-panel overflow-hidden">
          {/* 2 cols on mobile, 3 at sm, 5 at md+. A fixed grid-cols-5 forced
              ~450px of min width and overflowed the phone viewport during load.
              Borders are drawn with divide-* so wrapped rows don't leave a
              dangling right border. */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-stroke">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-4 sm:px-5">
                <div className="h-3 w-16 max-w-full bg-muted rounded mb-3" />
                <div className="h-6 w-20 max-w-full bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 h-6 w-64 bg-muted rounded" />
        <div className="mt-4 border border-[#b1b4b6]  bg-panel p-4 h-[520px]" />
      </div>
    </div>
  );
}

export default function App({ initialPage = null }) {
  const route = useRoute(initialPage?.route);
  const needsDb = ROUTES_NEEDING_DB.has(route.name);
  const matches = initialPage && ["name", "slug", "code"].every(key => initialPage.route[key] === route[key]);
  const initialData = matches ? initialPage.data : null;
  const { db, error } = useDatabase(needsDb && (!initialData || route.name === "notices"));
  const data = useMemo(() => initialData ?? (db ? readPageData(db, route) : null), [initialData, db, route]);
  const pendingContent = (loadError) => loadError
    ? <p role="alert" className="max-w-[1440px] mx-auto px-4 py-8">Could not load the dataset: {String(loadError.message ?? loadError)}</p>
    : <LoadingScreen />;

  useEffect(() => { window.scrollTo(0, 0); }, [route.name, route.slug, route.code, route.page]);
  useEffect(() => {
    const link = document.head.querySelector('link[rel="canonical"]');
    if (link) link.href = `${window.location.origin}${window.location.pathname}`;
  }, [route]);

  return (
    <NavigationContext value={navigate}>
      <div className="min-h-screen bg-canvas text-ink">
        <Masthead route={route} />
        {needsDb && !data ? pendingContent(error) : <>
          {route.name === "overview" && <OverviewPage initialData={initialData} pendingContent={pendingContent} />}
          {route.name === "notices" && <NoticesPage db={db} initialData={data} error={error} />}
          {route.name === "companies" && <CompaniesPage initialRows={data.rows} page={route.page} filters={route.query} />}
          {route.name === "states" && <StatesPage initialRows={data.rows} />}
          {route.name === "company" && <CompanyPage slug={route.slug} initialRows={data.rows} />}
          {route.name === "state" && <StatePage code={route.code} initialData={data} />}
          {route.name === "about" && <AboutPage />}
        </>}
        <SiteFooter current="layoffs" />
      </div>
    </NavigationContext>
  );
}
