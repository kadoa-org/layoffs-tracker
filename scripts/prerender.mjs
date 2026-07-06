/**
 * Build-time prerender for SEO. Same approach as congress-trading-monitor:
 * the app is a client-rendered SPA, so without this every route serves the
 * homepage HTML and deep pages (states, companies) are invisible to search
 * engines. Runs after `vite build`, writes dist/<route>/index.html with
 * unique head tags + a crawler-visible content block, plus sitemap.xml and
 * robots.txt. Pure string templating from public/data/*.json - no browser.
 *
 * Company pages are capped at the top 1,500 by workers affected: the long
 * tail of 26k companies is mostly single-notice rows that would bloat the
 * sitemap without ranking for anything.
 *
 * Usage: node scripts/prerender.mjs   (wired into `npm run build`)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist", "layoffs"); // vite outDir (site lives under /layoffs/)
const DATA = path.join(ROOT, "public", "data");
const PREFIX = "/layoffs"; // public path prefix behind the www.kadoa.com reverse proxy
const BASE = `https://www.kadoa.com${PREFIX}`;
const TOP_COMPANIES = 1500;

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Must mirror companySlug in src/ui.jsx exactly so prerendered URLs match
// the client router's links.
function companySlug(name) {
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

const STATE_NAMES = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "Washington DC",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const fmtInt = (n) => Number(n ?? 0).toLocaleString("en-US");

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8"));
}

function buildRoutes() {
  const states = loadJson("states.json");
  const companiesRaw = loadJson("companies.json");
  const companies = [...companiesRaw].sort((a, b) => (b.workers ?? 0) - (a.workers ?? 0)).slice(0, TOP_COMPANIES);
  const routes = [];

  routes.push(
    {
      path: "/notices",
      title: "All WARN Notices - Searchable US Layoff Filings | US Layoffs Tracker",
      description:
        "Every WARN Act notice on file: company, state, workers affected, filing and effective dates. Searchable, sortable, updated daily from state labor departments.",
    },
    {
      path: "/companies",
      title: "Layoffs by Company - WARN Notice History | US Layoffs Tracker",
      description:
        "WARN notice history for 26,000+ companies: total notices, workers affected, states, and filing dates back to 1987.",
    },
    {
      path: "/states",
      title: "Layoffs by State - WARN Notices for All Reporting States | US Layoffs Tracker",
      description:
        "WARN Act layoff notices by state: notice counts, workers affected, and coverage windows for 46 reporting states.",
    },
    {
      path: "/about",
      title: "About the Data - How WARN Act Reporting Works | US Layoffs Tracker",
      description:
        "What the WARN Act requires, which states report, how this open dataset is collected from state labor departments, and its coverage back to 1987.",
    },
  );

  for (const s of states) {
    const full = STATE_NAMES[s.state] ?? s.state;
    routes.push({
      path: `/state/${s.state}`,
      title: `${full} WARN Notices - ${fmtInt(s.notices)} Layoff Filings | US Layoffs Tracker`,
      description: `${full} layoffs under the WARN Act: ${fmtInt(s.notices)} notices affecting ${fmtInt(s.workers)} workers across ${fmtInt(s.companies)} companies (${s.coverage}). Source: ${s.agency}.`,
      h1: `${full} WARN Notices & Layoffs`,
      body: `<p>${esc(full)} has ${fmtInt(s.notices)} WARN Act notices on file affecting ${fmtInt(s.workers)} workers across ${fmtInt(s.companies)} companies, covering ${esc(s.coverage)}. Data sourced from ${esc(s.agency)}.</p>`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: `${full} WARN Act layoff notices`,
        description: `WARN notices for ${full}: ${s.notices} filings, ${s.workers} workers affected.`,
        url: `${BASE}/state/${s.state}`,
        creator: { "@type": "Organization", name: "Kadoa", url: "https://www.kadoa.com" },
        license: "https://creativecommons.org/licenses/by/4.0/",
      },
    });
  }

  const seen = new Set();
  for (const c of companies) {
    const slug = companySlug(c.name);
    if (!slug || slug === "unknown" || seen.has(slug)) continue;
    seen.add(slug);
    routes.push({
      path: `/company/${slug}`,
      title: `${c.name} Layoffs - ${fmtInt(c.notices)} WARN Notices | US Layoffs Tracker`,
      description: `${c.name} has filed ${fmtInt(c.notices)} WARN notices affecting ${fmtInt(c.workers)} workers in ${fmtInt(c.states)} state${c.states === 1 ? "" : "s"} (${(c.first_filed ?? "").slice(0, 4)} to ${(c.last_filed ?? "").slice(0, 4)}).`,
      h1: `${c.name} Layoffs & WARN Notices`,
      body: `<p>${esc(c.name)} has filed ${fmtInt(c.notices)} WARN Act notices affecting ${fmtInt(c.workers)} workers in ${fmtInt(c.states)} state${c.states === 1 ? "" : "s"}, from ${esc((c.first_filed ?? "").slice(0, 4))} to ${esc((c.last_filed ?? "").slice(0, 4))}.</p>`,
    });
  }

  return routes;
}

function renderRoute(template, route) {
  const url = `${BASE}${route.path}`;
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(route.title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/s, `$1${esc(route.description)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(route.title)}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/s, `$1${esc(route.description)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(route.title)}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/s, `$1${esc(route.description)}$2`);

  if (route.jsonLd) {
    html = html.replace(
      "</head>",
      `<script type="application/ld+json">${JSON.stringify(route.jsonLd)}</script></head>`,
    );
  }
  if (route.h1) {
    html = html.replace(
      /(<div id="root">)(<\/div>)/,
      `$1<main><h1>${esc(route.h1)}</h1>${route.body ?? ""}<p><a href="${PREFIX}/">US Layoffs Tracker home</a></p></main>$2`,
    );
  }
  return html;
}

const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
const routes = buildRoutes();

let written = 0;
for (const r of routes) {
  const dir = path.join(DIST, r.path.slice(1));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), renderRoute(template, r));
  written++;
}

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${BASE}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
${routes
  .map(
    (r) =>
      `<url><loc>${BASE}${r.path}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>${r.path.split("/").length > 2 ? "0.7" : "0.9"}</priority></url>`,
  )
  .join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);

console.log(`prerendered ${written} routes + sitemap.xml (${routes.length + 1} urls) + robots.txt`);
