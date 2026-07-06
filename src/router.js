// Tiny path + query router using pushState / popstate.
// Routes are app-relative ("/company/x"); the deploy prefix
// (import.meta.env.BASE_URL, "/layoffs/" in production, "/" in dev) is
// stripped on parse and added on navigation/href via withBase().
import { useCallback, useEffect, useState } from "react";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

export function withBase(path) {
  if (!BASE_PATH || !path.startsWith("/")) return path;
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}

function stripBase(pathname) {
  if (BASE_PATH && (pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`))) {
    return pathname.slice(BASE_PATH.length) || "/";
  }
  return pathname;
}

export function parseRoute(pathname = window.location.pathname, search = window.location.search) {
  const segments = stripBase(pathname).replace(/^\//, "").split("/").filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(search));
  if (segments.length === 0) return { name: "overview", query };
  if (segments[0] === "company" && segments[1])
    return { name: "company", slug: decodeURIComponent(segments[1]), query };
  if (segments[0] === "state" && segments[1])
    return { name: "state", code: decodeURIComponent(segments[1]).toUpperCase(), query };
  if (segments[0] === "companies") return { name: "companies", query };
  if (segments[0] === "states") return { name: "states", query };
  if (segments[0] === "notices") return { name: "notices", query };
  if (segments[0] === "about") return { name: "about", query };
  return { name: "overview", query };
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute());
  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return route;
}

export function navigate(pathOrUrl, { replace = false } = {}) {
  const target = withBase(pathOrUrl);
  const current = window.location.pathname + window.location.search;
  if (target === current) return;
  if (replace) {
    window.history.replaceState({}, "", target);
  } else {
    window.history.pushState({}, "", target);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}

// Hook: synchronize arbitrary state <-> URL query string on a given route.
export function useQueryState(keys, initial) {
  const [state, setState] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const next = { ...initial };
    for (const k of keys) {
      const v = p.get(k);
      if (v != null && v !== "") next[k] = v;
    }
    return next;
  });

  const set = useCallback(
    (updater) => {
      setState((prev) => {
        const merged = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
        // Reflect to URL
        const p = new URLSearchParams(window.location.search);
        for (const k of keys) {
          const v = merged[k];
          if (v == null || v === "" || v === initial[k]) p.delete(k);
          else p.set(k, v);
        }
        const qs = p.toString();
        const url = window.location.pathname + (qs ? `?${qs}` : "");
        window.history.replaceState({}, "", url);
        return merged;
      });
    },
    [keys, initial],
  );

  // Listen for popstate so browser nav still works
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      setState((prev) => {
        const next = { ...initial };
        for (const k of keys) {
          const v = p.get(k);
          if (v != null && v !== "") next[k] = v;
        }
        return next;
      });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [keys, initial]);

  return [state, set];
}
