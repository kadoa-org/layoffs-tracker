import React, { useEffect, useState } from "react";
import SearchPalette from "./components/SearchPalette";
import { useRoute } from "./router";
import { Link } from "./ui";

const TABS = [
  { to: "/", label: "Overview", match: "overview" },
  { to: "/notices", label: "Notices", match: "notices" },
  { to: "/companies", label: "Companies", match: "companies" },
  { to: "/states", label: "States", match: "states" },
  { to: "/about", label: "About", match: "about" },
];

// Mac vs Windows: show ⌘K on Mac, Ctrl+K elsewhere. SSR-safe default to ⌘K.
const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export default function Masthead() {
  const route = useRoute();
  const [searchOpen, setSearchOpen] = useState(false);

  // Global ⌘K / Ctrl+K. Skip while another modal is open (palette handles its
  // own Esc), and skip when the user is typing in a regular input.
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

  const activeTab = (() => {
    if (route.name === "company") return "companies";
    if (route.name === "state") return "states";
    return route.name;
  })();

  return (
    <header className="border-b border-stroke bg-canvas/95 backdrop-blur sticky top-0 z-30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-small font-semibold tracking-[-0.005em] text-ink no-underline hover:no-underline whitespace-nowrap"
          >
            <span className="text-[15px]">📉</span>
            US Layoffs Tracker
          </Link>
          <span className="hidden lg:inline-flex items-center gap-1 text-mini text-[#10b981] ml-1.5 whitespace-nowrap">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10b981]" />
            </span>
            updated daily
          </span>
        </div>
        <nav className="hidden md:flex items-center h-full">
          {TABS.map((t) => {
            const active = activeTab === t.match;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`relative h-12 flex items-center px-3 text-small font-medium no-underline hover:no-underline transition-colors ${
                  active ? "text-ink" : "text-ink_muted hover:text-ink"
                }`}
              >
                {t.label}
                {active && <span className="absolute left-2 right-2 bottom-[-1px] h-[2px] bg-accent rounded-t-full" />}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="hidden sm:flex items-center gap-2 h-7 pl-2 pr-1.5 rounded-md border border-stroke text-ink_muted hover:text-ink hover:border-ink_faint text-small bg-panel"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span className="text-ink_muted">Search...</span>
            <span className="hidden lg:inline-flex ml-4 items-center gap-[2px] text-mini text-ink_faint">
              <kbd className="px-1 py-[1px] rounded border border-stroke bg-muted font-mono text-[11px] leading-none">
                {isMac ? "⌘" : "Ctrl"}
              </kbd>
              <kbd className="px-1 py-[1px] rounded border border-stroke bg-muted font-mono text-[11px] leading-none">
                K
              </kbd>
            </span>
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="sm:hidden flex items-center justify-center w-7 h-7 rounded-md border border-stroke bg-panel text-ink_muted"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          <a
            href="https://github.com/kadoa-org/layoffs-tracker"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Star on GitHub"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 h-7 rounded-md bg-[#191919] text-white text-mini font-medium no-underline hover:no-underline hover:bg-[#333] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <span className="hidden lg:inline">Star on GitHub</span>
          </a>
        </div>
      </div>
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
