// Reusable primitives. Linear.app sizing: 18px root, 0.9375rem body.
import React from "react";
import { navigate } from "./router";

export const TABLE_HEADER_CLS = "text-mini font-medium text-ink_muted";
export const TABLE_ZEBRA_CLS = "[&>*:nth-child(even)]:bg-muted/30";

// Sort state is a column key, prefixed with "-" for descending. Right-aligned
// (numeric/date) columns sort descending on first click; text columns ascending.
export function SortHeader({ label, sortKey, sort, setSort, align = "left" }) {
  const active = sort === sortKey || sort === `-${sortKey}`;
  const desc = sort === `-${sortKey}`;
  const justify = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  const onClick = () => {
    if (!active) setSort(align === "right" ? `-${sortKey}` : sortKey);
    else setSort(desc ? sortKey : `-${sortKey}`);
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 cursor-pointer hover:text-ink tabular-nums text-${align} ${justify} ${active ? "text-ink" : ""}`}
    >
      <span>{label}</span>
      {active ? (
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={`text-ink shrink-0 ${desc ? "" : "rotate-180"}`}
          aria-hidden="true"
        >
          <path d="M2 4 L5 7 L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="8" height="10" viewBox="0 0 8 10" className="text-ink_faint shrink-0" aria-hidden="true">
          <path d="M2 4 L4 2 L6 4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M2 6 L4 8 L6 6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

// Official state WARN disclosure pages — the source each notice links back to.
export const STATE_WARN_URL = {
  CA: "https://edd.ca.gov/en/jobs_and_training/Layoff_Services_WARN/",
  TX: "https://www.twc.texas.gov/data-reports/warn-notice",
  GA: "https://www.tcsg.edu/warn-public-view/",
  FL: "https://reactwarn.floridajobs.org/warnlist/reports",
  NY: "https://dol.ny.gov/warn-dashboard",
  NJ: "https://www.nj.gov/labor/employer-services/warn/",
  MA: "https://www.mass.gov/info-details/worker-adjustment-and-retraining-notification-act-warn-layoff-and-closure-updates",
  VA: "https://www.vec.virginia.gov/warn-notices",
  OR: "https://ccwd.hecc.oregon.gov/layoff/warn",
  IA: "https://workforce.iowa.gov/employers/resources/warn",
  MT: "https://wsd.dli.mt.gov/wioa/related-links/warn-notice-page",
  RI: "https://dlt.ri.gov/employers/worker-adjustment-and-retraining-notification-warn",
  KY: "https://kcc.ky.gov/employer/Pages/Business-Downsizing-Assistance---WARN.aspx",
  AL: "https://workforce.alabama.gov/warn-list/",
  MD: "https://labor.maryland.gov/employment/warn.shtml",
  ID: "https://www.labor.idaho.gov/businesses/layoff-assistance/",
  LA: "https://www2.laworks.net/Downloads/Downloads_WFD.asp",
  NM: "https://www.dws.state.nm.us/Rapid-Response",
  NV: "https://detr.nv.gov/Page/WARN",
  SC: "https://scworks.org/employer/employer-programs/worker-adjustment-and-retraining-notification-warn-act",
  IL: "https://dceo.illinois.gov/workforcedevelopment/warn.html",
  IN: "https://www.in.gov/dwd/warn-notices/current-warn-notices/",
  MI: "https://www.michigan.gov/leo/bureaus-agencies/wd/data-public-notices/warn-notices",
  MN: "https://mn.gov/deed/business/layoff-resources/warn-archive/index.jsp",
  OH: "https://jfs.ohio.gov/warn/index.stm",
  PA: "https://www.pa.gov/agencies/dli/programs-services/workforce-development-home/warn-requirements/warn-notices",
  CO: "https://cdle.colorado.gov/employers/layoff-separations/layoff-warn-list",
  CT: "https://portal.ct.gov/dol/divisions/rapid-response/warn",
  AZ: "https://www.azjobconnection.gov/warn_info",
  DE: "https://joblink.delaware.gov/warn_info",
  KS: "https://www.kansasworks.com/warn_info",
  ME: "https://joblink.maine.gov/warn_info",
  VT: "https://www.vermontjoblink.com/warn_info",
  MO: "https://jobs.mo.gov/warn/2025",
  AK: "https://jobs.alaska.gov/rr/WARN_notices.htm",
  DC: "https://does.dc.gov/page/industry-closings-and-layoffs-warn-notifications-2025",
  NC: "https://www.commerce.nc.gov/data-tools-reports/labor-market-data-tools/workforce-warn-reports",
  WA: "https://esd.wa.gov/employer-requirements/layoffs-and-employee-notifications/worker-adjustment-and-retraining-notification-warn-layoff-and-closure-database",
  NE: "https://dol.nebraska.gov/ReemploymentServices/LayoffServices/LayoffsAndDownsizingWARN",
  OK: "https://www.employoklahoma.gov/Participants/s/warnnotices",
  SD: "https://dlr.sd.gov/workforce_services/businesses/warn_notices.aspx",
  TN: "https://www.tn.gov/workforce/employers/staffing-redirect/layoffs---unemployment/warn-notices.html",
  UT: "https://jobs.utah.gov/employer/business/warnnotices.html",
  WI: "https://dwd.wisconsin.gov/dislocatedworker/warn/",
  WV: "https://workforcewv.org/job-seeker/layoffs-downsizing/warn-listing/",
  ND: "https://www.jobsnd.com/unemployment-business-tax/employers-guide/employer-responsibilities-employee-separations",
};

export function fmtInt(n) {
  if (!n && n !== 0) return "--";
  return n.toLocaleString();
}

// Compact worker count: 12,453 -> "12.5K", 1,761 -> "1.8K", 421 -> "421"
export function fmtCompact(n) {
  if (n == null) return "--";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e4) return `${(n / 1e3).toFixed(1)}K`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

export function pct(n, digits = 0) {
  if (n == null) return "--";
  return `${n.toFixed(digits)}%`;
}

// Relative date: "today", "2d ago", "3w ago", "Jan 2024"
export function relDate(iso) {
  if (!iso) return "--";
  const d = new Date(iso + "T00:00:00Z");
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diff < 0) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 14) return `${diff}d ago`;
  if (diff < 90) return `${Math.floor(diff / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function fmtDate(iso) {
  if (!iso) return "--";
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Categorical chip. Lightly-rounded squares, regular weight, translucent backgrounds.
export function Pill({ tone = "neutral", children, size = "default" }) {
  const toneCls = {
    neutral: "bg-muted text-ink_muted",
    blue: "bg-[lch(93%_8_265)] text-[lch(38%_20_265)]",
    violet: "bg-[lch(93%_8_300)] text-[lch(38%_25_295)]",
    amber: "bg-[lch(94%_12_70)] text-[lch(38%_30_55)]",
    buy: "bg-buy_bg text-buy",
    sell: "bg-sell_bg text-sell",
    warn: "bg-warn_bg text-warn",
  }[tone];
  const sz = size === "xs" ? "text-[0.6875rem] px-[5px] py-[1px]" : "text-mini px-[6px] py-[2px]";
  return <span className={`inline-flex items-center rounded-[4px] font-[450] ${sz} ${toneCls}`}>{children}</span>;
}

// Map event_type -> tone + label. mass_layoff = sell red, closure = warn amber.
export function eventPill(type) {
  if (type === "closure") return { tone: "warn", label: "Closure" };
  if (type === "mass_layoff") return { tone: "sell", label: "Layoff" };
  if (type === "relocation") return { tone: "blue", label: "Relocation" };
  if (type === "amendment") return { tone: "neutral", label: "Amended" };
  if (type === "extension") return { tone: "neutral", label: "Extension" };
  return { tone: "neutral", label: type || "Unknown" };
}

// Map state postal -> regional tone.
export function statePill(state) {
  return { tone: "neutral", label: state };
}

export function Link({ to, className = "", children, onClick, ...rest }) {
  return (
    <a
      href={to}
      className={`text-accent hover:underline underline-offset-2 ${className}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        onClick?.(e);
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function Card({ children, className = "" }) {
  return <div className={`border border-stroke rounded-md bg-panel ${className}`}>{children}</div>;
}

export function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-4">
      <div className="min-w-0">
        <h2 className="text-large font-semibold text-ink tracking-[-0.005em]">{title}</h2>
        {subtitle && <p className="text-small text-ink_muted mt-[2px]">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0 whitespace-nowrap">{right}</div>}
    </div>
  );
}

export function PropertyLabel({ children, className = "" }) {
  return <div className={`text-mini text-ink_muted ${className}`}>{children}</div>;
}

// Responsive stat grid: 2-up on mobile, 4-up on desktop, with clean dividers on
// both axes and non-wrapping values. Used for the headline stat rail and the
// company/state summary cards so they stay aligned at every width.
export function StatGrid({ items }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 bg-panel rounded-md overflow-hidden">
      {items.map((it, i) => {
        const cls = [
          "px-4 sm:px-5 py-4 min-w-0 border-stroke",
          i % 2 !== 0 ? "border-l" : "", // mobile: 2nd column
          i >= 2 ? "border-t" : "", // mobile: rows after the first
          "sm:border-t-0", // desktop is a single row
          i % 4 === 0 ? "sm:border-l-0" : "sm:border-l", // desktop: divider between every column
        ].join(" ");
        return (
          <div key={it.label} className={cls}>
            <PropertyLabel className="mb-1.5">{it.label}</PropertyLabel>
            <div className="text-regular sm:text-large font-semibold text-ink tabular-nums truncate">{it.value}</div>
          </div>
        );
      })}
    </div>
  );
}

export function Segmented({ value, onChange, options, size = "default" }) {
  const sz = size === "sm" ? "h-7 text-mini" : "h-8 text-small";
  return (
    <div className={`inline-flex items-center rounded-md border border-stroke bg-panel p-[2px] ${sz}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-2.5 h-full rounded-[5px] font-[450] transition-colors ${
              active ? "bg-muted text-ink" : "text-ink_muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Make a URL-safe company slug. Strips Inc/LLC/Corp/Ltd noise so links stay
// stable across filings of the same parent entity.
export function companySlug(name) {
  if (!name) return "unknown";
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|corp|corporation|ltd|lp|llp|co|company|the)\b\.?/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
