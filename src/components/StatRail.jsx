import React from "react";
import { Card, fmtCompact, fmtInt, StatGrid } from "../ui";

export default function StatRail({ stats }) {
  if (!stats) return null;
  const items = [
    { label: "Notices", value: fmtInt(stats.totalNotices) },
    { label: "Workers affected", value: fmtCompact(stats.totalWorkers) },
    { label: "Companies", value: fmtInt(stats.totalCompanies) },
    { label: "Date range", value: stats.dateRange ?? "--" },
  ];
  return (
    <Card className="overflow-hidden">
      <StatGrid items={items} />
    </Card>
  );
}
