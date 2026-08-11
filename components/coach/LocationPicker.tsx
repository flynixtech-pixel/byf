"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search, LoaderCircle } from "lucide-react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";

// Inline SVG pin as a divIcon so we never depend on Leaflet's default marker
// image assets (which 404 under bundlers unless manually re-pointed).
const PIN_HTML = `<div style="transform:translate(-50%,-100%)">
  <svg width="30" height="42" viewBox="0 0 24 24" fill="#5c3a21" stroke="white" stroke-width="1.5">
    <path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 7 11.5 7.3 11.8a1 1 0 0 0 1.4 0C13 21.5 20 15.4 20 10c0-4.4-3.6-8-8-8Z"/>
    <circle cx="12" cy="10" r="2.6" fill="white" stroke="none"/>
  </svg></div>`;

export interface LatLng {
  lat: number;
  lng: number;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationPicker({
  value,
  onChange,
  onResolveAddress,
  height = 320,
}: {
  value?: LatLng | null;
  onChange: (coords: LatLng) => void;
  /** Called with a reverse-geocoded label when the pin moves, so the form can prefill address/city. */
  onResolveAddress?: (info: { address?: string; city?: string; area?: string }) => void;
  height?: number;
}) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const markerRef = useRef<LeafletNS.Marker | null>(null);
  const LRef = useRef<typeof LeafletNS | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  // Skip the auto-search that would otherwise fire right after picking a result
  // (picking fills the query with the chosen place's name).
  const justPickedRef = useRef(false);

  // Default centre: India (Udaipur-ish) until a pin is set.
  const initial = value ?? { lat: 24.5854, lng: 73.7125 };

  // Debounced autocomplete — results appear as you type, no button needed.
  useEffect(() => {
    if (justPickedRef.current) {
      justPickedRef.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearchError(null);
      setSearched(false);
      return;
    }
    const timer = setTimeout(() => void runSearch(), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default as typeof LeafletNS;
      if (cancelled || !mapEl.current || mapRef.current) return;
      LRef.current = L;

      const map = L.map(mapEl.current, { attributionControl: true }).setView([initial.lat, initial.lng], value ? 14 : 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({ html: PIN_HTML, className: "", iconSize: [30, 42] });

      if (value) {
        markerRef.current = L.marker([value.lat, value.lng], { draggable: true, icon }).addTo(map);
        markerRef.current.on("dragend", () => {
          const p = markerRef.current!.getLatLng();
          commit(p.lat, p.lng);
        });
      }

      map.on("click", (e: LeafletNS.LeafletMouseEvent) => {
        placeMarker(e.latlng.lat, e.latlng.lng);
        commit(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      // Leaflet needs a size recalc once the container has real dimensions.
      setTimeout(() => map.invalidateSize(), 200);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placeMarker(lat: number, lng: number) {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const icon = L.divIcon({ html: PIN_HTML, className: "", iconSize: [30, 42] });
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current!.getLatLng();
        commit(p.lat, p.lng);
      });
    }
  }

  function commit(lat: number, lng: number) {
    onChange({ lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 });
    if (onResolveAddress) void reverseGeocode(lat, lng);
  }

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        // Nominatim's usage policy requires a Referer or identifying User-Agent
        // header to accept a request — browsers can't set a custom User-Agent,
        // so force the Referer via referrerPolicy (some browsers/extensions
        // otherwise drop it on cross-origin requests, causing a silent 403).
        { headers: { "Accept-Language": "en" }, referrerPolicy: "origin" }
      );
      const data = await res.json();
      const a = data.address ?? {};
      onResolveAddress?.({
        address: data.display_name,
        city: a.city || a.town || a.village || a.county,
        area: a.suburb || a.neighbourhood || a.locality,
      });
    } catch {
      /* best-effort */
    }
  }

  async function runSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=in&limit=5&q=${encodeURIComponent(query)}`,
        // Force the Referer header — see note on reverseGeocode above.
        { headers: { "Accept-Language": "en" }, referrerPolicy: "origin" }
      );
      if (!res.ok) {
        throw new Error(`Search request failed (${res.status})`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Unexpected response from search");
      }
      setResults(data);
      setSearched(true);
    } catch (err) {
      console.error("Location search failed:", err);
      setResults([]);
      setSearched(true);
      setSearchError(err instanceof Error ? err.message : "Search failed. Check your connection and try again.");
    } finally {
      setSearching(false);
    }
  }

  function pick(r: SearchResult) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    mapRef.current?.setView([lat, lng], 15);
    placeMarker(lat, lng);
    onChange({ lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 });
    onResolveAddress?.({ address: r.display_name });
    setResults([]);
    justPickedRef.current = true;
    setQuery(r.display_name.split(",").slice(0, 2).join(", "));
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2.5">
          <Search size={16} className="shrink-0 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), runSearch())}
            placeholder="Search a place, area or landmark…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
          />
          <button
            type="button"
            onClick={runSearch}
            className="shrink-0 rounded-md bg-[#5c3a21] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7b4f2e]"
          >
            {searching ? <LoaderCircle size={14} className="animate-spin" /> : "Search"}
          </button>
        </div>
        {results.length > 0 && (
          <div className="absolute z-[500] mt-1 w-full overflow-hidden rounded-lg border border-surface-border bg-white shadow-lg">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pick(r)}
                className="flex w-full items-start gap-2 border-b border-surface-border px-3 py-2 text-left text-xs last:border-0 hover:bg-cream-200"
              >
                <MapPin size={14} className="mt-0.5 shrink-0 text-[#5c3a21]" />
                <span className="text-ink-soft">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
        {!searching && results.length === 0 && searched && !searchError && query.trim().length >= 3 && (
          <div className="absolute z-[500] mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-xs text-ink-faint shadow-lg">
            No matches for &quot;{query}&quot; — try a shorter or different search.
          </div>
        )}
        {searchError && (
          <div className="absolute z-[500] mt-1 w-full rounded-lg border border-vibe-coral/30 bg-white px-3 py-2 text-xs text-vibe-coral shadow-lg">
            {searchError}
          </div>
        )}
      </div>

      <div ref={mapEl} style={{ height }} className="w-full overflow-hidden rounded-xl border border-surface-border" />

      <p className="text-xs text-ink-faint">
        Tip: search, or click/drag on the map to set your exact coaching location.
        {value ? ` Selected: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : " No pin set yet."}
      </p>
    </div>
  );
}
