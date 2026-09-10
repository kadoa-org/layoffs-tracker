import React from "react";

export default function PublishedPage({ html, pathname }) {
  return <div data-published-page={pathname} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function DatasetStatus({ error, hasPublishedPage }) {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-6 pb-4" role={error ? "alert" : "status"}>
      <p>{error ? "Failed to load interactive data." : "Loading interactive data..."}
        {hasPublishedPage ? " The published page remains available below." : ""}
      </p>
      {error && <>
        <p className="text-small text-ink_muted">{String(error.message ?? error)}</p>
        <button type="button" className="dk-link mt-2" onClick={() => window.location.reload()}>Reload page</button>
      </>}
    </div>
  );
}
