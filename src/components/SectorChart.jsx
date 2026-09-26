import React, { useState } from "react";
import { ChartCard, DataTable, FilterSelect } from "../kit";
import { fmtCompact, fmtInt } from "../ui";

// Horizontal bar chart of layoffs by NAICS sector. Coverage is partial (only
// notices that carry an industry), so the header states that plainly.
export default function SectorChart({ sectors, classified }) {
  const [metric, setMetric] = useState("workers");
  if (!sectors || sectors.length === 0) return null;

  const rows = [...sectors].sort((a, b) => b[metric] - a[metric]);
  const max = Math.max(1, ...rows.map((s) => s[metric]));

  const chart = (
    <>
      <FilterSelect label="Show" value={metric} options={[["workers", "Workers"], ["notices", "Notices"]]} onChange={setMetric} />
      <div className="space-y-2">
        {rows.map((s) => {
          const pct = (s[metric] / max) * 100;
          return (
            <div key={s.sector} className="grid grid-cols-[160px_1fr_64px] sm:grid-cols-[210px_1fr_72px] items-center gap-3">
              <span className="text-mini sm:text-small text-ink_muted truncate" title={s.sector}>{s.sector}</span>
              <div className="h-5 overflow-hidden">
                <div className="h-full" style={{ width: `${Math.max(pct, 1.5)}%`, background: "#12436d" }} />
              </div>
              <span className="text-mini sm:text-small text-ink font-medium tabular-nums text-right">
                {metric === "workers" ? fmtCompact(s.workers) : fmtInt(s.notices)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
  return (
    <ChartCard
      id="sector-title"
      title="Layoffs by sector, all years"
      description={`Among ${fmtInt(classified)} notices that report an industry. Not every state does.`}
      tabs={[
        { label: "Chart", content: chart },
        {
          label: "Tabular data", short: "Tabular",
          content: (
            <DataTable
              plain
              rowKey={(r) => r.sector}
              rows={rows}
              columns={[
                { key: "sector", header: "Sector" },
                { key: "workers", header: "Workers", align: "right", render: (r) => fmtInt(r.workers) },
                { key: "notices", header: "Notices", align: "right", render: (r) => fmtInt(r.notices) },
              ]}
            />
          ),
        },
      ]}
    />
  );
}
