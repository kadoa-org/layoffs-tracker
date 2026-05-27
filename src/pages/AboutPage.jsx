import React from "react";
import { Link, SectionHeader } from "../ui";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-20 text-regular text-ink_secondary leading-relaxed">
      <h1 className="text-title font-semibold text-ink mb-6 tracking-[-0.012em]">About US Layoffs Tracker</h1>

      <SectionHeader title="What this is" />
      <p className="mb-4">
        US Layoffs Tracker is an open dataset and dashboard of every US layoff and plant closure disclosed under the
        federal WARN Act. The WARN (Worker Adjustment and Retraining Notification) Act requires employers with 100+
        employees to give 60 days' notice of plant closings and mass layoffs of 50 or more workers. Notices are filed
        with each state's labor or workforce agency.
      </p>
      <p className="mb-8">
        There is no federal real-time API. Every state publishes its own list, in its own format, on its own cadence.
        This dataset pulls those per-state feeds and normalizes them into a single searchable table.
      </p>

      <SectionHeader title="Coverage" />
      <p className="mb-4">
        43 of 52 US jurisdictions (50 states + DC + PR) are covered, with history going back to 1987 for the deepest
        states. The dashboard's stat rail shows the live coverage count.
      </p>
      <p className="mb-4">Sources fall into three buckets:</p>
      <ul className="list-disc pl-6 mb-4 space-y-1 text-small">
        <li>
          <strong className="text-ink">Direct file downloads</strong>: states that publish CSV, XLSX, or PDF rollups
          (CA, TX, NJ, MA, VA, IA, KY, MT, RI, OR, AL, IN, MD, ID, LA, NM, NV, SC, IL, ...).
        </li>
        <li>
          <strong className="text-ink">HTML and dashboard scraping</strong>: states with year-based listing pages or
          JS-rendered databases (NY, FL, PA, OH, WA, NC, GA, AZ, TN, MN, MO, CO, MI, ...).
        </li>
        <li>
          <strong className="text-ink">PDF per-notice crawls</strong>: states that publish each notice as an individual
          signed letter (WV, MI, MN, HI partial).
        </li>
      </ul>
      <p className="mb-4">
        We use{" "}
        <a className="text-accent hover:underline" href="https://kadoa.com" target="_blank" rel="noreferrer">
          Kadoa
        </a>{" "}
        to collect, parse, and normalize the filings at scale — from CSV and XLSX rollups to Tableau dashboards,
        JS-rendered search databases, and per-notice PDFs.
      </p>
      <p className="mb-8">
        <strong className="text-ink">9 jurisdictions remain uncovered.</strong> 6 of them do not publish WARN notices
        publicly: Arkansas (legally confidential under A.C.A. §11-10-314), Mississippi, New Hampshire, Wyoming, Puerto
        Rico, and Hawaii (no central list). 1 is portal-blocked: Georgia (the GDOL listing portal returns an auth
        challenge to automated requests). 2 are being added: North Dakota and West Virginia.
      </p>

      <SectionHeader title="Schema" />
      <p className="mb-4">
        Each row is one WARN notice for one employer at one worksite. Multi-site filings get split per site at
        normalization time. Core fields:
      </p>
      <ul className="list-disc pl-6 mb-8 space-y-1 text-small">
        <li>
          <code className="font-mono text-mini bg-muted px-1 rounded">company</code>: employer name as filed
        </li>
        <li>
          <code className="font-mono text-mini bg-muted px-1 rounded">state</code>,{" "}
          <code className="font-mono text-mini bg-muted px-1 rounded">city</code>,{" "}
          <code className="font-mono text-mini bg-muted px-1 rounded">county</code>: worksite location
        </li>
        <li>
          <code className="font-mono text-mini bg-muted px-1 rounded">received_date</code>: when the labor agency
          received the notice
        </li>
        <li>
          <code className="font-mono text-mini bg-muted px-1 rounded">effective_date</code>: scheduled first layoff date
        </li>
        <li>
          <code className="font-mono text-mini bg-muted px-1 rounded">num_affected</code>: workers affected
        </li>
        <li>
          <code className="font-mono text-mini bg-muted px-1 rounded">event_type</code>: closure, mass_layoff,
          relocation, amendment, extension
        </li>
      </ul>

      <SectionHeader title="Data quality" />
      <p className="mb-4">
        After cross-source dedup and outlier capping, 100% of rows have a company and a received date, ~95% have
        effective dates and num_affected, ~80% have a city, ~55% have a county. NAICS codes and union flags are
        filer-supplied and frequently blank.
      </p>
      <p className="mb-4">
        Numbers reflect what employers self-reported on WARN forms. They under-count layoffs at companies with fewer
        than 100 employees (federal WARN doesn't apply), at companies that gave less than 60 days notice (the penalty
        for non-filing is just back pay for the un-noticed period), and in states without public disclosure.
      </p>
      <p className="mb-4">
        Scrape artifacts are filtered: notices with num_affected greater than 50,000 are capped (the largest single WARN
        filing in history was GM's 2009 bankruptcy at ~47,000). Cross-source duplicates are merged when the same
        employer files in multiple states or the same notice appears in more than one source.
      </p>
      <p className="mb-8">
        For sanity-checking against other layoff trackers, see{" "}
        <a className="text-accent hover:underline" href="https://layoffs.fyi/" target="_blank" rel="noreferrer">
          layoffs.fyi
        </a>{" "}
        (tech sector),{" "}
        <a className="text-accent hover:underline" href="https://warntracker.com" target="_blank" rel="noreferrer">
          WARN Tracker
        </a>
        , and the federal{" "}
        <a
          className="text-accent hover:underline"
          href="https://www.dol.gov/agencies/eta/layoffs/warn"
          target="_blank"
          rel="noreferrer"
        >
          DOL ETA WARN hub
        </a>
        .
      </p>

      <SectionHeader title="Updates" />
      <p className="mb-8">
        The dataset re-fetches every state portal daily. Rhode Island publishes within 24 hours of receipt,
        Massachusetts weekly, California Tuesdays and Thursdays, the rest update as filings arrive at their respective
        agencies.
      </p>

      <p className="text-mini text-ink_muted mt-12">
        Built by{" "}
        <a className="text-accent hover:underline" href="https://kadoa.com" target="_blank" rel="noreferrer">
          Kadoa
        </a>
        . Open source on{" "}
        <a
          className="text-accent hover:underline"
          href="https://github.com/kadoa-org/layoffs-tracker"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        .{" "}
        <Link to="/" className="no-underline hover:no-underline">
          Back to dashboard
        </Link>
        .
      </p>
    </div>
  );
}
