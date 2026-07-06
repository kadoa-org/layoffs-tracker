# US Layoffs Tracker

Open dataset and dashboard of every US layoff disclosed under the WARN Act. ~42,000 mass-layoff and plant-closure notices from 45 state labor departments, by company, state, and date.

**Live:** https://www.kadoa.com/layoffs

## Run locally

```bash
bun install
bun run dev
```

## Stack

Vite, React 19, Tailwind, sql.js. Overview reads a small JSON for instant first paint; the full SQLite database loads lazily when filterable pages are opened.

## Data sources

Notices are public records filed by employers with each state's labor or workforce agency under the federal WARN Act. There's no national feed — every state publishes its own list, in its own format and on its own cadence — so this dataset pulls the per-state sources and normalizes them into one searchable table.

We use [kadoa.com](https://kadoa.com) to collect, parse, and normalize the filings at scale. Need the full historical dataset with continuous updates? [Get in touch](https://www.kadoa.com/contact/sales).

## License

MIT. Data sourced from public state labor department records.
