import { useEffect, useState } from "react";
import initSqlJs from "sql.js";

// Self-hosted from public/ (copied from node_modules/sql.js/dist) so it loads
// same-origin — required by the strict CSP (connect-src 'self') on
// www.kadoa.com/layoffs. See kadoa-backend next.config.mjs.
const SQL_WASM_URL = `${import.meta.env.BASE_URL}sql-wasm.wasm`;

let dbPromise = null;

function loadDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => SQL_WASM_URL });
      const response = await fetch(`${import.meta.env.BASE_URL}data/layoffs.db`);
      if (!response.ok) throw new Error(`Failed to load layoffs.db: ${response.status}`);
      const buffer = await response.arrayBuffer();
      return new SQL.Database(new Uint8Array(buffer));
    })();
  }
  return dbPromise;
}

// `enabled` lets callers defer the sql.js + DB fetch until a route actually
// needs it. The promise is cached, so the second enabled mount reuses the
// in-flight or resolved load instead of re-fetching.
export function useDatabase(enabled = true) {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadDb()
      .then((d) => {
        setDb(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e);
        setLoading(false);
      });
  }, [enabled]);

  return { db, loading, error };
}

// Execute a SQL query and return rows as plain JS objects. Use for one-off reads.
// Don't loop with this — for hot paths prepare a statement once and step it.
export function query(db, sql, params = []) {
  if (!db) return [];
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// Single-row convenience.
export function queryOne(db, sql, params = []) {
  const rows = query(db, sql, params);
  return rows[0] ?? null;
}

// Get the `stats` KV table parsed into a normal object.
export function getStats(db) {
  const rows = query(db, "SELECT key, value FROM stats");
  const out = {};
  for (const r of rows) {
    let v = r.value;
    if (typeof v === "string" && (v.startsWith("{") || v.startsWith("["))) {
      try {
        v = JSON.parse(v);
      } catch {
        // keep as string
      }
    } else if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v)) {
      v = Number(v);
    }
    out[r.key] = v;
  }
  return out;
}
