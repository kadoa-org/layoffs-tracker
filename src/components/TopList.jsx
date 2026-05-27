import React from "react";
import { Card, fmtCompact, fmtInt, Link } from "../ui";

// Compact ranked list used on the Overview page (Top companies, Top states).
export default function TopList({ items, getHref, primary, secondary, tertiaryLabel }) {
  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-stroke_soft">
        {items.map((it, i) => (
          <Link
            key={it.key ?? i}
            to={getHref(it)}
            className="grid grid-cols-[24px_1fr_auto_auto] items-center gap-3 h-10 px-4 text-small no-underline hover:no-underline hover:bg-hover text-ink"
          >
            <span className="text-mini text-ink_faint tabular-nums text-right">{i + 1}</span>
            <span className="truncate">{primary(it)}</span>
            <span className="text-mini text-ink_muted tabular-nums whitespace-nowrap">{secondary(it)}</span>
            <span className="text-mini text-ink_muted tabular-nums whitespace-nowrap w-12 text-right">
              {tertiaryLabel ? `${fmtInt(it.notices)} ${tertiaryLabel}` : fmtCompact(it.workers)}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
