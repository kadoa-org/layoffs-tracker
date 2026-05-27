import { useEffect, useMemo, useRef, useState } from "react";

// Linear-style filter bar — ported from congress-trading-monitor.
// Chip-based applied filters + a "+ Filter" button → category picker → value picker.
// Adapted for layoffs domain: state, type, size, since.

// ---- Public exports: data model + filter predicate ------------------------------

export const defaultFilters = {
  search: "",
  state: "all",
  type: "all",
  size: "all",
  since: "all",
};

export const FILTER_KEYS = ["q", "state", "type", "size", "since"];
export const QUERY_DEFAULTS = {
  q: "",
  state: "all",
  type: "all",
  size: "all",
  since: "all",
};

const SIZE_BUCKETS = {
  all: () => true,
  small: (n) => n != null && n < 100,
  medium: (n) => n != null && n >= 100 && n < 500,
  large: (n) => n != null && n >= 500 && n < 1000,
  mega: (n) => n != null && n >= 1000,
};

const SINCE_DAYS = {
  all: null,
  "30d": 30,
  "90d": 90,
  ytd: "ytd",
  "12m": 365,
};

export function applyFilters(notices, f) {
  const term = (f.search || "").trim().toLowerCase();
  const sizeFn = SIZE_BUCKETS[f.size] ?? SIZE_BUCKETS.all;
  const sinceCfg = SINCE_DAYS[f.since];
  const sinceCutoff = (() => {
    if (sinceCfg == null) return null;
    if (sinceCfg === "ytd") return `${new Date().getFullYear()}-01-01`;
    const d = new Date();
    d.setDate(d.getDate() - sinceCfg);
    return d.toISOString().slice(0, 10);
  })();

  return notices.filter((n) => {
    if (f.state !== "all" && n.state !== f.state) return false;
    if (f.type !== "all" && n.event_type !== f.type) return false;
    if (!sizeFn(n.num_affected)) return false;
    if (sinceCutoff && (n.received_date ?? n.effective_date) < sinceCutoff) return false;
    if (term) {
      const hay = `${n.company} ${n.city ?? ""} ${n.county ?? ""}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
}

// ---- Icons ---------------------------------------------------------------------

const icon = {
  search: (
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
  ),
  state: (
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
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  type: (
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
      <path d="M3 6h18M3 12h18M3 18h12" />
    </svg>
  ),
  size: (
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
      <path d="M3 20h18M6 16V8M12 16V4M18 16v-6" />
    </svg>
  ),
  since: (
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  plus: (
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
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  close: (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  check: (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
};

// ---- Category definitions ------------------------------------------------------

function buildCategories(stateOptions) {
  const states = stateOptions ?? [];
  return [
    {
      key: "type",
      label: "Type",
      icon: icon.type,
      kind: "single",
      emptyValue: "all",
      options: [
        { k: "mass_layoff", label: "Layoff" },
        { k: "closure", label: "Closure" },
        { k: "amendment", label: "Amendment" },
        { k: "relocation", label: "Relocation" },
      ],
    },
    {
      key: "size",
      label: "Size",
      icon: icon.size,
      kind: "single",
      emptyValue: "all",
      options: [
        { k: "small", label: "< 100 workers" },
        { k: "medium", label: "100 - 499" },
        { k: "large", label: "500 - 999" },
        { k: "mega", label: "1,000+" },
      ],
    },
    {
      key: "since",
      label: "Date",
      icon: icon.since,
      kind: "single",
      emptyValue: "all",
      options: [
        { k: "30d", label: "Last 30 days" },
        { k: "90d", label: "Last 90 days" },
        { k: "ytd", label: "Year to date" },
        { k: "12m", label: "Last 12 months" },
      ],
    },
    {
      key: "state",
      label: "State",
      icon: icon.state,
      kind: "single",
      emptyValue: "all",
      options: [...states].sort().map((s) => ({ k: s, label: s })),
    },
  ];
}

// ---- FilterBar -----------------------------------------------------------------

export default function FilterBar({ filters, setFilters, stateOptions }) {
  const categories = useMemo(() => buildCategories(stateOptions), [stateOptions]);
  const categoryByKey = useMemo(() => Object.fromEntries(categories.map((c) => [c.key, c])), [categories]);

  const appliedKeys = categories
    .filter((c) => {
      const v = filters[c.key];
      return v !== undefined && v !== null && v !== c.emptyValue;
    })
    .map((c) => c.key);

  const availableForAdd = categories.filter((c) => !appliedKeys.includes(c.key));

  const [open, setOpen] = useState(null);
  const clearAll = () => setFilters({ ...defaultFilters });

  const anyApplied = appliedKeys.length > 0 || (filters.search ?? "") !== "";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <InlineSearch value={filters.search ?? ""} onChange={(v) => setFilters((prev) => ({ ...prev, search: v }))} />

      {appliedKeys.map((k) => (
        <FilterChip
          key={k}
          cat={categoryByKey[k]}
          value={filters[k]}
          onChange={(v) => setFilters((prev) => ({ ...prev, [k]: v }))}
          onRemove={() => setFilters((prev) => ({ ...prev, [k]: categoryByKey[k].emptyValue }))}
          open={open === k}
          setOpen={(o) => setOpen(o ? k : null)}
        />
      ))}

      <AddFilterButton
        categories={availableForAdd}
        onAdd={(catKey, v) => {
          setFilters((prev) => ({ ...prev, [catKey]: v }));
        }}
        open={open === "__add"}
        setOpen={(o) => setOpen(o ? "__add" : null)}
      />

      {anyApplied && (
        <button
          onClick={clearAll}
          className="ml-auto h-7 px-2 text-small text-ink_muted hover:text-ink transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}

// ---- Inline search -------------------------------------------------------------

function InlineSearch({ value, onChange }) {
  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-ink_faint pointer-events-none">{icon.search}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Company, city, county..."
        className="h-7 w-[220px] pl-7 pr-2 text-small bg-panel border border-stroke rounded-md placeholder:text-ink_faint text-ink focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/40"
      />
    </div>
  );
}

// ---- Filter chip ---------------------------------------------------------------

function FilterChip({ cat, value, onChange, onRemove, open, setOpen }) {
  const valueLabel = useMemo(() => {
    const opt = cat.options.find((o) => o.k === value);
    return opt?.label ?? value;
  }, [cat, value]);

  const btnRef = useRef(null);

  return (
    <div className="relative inline-flex items-stretch border border-stroke rounded-md bg-panel overflow-hidden h-7 text-small">
      <span className="inline-flex items-center gap-1.5 pl-2 pr-1.5 text-ink_muted border-r border-stroke">
        <span className="text-ink_muted">{cat.icon}</span>
        <span className="font-medium text-ink">{cat.label}</span>
      </span>
      <span className="inline-flex items-center px-1.5 text-ink_muted border-r border-stroke">is</span>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2 text-ink hover:bg-muted transition-colors"
      >
        <span className="font-medium">{valueLabel}</span>
      </button>
      <button
        onClick={onRemove}
        className="inline-flex items-center px-1.5 text-ink_muted hover:text-ink hover:bg-muted transition-colors"
        aria-label={`Remove ${cat.label} filter`}
      >
        {icon.close}
      </button>
      {open && (
        <Popover anchor={btnRef} onClose={() => setOpen(false)}>
          <ValuePicker
            cat={cat}
            value={value}
            onPick={(v) => {
              onChange(v);
              setOpen(false);
            }}
          />
        </Popover>
      )}
    </div>
  );
}

// ---- Add filter button + popover ----------------------------------------------

function AddFilterButton({ categories, onAdd, open, setOpen }) {
  const btnRef = useRef(null);
  const [activeCat, setActiveCat] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setActiveCat(null);
      setQuery("");
    }
  }, [open]);

  if (categories.length === 0) return null;
  const filtered = query ? categories.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())) : categories;

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-stroke bg-panel text-small text-ink_muted hover:text-ink hover:border-ink_faint transition-colors"
      >
        <span>{icon.plus}</span>
        <span>Filter</span>
      </button>
      {open && (
        <Popover anchor={btnRef} onClose={() => setOpen(false)}>
          <div className="min-w-[220px]">
            <div className="p-1.5 border-b border-stroke">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter..."
                className="w-full h-7 px-2 text-small bg-transparent border-none outline-none placeholder:text-ink_faint"
              />
            </div>
            <div className="py-1 max-h-[300px] overflow-y-auto">
              {filtered.map((c) => (
                <CategoryRow
                  key={c.key}
                  cat={c}
                  active={activeCat === c.key}
                  onHover={() => setActiveCat(c.key)}
                  onSelect={(v) => {
                    onAdd(c.key, v);
                    setOpen(false);
                  }}
                />
              ))}
              {filtered.length === 0 && <div className="px-3 py-2 text-small text-ink_muted">No filters match.</div>}
            </div>
          </div>
        </Popover>
      )}
    </div>
  );
}

function CategoryRow({ cat, active, onHover, onSelect }) {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const rowRef = useRef(null);

  return (
    <div
      ref={rowRef}
      onMouseEnter={() => {
        onHover();
        if (window.matchMedia?.("(hover: hover)").matches) {
          setSubmenuOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (window.matchMedia?.("(hover: hover)").matches) setSubmenuOpen(false);
      }}
    >
      <button
        onClick={() => setSubmenuOpen(true)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-small text-left hover:bg-muted/70 ${
          active ? "bg-muted/50" : ""
        }`}
      >
        <span className="text-ink_muted">{cat.icon}</span>
        <span className="text-ink flex-1">{cat.label}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          className="text-ink_muted"
        >
          <path d="M3.5 2l3 3-3 3" />
        </svg>
      </button>
      {submenuOpen && (
        <Popover anchor={rowRef} placement="right" onClose={() => setSubmenuOpen(false)}>
          <ValuePicker cat={cat} value={cat.emptyValue} onPick={onSelect} />
        </Popover>
      )}
    </div>
  );
}

// ---- Value picker -------------------------------------------------------------

function ValuePicker({ cat, value, onPick }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return cat.options;
    return cat.options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  }, [cat, q]);

  return (
    <div className="min-w-[200px] max-h-[320px] overflow-auto">
      {cat.options.length > 8 && (
        <div className="p-1.5 border-b border-stroke">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            className="w-full h-7 px-2 text-small bg-transparent border-none outline-none placeholder:text-ink_faint"
          />
        </div>
      )}
      <div className="py-1">
        {filtered.map((o) => (
          <button
            key={o.k}
            onClick={() => onPick(o.k)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-small text-left text-ink hover:bg-muted/70"
          >
            <span className="w-3 text-accent">{value === o.k ? icon.check : null}</span>
            <span className="flex-1">{o.label}</span>
          </button>
        ))}
        {filtered.length === 0 && <div className="px-3 py-2 text-small text-ink_muted">No matches.</div>}
      </div>
    </div>
  );
}

// ---- Shared popover (outside-click + escape close) ----------------------------

function Popover({ anchor, children, onClose, placement = "bottom" }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!anchor.current) return;
    const r = anchor.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const POPOVER_W = 240;
    if (placement === "right") {
      if (r.right + 4 + POPOVER_W > vw) {
        setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, vw - POPOVER_W - 8)) });
      } else {
        setPos({ top: r.top, left: r.right + 4 });
      }
    } else {
      const left = Math.max(8, Math.min(r.left, vw - POPOVER_W - 8));
      setPos({ top: r.bottom + 4, left });
    }
  }, [anchor, placement]);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (anchor.current?.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  if (!pos) return null;
  return (
    <div
      ref={ref}
      className="fixed z-50 bg-panel border border-stroke rounded-md shadow-hover"
      style={{ top: pos.top, left: pos.left }}
    >
      {children}
    </div>
  );
}
