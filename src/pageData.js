import { readCompanyDirectory } from "./companyDirectory";
import { query } from "./useDatabase";

export function readPageData(db, route) {
  switch (route.name) {
    case "company": return { rows: query(db, "SELECT * FROM notices WHERE slug = ?", [route.slug]) };
    case "state": return {
      meta: query(db, "SELECT * FROM states WHERE state = ?", [route.code])[0] ?? null,
      rows: query(db, "SELECT * FROM notices WHERE state = ? ORDER BY received_date DESC NULLS LAST", [route.code]),
    };
    case "states": return { rows: query(db, "SELECT * FROM states ORDER BY workers DESC") };
    case "companies": return { rows: readCompanyDirectory(db) };
    case "notices": return {
      rows: query(db, "SELECT * FROM notices ORDER BY received_date DESC NULLS LAST LIMIT 501"),
      total: query(db, "SELECT COUNT(*) AS n FROM notices")[0].n,
      states: query(db, "SELECT state FROM states ORDER BY state").map(r => r.state),
    };
    default: return null;
  }
}
