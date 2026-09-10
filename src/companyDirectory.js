export const COMPANIES_PER_PAGE = 300;
export const companiesPath = (page) => page === 1 ? "/companies" : `/companies/${page}`;

// HTML and the browser read one projection of the published notice slugs.
// Keep it as a query so older public database snapshots need no migration.
export function readCompanyDirectory(db) {
  const statement = db.prepare(`WITH names AS (
      SELECT slug, company AS name,
        ROW_NUMBER() OVER (PARTITION BY slug ORDER BY COUNT(*) DESC, company ASC) AS preference
      FROM notices WHERE slug != '' AND slug != 'unknown'
      GROUP BY slug, company
    )
    SELECT n.slug, names.name, COUNT(*) AS notices,
      COALESCE(SUM(n.num_affected), 0) AS workers, MAX(n.received_date) AS last_filed
    FROM notices n JOIN names ON names.slug = n.slug AND names.preference = 1
    GROUP BY n.slug ORDER BY workers DESC, n.slug ASC`);
  try {
    const rows = [];
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
}
