import React from "react";
import { DataTable } from "../kit";
import { fmtCompact, fmtInt, RowLinkNav } from "../ui";

// Compact ranked list used on the Overview page (Top companies, Top states).
export default function TopList({ items, getHref, primary, secondary, tertiaryLabel }) {
  const columns = [
    { key: "rank", header: "#", width: 32, align: "right", render: (it) => <span style={{ color: "var(--dk-muted)" }}>{it._rank}</span> },
    {
      key: "name",
      header: "Name",
      clamp: true,
      width: "55%",
      render: (it) => (
        <RowLinkNav to={getHref(it)}>
          <span style={{ fontWeight: 500 }} className="truncate">{primary(it)}</span>
        </RowLinkNav>
      ),
    },
    { key: "secondary", header: "", align: "right", render: (it) => <span style={{ color: "var(--dk-muted)", whiteSpace: "nowrap" }}>{secondary(it)}</span> },
    {
      key: "tertiary",
      header: "",
      align: "right",
      render: (it) => (
        <span style={{ color: "var(--dk-muted)", whiteSpace: "nowrap" }}>
          {tertiaryLabel ? `${fmtInt(it.notices)} ${tertiaryLabel}` : fmtCompact(it.workers)}
        </span>
      ),
    },
  ];
  return <DataTable columns={columns} rows={items.map((it, i) => ({ ...it, _rank: i + 1 }))} rowKey={(it) => it.key ?? it._rank} />;
}
