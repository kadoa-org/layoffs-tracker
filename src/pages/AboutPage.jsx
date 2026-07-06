import React from "react";
import { Card } from "../ui";

const STEPS = [
  {
    title: "Why this data exists",
    body: `The Worker Adjustment and Retraining Notification Act of 1988 requires employers with 100 or more employees to give 60 days' advance notice of plant closings and mass layoffs. Notices are filed with each state's labor or workforce agency, creating a public record of large layoffs before they happen.`,
  },
  {
    title: "What triggers a notice",
    body: `A plant closing that puts 50+ workers out of a job at a single site, or a mass layoff of 500+ workers (or 50 to 499 when they make up at least a third of the site's workforce). Notice goes to the affected workers, their representatives, and state and local officials.`,
  },
  {
    title: "Layoff vs. closure",
    body: `Each notice is a mass layoff, a plant closure, a relocation, or an amendment to an earlier filing. We normalize the wording every state uses into those few buckets so they can be compared and filtered consistently.`,
  },
  {
    title: "Coverage and history vary by state",
    body: `There is no national real-time WARN database. Every state publishes its own list, in its own format, on its own cadence, and going back only as far as it chooses. A few don't make notices public at all: Arkansas keeps them confidential by law (A.C.A. §11-10-314), and Mississippi, New Hampshire, Wyoming, and Hawaii publish no usable public list. How far back our coverage runs also differs: some states reach the 1990s, while others are recent-only because that's all the state puts online. So earlier years and more-recently-added states are under-counted, and the totals here are lighter than the true historical record.`,
  },
  {
    title: "Why a layoff can be missing",
    body: `WARN is a floor, not a full count of US job loss. It only sees concentrated, involuntary cuts at a single location, so a layoff can be real and still never trigger a notice. Cuts spread thin across many offices, remote teams, or sites stay under the per-location threshold. Voluntary buyouts, early retirements, and attrition aren't covered at all. And because notices are filed before the cuts happen, the announced headcount and the final number often differ. The biggest gaps aren't missing filings; they're layoffs the law was never written to capture.`,
  },
  {
    title: "Who this is for",
    body: `Aggregated, the filings show where and how fast layoffs are hitting, broken down by company, state, sector, and over time, often months before the jobs are actually gone. A tool for workers, journalists, and researchers. Not a complete picture of the labor market.`,
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
      <div className="max-w-3xl">
        <h1 className="dk-h1">About the data</h1>
        <p className="text-regular text-ink_muted">
          An open dataset of every US layoff disclosed under the federal WARN Act, pulled directly from state labor
          departments and normalized into one searchable, sortable view. Filings are sourced and monitored with{" "}
          <a href="https://kadoa.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            kadoa.com
          </a>{" "}
          and the code is open source on{" "}
          <a
            href="https://github.com/kadoa-org/layoffs-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            GitHub
          </a>
          .
        </p>
      </div>

      <div className="mt-12 max-w-3xl">
        <h2 className="text-large font-semibold text-ink mb-1">The law behind the data</h2>
        <p className="text-small text-ink_muted">
          What the WARN Act requires, what triggers a filing, and why coverage varies from state to state.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
        {STEPS.map((s, i) => (
          <Card key={s.title} className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-6 h-6 rounded-full bg-ink text-white text-mini font-medium flex items-center justify-center tabular-nums shrink-0">
                {i + 1}
              </span>
              <div className="text-regular font-semibold text-ink">{s.title}</div>
            </div>
            <p className="text-small text-ink_secondary leading-[1.5]">{s.body}</p>
          </Card>
        ))}
      </div>

      <div className="mt-16 max-w-3xl text-small text-ink_muted">
        <p>
          For informational and research purposes. Data is sourced from public state labor department records and
          provided for open use.
        </p>
      </div>
    </div>
  );
}
