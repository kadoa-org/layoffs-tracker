import React, { useEffect, useMemo, useRef, useState } from "react";
import { navigate } from "../router";
import { companySlug, fmtCompact } from "../ui";

// All 50 + DC for navigation. State coverage gating happens on the State page.
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

const TABS = [
  { id: "/", label: "Overview", hint: "Map + timeline + top filings" },
  { id: "/notices", label: "Notices", hint: "Filterable full table" },
  { id: "/companies", label: "Companies", hint: "Every company in the dataset" },
  { id: "/states", label: "States", hint: "Per-state breakdowns" },
  { id: "/about", label: "About", hint: "How the WARN Act works" },
];

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

// Linear-style command palette. Mirrors congress-trading-monitor's pattern:
// page jumps at top, fuzzy-filters companies + states, group headers, badge
// icons per row, kbd hints in the footer.
export default function SearchPalette({ open, onClose }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [companies, setCompanies] = useState(companiesCache);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setIdx(0);
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (open && !companies) loadCompanies().then((c) => setCompanies(c));
  }, [open, companies]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    const out = [];

    // Page jumps always available, even without a query, for fast keyboard nav.
    for (const t of TABS) if (!query || t.label.toLowerCase().includes(query)) out.push({ type: "page", ...t });

    const companyLimit = query ? 20 : 6;
    let companyCount = 0;
    for (const c of companies ?? []) {
      if (companyCount >= companyLimit) break;
      if (query && !c._lower.includes(query)) continue;
      // When there's no query, bias toward the biggest employers as "suggested".
      out.push({
        type: "company",
        id: `/company/${companySlug(c.name)}`,
        label: c.name,
        hint: `${c.states} ${c.states === 1 ? "state" : "states"} · last filed ${c.last_filed ?? "--"}`,
        right: `${fmtCompact(c.workers)} workers`,
      });
      companyCount++;
    }

    const stateLimit = query ? 12 : 4;
    let stateCount = 0;
    for (const [code, name] of STATES) {
      if (stateCount >= stateLimit) break;
      if (query && !code.toLowerCase().includes(query) && !name.toLowerCase().includes(query)) continue;
      out.push({ type: "state", id: `/state/${code}`, label: name, hint: code });
      stateCount++;
    }
    return out;
  }, [q, companies]);

  useEffect(() => {
    setIdx(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const pick = items[idx];
        if (pick) {
          onClose();
          navigate(pick.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, idx, onClose]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${idx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-[560px] bg-panel border border-stroke rounded-md shadow-hover overflow-hidden">
        <div className="flex items-center gap-2 px-3 border-b border-stroke h-11">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink_muted"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search companies, states, or jump to a view..."
            className="flex-1 bg-transparent text-regular placeholder:text-ink_faint text-ink focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded border border-stroke bg-muted font-mono text-mini text-ink_muted">
            Esc
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-auto py-1">
          {items.length === 0 && companies ? (
            <div className="px-3 py-6 text-small text-ink_muted text-center">No matches</div>
          ) : items.length === 0 && !companies ? (
            <div className="px-3 py-6 text-small text-ink_muted text-center">Loading...</div>
          ) : (
            (() => {
              let lastType = null;
              return items.map((it, i) => {
                const showHeader = it.type !== lastType;
                lastType = it.type;
                const groupLabel = { page: "Jump to", company: "Companies", state: "States" }[it.type];
                return (
                  <React.Fragment key={`${it.type}-${it.id}`}>
                    {showHeader && (
                      <div className="px-3 pt-2 pb-1 text-mini font-medium text-ink_muted">{groupLabel}</div>
                    )}
                    <button
                      data-idx={i}
                      onMouseEnter={() => setIdx(i)}
                      onClick={() => {
                        onClose();
                        navigate(it.id);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-[7px] text-small text-left ${
                        idx === i ? "bg-muted text-ink" : "text-ink_secondary hover:bg-muted/60"
                      }`}
                    >
                      <span className="w-5 h-5 flex items-center justify-center rounded bg-muted text-mini text-ink_muted font-mono">
                        {it.type === "company" ? "C" : it.type === "state" ? "S" : "→"}
                      </span>
                      <span className="flex-1 font-medium text-ink truncate">{it.label}</span>
                      <span className="text-mini text-ink_muted truncate max-w-[180px]">{it.hint}</span>
                      {it.right && (
                        <span className="text-mini text-ink_muted tabular-nums min-w-[88px] text-right">
                          {it.right}
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                );
              });
            })()
          )}
        </div>
        <div className="flex items-center gap-3 px-3 h-8 border-t border-stroke text-mini text-ink_muted">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 rounded border border-stroke bg-muted font-mono">↑</kbd>
            <kbd className="px-1 rounded border border-stroke bg-muted font-mono">↓</kbd>
            <span className="ml-1">navigate</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 rounded border border-stroke bg-muted font-mono">↵</kbd>
            <span className="ml-1">open</span>
          </span>
        </div>
      </div>
    </div>
  );
}
