import { expect, test } from "bun:test";
import initSqlJs from "sql.js";
import { readCompanyDirectory } from "../src/companyDirectory.js";

const SQL = await initSqlJs();
function directoryFor(rows) {
  const db = new SQL.Database();
  try {
    db.run("CREATE TABLE notices (slug TEXT, company TEXT, num_affected INTEGER, received_date TEXT)");
    for (const row of rows) db.run("INSERT INTO notices VALUES (?,?,?,?)", row);
    return readCompanyDirectory(db);
  } finally {
    db.close();
  }
}

test("one published company contains every alias notice and uses its most frequent source name", () => {
  expect(directoryFor([
    ["acme", "Acme", 100, "2026-01-01"],
    ["acme", "Acme Inc.", 200, "2026-03-01"],
    ["acme", "Acme Inc.", null, null],
    ["unknown", "Unknown", 1000, null],
    ["", "", 1000, null],
  ])).toEqual([{ slug: "acme", name: "Acme Inc.", notices: 3, workers: 300, last_filed: "2026-03-01" }]);
});

test("worker and name ties stay stable across source reorderings", () => {
  const rows = [
    ["zebra", "Zebra", 10, null],
    ["alpha", "Alpha LLC", 5, null],
    ["alpha", "Alpha", 5, null],
    ["largest", "Largest", 20, null],
  ];
  for (const input of [rows, rows.toReversed()]) {
    const directory = directoryFor(input);
    expect(directory.map(company => company.slug)).toEqual(["largest", "alpha", "zebra"]);
    expect(directory[1].name).toBe("Alpha");
  }
});
