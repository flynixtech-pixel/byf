"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, MapPin, Navigation } from "lucide-react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";

const PIN_HTML = `<div style="transform:translate(-50%,-100%)">
  <svg width="30" height="42" viewBox="0 0 24 24" fill="#5c3a21" stroke="white" stroke-width="1.5">
    <path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 7 11.5 7.3 11.8a1 1 0 0 0 1.4 0C13 21.5 20 15.4 20 10c0-4.4-3.6-8-8-8Z"/>
    <circle cx="12" cy="10" r="2.6" fill="white" stroke="none"/>
  </svg></div>`;

type Coords = { lat: number; lng: number };

export function DineoutMap({
  title,
  address,
  area,
  city,
  lat,
  lng,
  height = 224,
}: {
  title: string;
  address?: string;
  area?: string;
  city?: string;
  lat?: number;
  lng?: number;
  height?: number;
}) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const markerRef = useRef<LeafletNS.Marker | null>(null);
  const directCoords = useMemo(
    () => (typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null),
    [lat, lng]
  );
  const [resolvedCoords, setResolvedCoords] = useState<Coords | null>(null);
  const coords = directCoords ?? resolvedCoords;
  const [lookupAttempted, setLookupAttempted] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);

  const query = useMemo(
    () => [title, address, area, city].filter(Boolean).join(", "),
    [title, address, area, city]
  );

  useEffect(() => {
    let cancelled = false;

    async function resolveCoordinates() {
      if (directCoords) {
        return;
      }

      if (!query.trim()) {
        setLookupFailed(true);
        setLookupAttempted(true);
        return;
      }

      try {
        setLookupFailed(false);
        setLookupAttempted(false);
        setResolvedCoords(null);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`,
          { headers: { "Accept-Language": "en" }, referrerPolicy: "origin" }
        );
        if (!res.ok) throw new Error(`Location lookup failed (${res.status})`);
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (!Array.isArray(data) || data.length === 0) throw new Error("No coordinates found");
        if (cancelled) return;
        setResolvedCoords({ lat: Number.parseFloat(data[0].lat), lng: Number.parseFloat(data[0].lon) });
      } catch {
        if (!cancelled) setLookupFailed(true);
      } finally {
        if (!cancelled) setLookupAttempted(true);
      }
    }

    void resolveCoordinates();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [directCoords, query]);

  useEffect(() => {
    let cancelled = false;

    async function renderMap() {
      if (!coords || !mapEl.current || mapRef.current) return;

      const L = (await import("leaflet")).default as typeof LeafletNS;
      if (cancelled || !mapEl.current || mapRef.current) return;

      const map = L.map(mapEl.current, {
        attributionControl: true,
        scrollWheelZoom: false,
        zoomControl: true,
      }).setView([coords.lat, coords.lng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      markerRef.current = L.marker([coords.lat, coords.lng], {
        icon: L.divIcon({ html: PIN_HTML, className: "", iconSize: [30, 42] }),
      }).addTo(map);

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
    }

    void renderMap();

    return () => {
      cancelled = true;
    };
  }, [coords]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {!coords && !lookupFailed && !lookupAttempted ? (
        <div className="flex h-[224px] items-center justify-center bg-slate-50">
          <span className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm">
            <LoaderCircle className="h-4 w-4 animate-spin text-brand-500" />
            Loading live map
          </span>
        </div>
      ) : coords ? (
        <div ref={mapEl} style={{ height }} className="w-full" />
      ) : (
        <div className="flex h-[224px] flex-col justify-between bg-gradient-to-br from-slate-50 to-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm">
              <MapPin className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-900">Map preview unavailable</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {query || "We could not resolve the restaurant location right now."}
              </p>
            </div>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Navigation className="h-4 w-4" />
            Open in Maps
          </a>
        </div>
      )}

      {coords && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
            <p className="truncate text-xs text-slate-500">{query}</p>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-100"
          >
            Open in Maps
          </a>
        </div>
      )}
    </div>
  );
}
