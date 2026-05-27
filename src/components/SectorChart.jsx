import React, { useState } from "react";
import { Card, fmtCompact, fmtInt, Segmented } from "../ui";

// Horizontal bar chart of layoffs by NAICS sector. Coverage is partial (only
// notices that carry an industry), so the header states that plainly.
export default function SectorChart({ sectors, classified }) {
  const [metric, setMetric] = useState("workers");
  if (!sectors || sectors.length === 0) return null;

  const rows = [...sectors].sort((a, b) => b[metric] - a[metric]);
  const max = Math.max(1, ...rows.map((s) => s[metric]));

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b border-stroke flex items-center justify-between gap-3 flex-wrap">
        <div className="text-mini text-ink_muted">
          Among <span className="text-ink font-medium">{fmtInt(classified)}</span> notices with reported industry
        </div>
        <Segmented
          size="sm"
          value={metric}
          onChange={setMetric}
          options={[
            { value: "workers", label: "Workers" },
            { value: "notices", label: "Notices" },
          ]}
        />
      </div>
      <div className="p-4 space-y-2">
        {rows.map((s) => {
          const pct = (s[metric] / max) * 100;
          return (
            <div
              key={s.sector}
              className="grid grid-cols-[160px_1fr_64px] sm:grid-cols-[210px_1fr_72px] items-center gap-3"
            >
              <span className="text-mini sm:text-small text-ink_muted truncate" title={s.sector}>
                {s.sector}
              </span>
              <div className="h-5 bg-muted/40 rounded-sm overflow-hidden">
                <div className="h-full bg-accent/80 rounded-sm" style={{ width: `${Math.max(pct, 1.5)}%` }} />
              </div>
              <span className="text-mini sm:text-small text-ink font-medium tabular-nums text-right">
                {metric === "workers" ? fmtCompact(s.workers) : fmtInt(s.notices)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
