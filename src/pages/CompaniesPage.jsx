import { useEffect, useMemo } from "react";
import {
  Card,
  fmtCompact,
  fmtInt,
  Link,
  SortHeader,
  TABLE_HEADER_CLS,
  TABLE_ZEBRA_CLS,
} from "../ui";
import { COMPANIES_PER_PAGE, companiesPath, readCompanyDirectory } from "../companyDirectory";
import { useNavigate } from "../router";

const COLS = "grid gap-3 px-4 grid-cols-[30px_1fr_60px_70px] sm:grid-cols-[40px_1fr_90px_90px_120px]";

const SORT_KEYS = new Set(["name", "-name", "notices", "-notices", "workers", "-workers", "last_filed", "-last_filed"]);

export default function CompaniesPage({ db, page, filters = {} }) {
  const navigate = useNavigate();
  const sort = SORT_KEYS.has(filters.sort) ? filters.sort : "-workers";
  const search = filters.q ?? "";
  const term = search.trim();
  const directory = useMemo(() => readCompanyDirectory(db), [db]);
  const filtered = useMemo(() => {
    const rows = term ? directory.filter(company => company.name.toLowerCase().includes(term.toLowerCase())) : directory;
    if (sort === "-workers") return rows;
    const field = sort.replace(/^-/, "");
    const direction = sort.startsWith("-") ? -1 : 1;
    return [...rows].sort((a, b) => {
      const left = a[field] ?? "";
      const right = b[field] ?? "";
      return (left < right ? -direction : left > right ? direction : 0)
        || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
    });
  }, [directory, term, sort]);
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / COMPANIES_PER_PAGE));
  const validPage = page != null && page <= pageCount;
  const offset = validPage ? (page - 1) * COMPANIES_PER_PAGE : 0;
  const rows = validPage ? filtered.slice(offset, offset + COMPANIES_PER_PAGE) : [];

  const pathFor = (nextPage, nextSort = sort, nextSearch = search) => {
    const params = new URLSearchParams();
    if (nextSort !== "-workers") params.set("sort", nextSort);
    if (nextSearch) params.set("q", nextSearch);
    return companiesPath(nextPage) + (params.size ? `?${params}` : "");
  };

  const setSort = (nextSort) => navigate(pathFor(1, nextSort), { replace: true });

  useEffect(() => {
    document.title = !validPage ? "Company page unavailable | US Layoffs Tracker"
      : page === 1 ? "Layoffs by Company - WARN Notice History | US Layoffs Tracker"
      : `Layoffs by Company - Page ${page} of ${pageCount} | US Layoffs Tracker`;
  }, [page, pageCount, validPage]);

  if (!validPage) return <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
    <h1 className="dk-h1">Company page unavailable</h1>
    <p>This directory has {pageCount} pages. <Link to={pathFor(1)}>Browse companies</Link></p>
  </div>;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <header className="dk-section-head">
        <div>
          <h1 className="dk-h1">{page === 1 ? "Layoffs by company" : `Layoffs by company, page ${page}`}</h1>
          <p className="dk-hint">{total ? `${fmtInt(offset + 1)} to ${fmtInt(offset + rows.length)} of ${fmtInt(total)}` : "No companies found"}</p>
        </div>
      </header>
      <input
        type="text"
        value={search}
        onChange={(e) => navigate(pathFor(1, sort, e.target.value), { replace: true })}
        aria-label="Search companies"
        placeholder="Search companies..."
        className="h-8 px-3 mb-4 text-small border border-stroke rounded-md bg-panel min-w-[260px] focus:outline-none focus:border-accent placeholder:text-ink_faint"
      />
      <Card className="overflow-hidden">
        <div className={`${COLS} ${TABLE_HEADER_CLS} h-9 items-center border-b border-stroke`}>
          <span className="text-right">#</span>
          <SortHeader label="Company" sortKey="name" sort={sort} setSort={setSort} />
          <SortHeader label="Notices" sortKey="notices" sort={sort} setSort={setSort} align="right" />
          <SortHeader label="Workers" sortKey="workers" sort={sort} setSort={setSort} align="right" />
          <span className="hidden sm:block">
            <SortHeader label="Latest filing" sortKey="last_filed" sort={sort} setSort={setSort} align="right" />
          </span>
        </div>
        <div className={`text-small ${TABLE_ZEBRA_CLS}`}>
          {rows.map((c, i) => (
            <Link
              key={c.slug}
              to={`/company/${c.slug}`}
              className={`${COLS} h-11 sm:h-10 items-center hover:bg-hover border-b border-stroke_soft last:border-b-0 no-underline hover:no-underline text-ink`}
            >
              <span className="text-right text-mini text-ink_faint tabular-nums">{offset + i + 1}</span>
              <span className="truncate">{c.name}</span>
              <span className="text-right tabular-nums">{fmtInt(c.notices)}</span>
              <span className="text-right tabular-nums">{fmtCompact(c.workers)}</span>
              <span className="hidden sm:block text-right tabular-nums text-ink_muted">{c.last_filed ?? "--"}</span>
            </Link>
          ))}
        </div>
      </Card>
      <nav aria-label="Company pages" className="flex gap-4 items-center mt-4">
        {page > 1 && <Link to={pathFor(page - 1)} rel="prev">Previous</Link>}
        <span>Page {fmtInt(page)} of {fmtInt(pageCount)}</span>
        {page < pageCount && <Link to={pathFor(page + 1)} rel="next">Next</Link>}
      </nav>
    </div>
  );
}
