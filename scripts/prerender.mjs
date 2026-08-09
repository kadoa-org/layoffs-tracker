/**
 * Build-time prerender for SEO. Same approach as congress-trading-monitor:
 * the app is a client-rendered SPA, so without this every route serves the
 * homepage HTML and deep pages (states, companies) are invisible to search
 * engines. Runs after `vite build`, writes dist/<route>/index.html with
 * unique head tags + a crawler-visible content block, plus sitemap.xml and
 * robots.txt. Pure string templating from public/data/*.json - no browser.
 *
 * Every company gets a prerendered page and a sitemap entry so Googlebot can
 * discover the full site (28k+ companies) without executing JS or crawling the
 * client-only /companies search. Each page carries a unique title/description
 * and an <h1> + summary paragraph.
 *
 * Usage: node scripts/prerender.mjs   (wired into `npm run build`)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { companySlug } from "../src/slug.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist", "layoffs"); // vite outDir (site lives under /layoffs/)
const DATA = path.join(ROOT, "public", "data");
const PREFIX = "/layoffs"; // public path prefix behind the www.kadoa.com reverse proxy
const BASE = `https://www.kadoa.com${PREFIX}`;

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// BreadcrumbList JSON-LD from [label, absoluteUrl] pairs (Home › Section › entity).
const crumbLd = (crumbs) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
});

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

const plural = (n, word) => `${fmtInt(n)} ${word}${n === 1 ? "" : "s"}`;

// schema.org/Dataset description must be 50-5000 characters or Google rejects
// the item outright. Short company names put the old one-liners at 43-49 chars
// ("Visa: 7 WARN filings, 884 workers affected."), which invalidated 330 items.
// Fail the build rather than ship markup Google will throw away.
const DATASET_DESC_MIN = 50;
const datasetDesc = (text, label) => {
  if (text.length < DATASET_DESC_MIN) {
    throw new Error(`Dataset description for ${label} is ${text.length} chars, needs >= ${DATASET_DESC_MIN}: ${text}`);
  }
  return text;
};

// A crawler-visible notices table. This is the substantive, unique content that
// keeps company pages from being thin one-line soft-404s: the same notices the
// live SPA renders, in static HTML.
const NOTICE_ROWS_CAP = 500; // ponytail: a handful of brands have 300+ filings; cap the page, raise if needed.
function noticesTable(rows) {
  const head = "<tr><th>Filed</th><th>Effective</th><th>State</th><th>City</th><th>Workers</th><th>Type</th></tr>";
  const body = rows
    .slice(0, NOTICE_ROWS_CAP)
    .map(
      (n) =>
        `<tr><td>${esc(n.received_date ?? "")}</td><td>${esc(n.effective_date ?? "")}</td><td>${esc(n.state ?? "")}</td><td>${esc(n.city ?? "")}</td><td>${esc(fmtInt(n.num_affected ?? 0))}</td><td>${esc(n.event_type ?? "")}</td></tr>`,
    )
    .join("");
  const more =
    rows.length > NOTICE_ROWS_CAP ? `<p>Showing ${fmtInt(NOTICE_ROWS_CAP)} of ${fmtInt(rows.length)} notices.</p>` : "";
  return `<table><thead>${head}</thead><tbody>${body}</tbody></table>${more}`;
}

function buildRoutes() {
  const states = loadJson("states.json");
  const companies = loadJson("companies.json");
  const notices = loadJson("notices.json");
  const routes = [];

  // Group notices by slug exactly as the client (companySlug) and DB do, so the
  // prerendered page matches what the SPA renders after hydration.
  const noticesBySlug = new Map();
  for (const n of notices) {
    const slug = companySlug(n.company);
    if (!slug || slug === "unknown") continue;
    if (!noticesBySlug.has(slug)) noticesBySlug.set(slug, []);
    noticesBySlug.get(slug).push(n);
  }
  // Best display name per slug: the companies.json row with the most notices
  // (several raw canon rows can collapse to one slug, e.g. Boeing / The Boeing Co).
  const nameBySlug = new Map();
  for (const c of companies) {
    const slug = companySlug(c.name);
    if (!slug || slug === "unknown") continue;
    const prev = nameBySlug.get(slug);
    if (!prev || (c.notices ?? 0) > prev.notices) nameBySlug.set(slug, { name: c.name, notices: c.notices ?? 0 });
  }

  // Full company index (one entry per emitted company page), ranked by workers.
  // Paginated below so every company page has an incoming internal link — the
  // fix for the "orphan pages" Site Audit error (companies were sitemap-only).
  const allCompanies = [...noticesBySlug.entries()]
    .map(([slug, rows]) => ({
      slug,
      name: nameBySlug.get(slug)?.name ?? rows[0].company,
      notices: rows.length,
      workers: rows.reduce((a, n) => a + (n.num_affected ?? 0), 0),
    }))
    .sort((a, b) => b.workers - a.workers);
  const COMPANIES_PER_PAGE = 300;
  const companyPageCount = Math.max(1, Math.ceil(allCompanies.length / COMPANIES_PER_PAGE));
  const companiesPath = (p) => (p === 1 ? "/companies" : `/companies/${p}`);
  const stateLinks = states
    .map(
      (s) =>
        `<li><a href="${PREFIX}/state/${s.state}">${esc(STATE_NAMES[s.state] ?? s.state)}</a> — ${plural(s.notices, "notice")}</li>`,
    )
    .join("");

  routes.push(
    {
      path: "/notices",
      title: "All WARN Notices - Searchable US Layoff Filings | US Layoffs Tracker",
      description:
        "Every WARN Act notice on file: company, state, workers affected, filing and effective dates. Searchable, sortable, updated daily from state labor departments.",
      h1: "All WARN Act Notices",
      body: `<p>Every US WARN Act layoff and plant-closure notice on file — searchable by company, state, workers affected, and filing date, updated daily from state labor departments. Browse <a href="${PREFIX}/companies">by company</a> or <a href="${PREFIX}/states">by state</a>.</p>`,
    },
    {
      path: "/states",
      title: "Layoffs by State - WARN Notices for All Reporting States | US Layoffs Tracker",
      description:
        "WARN Act layoff notices by state: notice counts, workers affected, and coverage windows for 46 reporting states.",
      h1: "Layoffs by State",
      body: `<p>WARN Act layoff notices by state — notice counts, workers affected, and coverage windows for every reporting state:</p><ul>${stateLinks}</ul>`,
    },
    {
      path: "/about",
      title: "About the Data - How WARN Act Reporting Works | US Layoffs Tracker",
      description:
        "What the WARN Act requires, which states report, how this open dataset is collected from state labor departments, and its coverage back to 1987.",
      h1: "About This Data",
      body: `<p>The Worker Adjustment and Retraining Notification (WARN) Act requires employers to file advance notice of mass layoffs and plant closures. There is no national feed — each state publishes its own notices, which this open dataset collects and normalizes from state labor departments, with coverage back to 1987.</p>`,
    },
  );

  // Paginated company index — links every company page so none are orphaned
  // (the single biggest Site Audit error). Page 1 lives at /companies; the SPA
  // router already renders the searchable list for any /companies/* path.
  for (let p = 1; p <= companyPageCount; p++) {
    const chunk = allCompanies.slice((p - 1) * COMPANIES_PER_PAGE, p * COMPANIES_PER_PAGE);
    const links = chunk
      .map(
        (c) =>
          `<li><a href="${PREFIX}/company/${c.slug}">${esc(c.name)}</a> — ${plural(c.notices, "notice")}, ${fmtInt(c.workers)} workers</li>`,
      )
      .join("");
    const nav = [
      p > 1 ? `<a href="${PREFIX}${companiesPath(p - 1)}">← Previous</a>` : "",
      `Page ${fmtInt(p)} of ${fmtInt(companyPageCount)}`,
      p < companyPageCount ? `<a href="${PREFIX}${companiesPath(p + 1)}">Next →</a>` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    const from = (p - 1) * COMPANIES_PER_PAGE + 1;
    const intro =
      p === 1
        ? `<p>WARN notice history for ${fmtInt(allCompanies.length)} companies — notices, workers affected, and filing dates back to 1987, ranked by workers affected. Also browse <a href="${PREFIX}/notices">all WARN notices</a>, <a href="${PREFIX}/states">by state</a>, or <a href="${PREFIX}/about">about this dataset</a>.</p>`
        : `<p>Companies ${fmtInt(from)}–${fmtInt(from + chunk.length - 1)} of ${fmtInt(allCompanies.length)}, ranked by workers affected.</p>`;
    routes.push({
      path: companiesPath(p),
      title:
        p === 1
          ? "Layoffs by Company - WARN Notice History | US Layoffs Tracker"
          : `Layoffs by Company - Page ${p} of ${companyPageCount} | US Layoffs Tracker`,
      description:
        p === 1
          ? "WARN notice history for 28,000+ companies: total notices, workers affected, states, and filing dates back to 1987."
          : `US layoff WARN notices by company, page ${p} of ${companyPageCount}, ranked by workers affected.`,
      h1: p === 1 ? "Layoffs by Company" : `Layoffs by Company — Page ${p}`,
      body: `${intro}<ul>${links}</ul><nav>${nav}</nav>`,
      crumbs:
        p === 1
          ? undefined
          : [
              ["Home", BASE],
              ["Companies", `${BASE}/companies`],
              [`Page ${p}`, `${BASE}${companiesPath(p)}`],
            ],
    });
  }

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
        description: datasetDesc(
          `Every WARN Act layoff notice filed in ${full}: ${plural(s.notices, "notice")} affecting ${fmtInt(s.workers)} workers across ${plural(s.companies, "company").replace("companys", "companies")}, covering ${s.coverage}. Sourced from ${s.agency} and refreshed daily.`,
          `state ${s.state}`,
        ),
        url: `${BASE}/state/${s.state}`,
        creator: { "@type": "Organization", name: "Kadoa", url: "https://www.kadoa.com" },
        license: "https://creativecommons.org/licenses/by/4.0/",
      },
      crumbs: [
        ["Home", BASE],
        ["States", `${BASE}/states`],
        [full, `${BASE}/state/${s.state}`],
      ],
    });
  }

  // One page per slug that actually has notices — guarantees every emitted page
  // is substantive (>=1 notice) and matches the live SPA's slug grouping.
  for (const [slug, rows] of noticesBySlug) {
    const name = nameBySlug.get(slug)?.name ?? rows[0].company;
    const sorted = [...rows].sort((a, b) => (b.received_date ?? "").localeCompare(a.received_date ?? ""));
    const workers = rows.reduce((acc, n) => acc + (n.num_affected ?? 0), 0);
    const stateCount = new Set(rows.map((n) => n.state).filter(Boolean)).size;
    const filed = rows
      .map((n) => n.received_date)
      .filter(Boolean)
      .sort();
    const firstYear = (filed[0] ?? "").slice(0, 4);
    const lastYear = (filed[filed.length - 1] ?? "").slice(0, 4);
    const span =
      firstYear && lastYear ? (firstYear === lastYear ? ` in ${firstYear}` : `, from ${firstYear} to ${lastYear}`) : "";
    routes.push({
      path: `/company/${slug}`,
      title: `${name} Layoffs - ${plural(rows.length, "WARN Notice")} | US Layoffs Tracker`,
      description: `${name} has filed ${plural(rows.length, "WARN notice")} affecting ${fmtInt(workers)} workers in ${plural(stateCount, "state")}${span}. See dates, locations, and the full WARN Act filing history.`,
      h1: `${name} Layoffs & WARN Notices`,
      body: `<p>${esc(name)} has filed ${plural(rows.length, "WARN Act notice")} affecting ${fmtInt(workers)} workers in ${plural(stateCount, "state")}${esc(span)}.</p>${noticesTable(sorted)}`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: `${name} WARN Act layoff notices`,
        description: datasetDesc(
          `Every WARN Act layoff notice filed by ${name}: ${plural(rows.length, "notice")} affecting ${fmtInt(workers)} workers in ${plural(stateCount, "state")}${span}, with filing dates and locations. Sourced from official state WARN filings and refreshed daily.`,
          `company ${slug}`,
        ),
        url: `${BASE}/company/${slug}`,
        creator: { "@type": "Organization", name: "Kadoa", url: "https://www.kadoa.com" },
        license: "https://creativecommons.org/licenses/by/4.0/",
      },
      crumbs: [
        ["Home", BASE],
        ["Companies", `${BASE}/companies`],
        [name, `${BASE}/company/${slug}`],
      ],
    });
  }

  return routes;
}

function renderRoute(template, route, shell) {
  const url = `${BASE}${route.path}`;
  // Use function replacements throughout: values containing `$` + digits would
  // be read as capture-group refs ($1/$2) in a replacement STRING, corrupting
  // output. A function return is emitted literally, so `$` is never special.
  let html = template
    .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(route.title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/s, (_m, a, b) => `${a}${esc(route.description)}${b}`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, (_m, a, b) => `${a}${url}${b}`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, (_m, a, b) => `${a}${url}${b}`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, (_m, a, b) => `${a}${esc(route.title)}${b}`)
    .replace(
      /(<meta\s+property="og:description"\s+content=")[^"]*(")/s,
      (_m, a, b) => `${a}${esc(route.description)}${b}`,
    )
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, (_m, a, b) => `${a}${esc(route.title)}${b}`)
    .replace(
      /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/s,
      (_m, a, b) => `${a}${esc(route.description)}${b}`,
    );

  const schemas = [route.jsonLd, route.crumbs && crumbLd(route.crumbs)].filter(Boolean);
  if (schemas.length) {
    const tags = schemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("");
    html = html.replace("</head>", `${tags}</head>`);
  }
  if (route.h1) {
    html = injectRoot(html, shell, route.h1, `${route.body ?? ""}<p><a href="${PREFIX}">US Layoffs Tracker home</a></p>`);
  }
  return html;
}

// Ship the same loading shell React hydrates, followed by crawler-visible
// content outside #root. The shell owns the first viewport; the client removes
// the SEO block as soon as hydration starts.
function injectRoot(html, shellMarkup, h1, body) {
  return html.replace(
    /(<div id="root">)(<\/div>)/,
    (_m, open, close) => `${open}${shellMarkup}${close}<main class="seo-shell"><h1>${esc(h1)}</h1>${body}</main>`,
  );
}

async function buildShell() {
  const server = await createServer({
    configFile: false,
    root: ROOT,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
  });
  try {
    const mod = await server.ssrLoadModule("/src/renderPrerenderShell.jsx");
    return mod.renderPrerenderShell();
  } finally {
    await server.close();
  }
}

const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
const shell = await buildShell();
const routes = buildRoutes();

let written = 0;
for (const r of routes) {
  const dir = path.join(DIST, r.path.slice(1));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), renderRoute(template, r, shell));
  written++;
}

// Homepage: it shipped as the bare SPA shell — no h1, no links — so the only
// route into the 28k company pages was sitemap.xml, which is why the audit found
// 6,492 of them with exactly one internal link.
const stats = loadJson("stats.json");
const TOP_N = 60; // enough to pass real link equity down without a wall of text
const topCompanies = [];
const seenSlug = new Set();
for (const c of [...loadJson("companies.json")].sort((a, b) => (b.workers ?? 0) - (a.workers ?? 0))) {
  const slug = companySlug(c.name);
  if (!slug || slug === "unknown" || seenSlug.has(slug)) continue;
  seenSlug.add(slug);
  topCompanies.push({ slug, name: c.name, notices: c.notices ?? 0, workers: c.workers ?? 0 });
  if (topCompanies.length >= TOP_N) break;
}
const homeBody = [
  `<p>Every US WARN Act layoff and plant-closure notice on file: ${fmtInt(stats.totalNotices)} notices covering ${fmtInt(stats.totalWorkers)} affected workers at ${fmtInt(stats.totalCompanies)} companies across ${stats.totalStates} reporting states, from ${stats.earliestYear} to ${stats.latestYear}. Collected daily from state labor departments.</p>`,
  `<p>Browse <a href="${PREFIX}/notices">all WARN notices</a>, <a href="${PREFIX}/companies">by company</a>, <a href="${PREFIX}/states">by state</a>, or read <a href="${PREFIX}/about">about this data</a>.</p>`,
  `<h2>Largest layoffs by company</h2><ul>${topCompanies
    .map(
      (c) =>
        `<li><a href="${PREFIX}/company/${esc(c.slug)}">${esc(c.name)}</a> — ${plural(c.notices, "notice")}, ${fmtInt(c.workers)} workers</li>`,
    )
    .join("")}</ul><p><a href="${PREFIX}/companies">See all ${fmtInt(stats.totalCompanies)} companies</a></p>`,
  `<h2>Layoffs by state</h2><ul>${loadJson("states.json")
    .map(
      (s) =>
        `<li><a href="${PREFIX}/state/${esc(s.state)}">${esc(STATE_NAMES[s.state] ?? s.state)}</a> — ${plural(s.notices, "notice")}</li>`,
    )
    .join("")}</ul>`,
].join("");
fs.writeFileSync(path.join(DIST, "index.html"), injectRoot(template, shell, "US Layoffs Tracker", homeBody));

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${BASE}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
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
