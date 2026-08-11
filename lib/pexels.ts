"use client";

import { useEffect, useState } from "react";

const memoryCache = new Map<string, string | null>();
const SESSION_KEY_PREFIX = "byv-pexels:";

function readSessionCache(query: string): string | null | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.sessionStorage.getItem(SESSION_KEY_PREFIX + query);
  if (raw === null) return undefined;
  return raw === "" ? null : raw;
}

function writeSessionCache(query: string, url: string | null) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_KEY_PREFIX + query, url ?? "");
}

/**
 * Fetches a single representative photo URL for a query via the local
 * /api/pexels proxy (keeps the Pexels API key server-side only).
 * Cached per-query for the session so switching wizard steps doesn't refetch.
 */
export function usePexelsImage(query: string | null | undefined): { url: string | null; loading: boolean } {
  const [url, setUrl] = useState<string | null>(() => {
    if (!query) return null;
    if (memoryCache.has(query)) return memoryCache.get(query) ?? null;
    return readSessionCache(query) ?? null;
  });
  const [loading, setLoading] = useState(() => {
    if (!query) return false;
    if (memoryCache.has(query)) return false;
    return readSessionCache(query) === undefined;
  });

  useEffect(() => {
    if (!query) {
      setUrl(null);
      setLoading(false);
      return;
    }

    if (memoryCache.has(query)) {
      setUrl(memoryCache.get(query) ?? null);
      setLoading(false);
      return;
    }

    const cached = readSessionCache(query);
    if (cached !== undefined) {
      memoryCache.set(query, cached);
      setUrl(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/pexels?query=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data: { url: string | null }) => {
        if (cancelled) return;
        memoryCache.set(query, data.url);
        writeSessionCache(query, data.url);
        setUrl(data.url);
      })
      .catch(() => {
        if (cancelled) return;
        memoryCache.set(query, null);
        setUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  return { url, loading };
}
