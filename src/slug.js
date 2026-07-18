// Single source of truth for company URL slugs. Imported by the client (ui.jsx),
// the DB builder (scripts/build-db.js), and the prerenderer (scripts/prerender.mjs)
// so links, the indexed `notices.slug` column, and prerendered URLs are always
// derived the same way. Keep this dependency-free — it's imported by plain node
// build scripts as well as the Vite browser bundle.
//
// Strips Inc/LLC/Corp/Ltd noise so links stay stable across filings of the same
// parent entity (e.g. "AT&T", "AT&T Corp.", "AT&T Corporation" all → "att").
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
