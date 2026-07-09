import React, { useEffect, useState } from "react";
import SearchPalette from "./components/SearchPalette";
import { Button, GitHubButton, LiveBadge, NavBar, SiteHeader } from "./kit";
import { useRoute } from "./router";
import { Link } from "./ui";

const TABS = [
  { to: "/", label: "Overview", match: "overview" },
  { to: "/notices", label: "Notices", match: "notices" },
  { to: "/companies", label: "Companies", match: "companies" },
  { to: "/states", label: "States", match: "states" },
  { to: "/about", label: "About", match: "about" },
];

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

function freshness(generatedAt) {
  if (!generatedAt) return "Updated daily";
  const days = Math.floor((Date.now() - Date.parse(generatedAt)) / 86400_000);
  if (days <= 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  return `Updated ${days}d ago`;
}

// data-kit chrome: brand bar + tab navigation + freshness badge.
export default function Masthead() {
  const route = useRoute();
  const [searchOpen, setSearchOpen] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/stats.json`)
      .then((r) => r.json())
      .then((s) => setGeneratedAt(s?.generatedAt ?? null))
      .catch(() => {});
  }, []);

  const activeTab = (() => {
    if (route.name === "company") return "companies";
    if (route.name === "state") return "states";
    return route.name;
  })();

  return (
    <>
      <SiteHeader
        brand={
          <span className="dk-brand-lockup">
            <img src={`${import.meta.env.BASE_URL}kadoa-icon.svg`} alt="Kadoa" width="18" height="18" />
            US Layoffs Tracker
          </span>
        }
        LinkComponent={Link}
        brandSuffix={
          <a href="https://www.kadoa.com" target="_blank" rel="noreferrer" className="dk-header-link">
            by Kadoa
          </a>
        }
        right={
          <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <LiveBadge>{freshness(generatedAt)}</LiveBadge>
            <GitHubButton repo="kadoa-org/layoffs-tracker" />
            <Button inverse onClick={() => setSearchOpen(true)} aria-label="Search">
              Search {isMac ? "⌘K" : "Ctrl+K"}
            </Button>
            <a
              className="dk-btn dk-btn--brand"
              href="https://www.kadoa.com/contact"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              Book a demo
            </a>
          </span>
        }
      />
      <NavBar
        LinkComponent={Link}
        items={TABS.map((t) => ({ href: t.to, label: t.label, active: activeTab === t.match }))}
      />
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
