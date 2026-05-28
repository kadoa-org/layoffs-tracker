import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { navigate } from "../router";
import { companySlug, fmtCompact } from "../ui";

// All 50 + DC for navigation; we don't gate on coverage here. The State page
// itself handles missing-state messaging.
const STATES = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
];

const MAX_COMPANY_RESULTS = 8;
const MAX_STATE_RESULTS = 4;

// Companies live in a 4MB JSON. Lazy-load on first palette open, cache for the
// session. Keeps the Overview's first-paint payload unchanged.
let companiesCache = null;
let companiesPromise = null;
function loadCompanies() {
  if (companiesCache) return Promise.resolve(companiesCache);
  if (companiesPromise) return companiesPromise;
  companiesPromise = fetch("/data/companies.json")
    .then((r) => r.json())
    .then((data) => {
      companiesCache = data.map((c) => ({ ...c, _lower: c.name.toLowerCase() }));
      return companiesCache;
    });
  return companiesPromise;
}

export default function SearchPalette({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState(companiesCache);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  // Lazy-fetch on first open so we don't pay the 4MB cost up front.
  useEffect(() => {
    if (open && !companies) {
      loadCompanies().then((c) => setCompanies(c));
    }
  }, [open, companies]);

  // Focus the input + reset query on each open.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { companies: [], states: [] };
    const stateMatches = STATES.filter(
      ([code, name]) => code.toLowerCase().includes(q) || name.toLowerCase().includes(q),
    ).slice(0, MAX_STATE_RESULTS);
    const companyMatches = (companies ?? [])
      .filter((c) => c._lower.includes(q))
      // Bias toward bigger employers — workers is a better signal than notice count.
      .sort((a, b) => (b.workers || 0) - (a.workers || 0))
      .slice(0, MAX_COMPANY_RESULTS);
    return { companies: companyMatches, states: stateMatches };
  }, [query, companies]);

  // Flat list for keyboard navigation; companies first then states.
  const flat = useMemo(
    () => [
      ...results.companies.map((c) => ({ kind: "company", to: `/company/${companySlug(c.name)}`, item: c })),
      ...results.states.map(([code, name]) => ({ kind: "state", to: `/state/${code}`, item: { code, name } })),
    ],
    [results],
  );

  const go = useCallback(
    (idx) => {
      const hit = flat[idx];
      if (!hit) return;
      navigate(hit.to);
      onClose();
    },
    [flat, onClose],
  );

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(0, flat.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(active);
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-canvas border border-stroke rounded-lg shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 h-12 border-b border-stroke">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-ink_muted shrink-0"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search companies and states..."
            className="flex-1 bg-transparent outline-none text-regular text-ink placeholder:text-ink_faint"
          />
          <kbd className="text-mini text-ink_muted bg-muted border border-stroke rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!query && (
            <div className="px-4 py-8 text-center text-small text-ink_muted">
              Try{" "}
              <button onClick={() => setQuery("amazon")} className="text-accent hover:underline">
                Amazon
              </button>
              ,{" "}
              <button onClick={() => setQuery("california")} className="text-accent hover:underline">
                California
              </button>
              , or any company name.
            </div>
          )}
          {query && flat.length === 0 && companies && (
            <div className="px-4 py-8 text-center text-small text-ink_muted">No matches for "{query}".</div>
          )}
          {query && !companies && <div className="px-4 py-8 text-center text-small text-ink_muted">Loading...</div>}

          {results.companies.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-1 text-mini font-medium text-ink_faint uppercase tracking-wide">Companies</div>
              {results.companies.map((c, i) => {
                const idx = i;
                return (
                  <button
                    key={c.canon}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => go(idx)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-left ${
                      active === idx ? "bg-muted" : ""
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="text-mini font-medium bg-muted border border-stroke rounded w-5 h-5 flex items-center justify-center text-ink_muted shrink-0">
                        C
                      </span>
                      <span className="truncate text-small text-ink">{c.name}</span>
                    </div>
                    <div className="text-mini text-ink_muted whitespace-nowrap tabular-nums shrink-0">
                      {fmtCompact(c.workers)} workers · {c.notices} filings
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {results.states.length > 0 && (
            <div className="py-2 border-t border-stroke_soft">
              <div className="px-4 py-1 text-mini font-medium text-ink_faint uppercase tracking-wide">States</div>
              {results.states.map(([code, name], i) => {
                const idx = results.companies.length + i;
                return (
                  <button
                    key={code}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => go(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left ${active === idx ? "bg-muted" : ""}`}
                  >
                    <span className="text-mini font-medium bg-muted border border-stroke rounded w-5 h-5 flex items-center justify-center text-ink_muted shrink-0">
                      S
                    </span>
                    <span className="text-small text-ink">{name}</span>
                    <span className="text-mini text-ink_muted">{code}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-4 h-8 border-t border-stroke text-mini text-ink_muted">
          <span className="flex items-center gap-1">
            <kbd className="bg-muted border border-stroke rounded px-1">↑</kbd>
            <kbd className="bg-muted border border-stroke rounded px-1">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-muted border border-stroke rounded px-1">↵</kbd>
            open
          </span>
        </div>
      </div>
    </div>
  );
}
