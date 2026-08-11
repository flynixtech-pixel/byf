"use client";

import { useEffect, useRef } from "react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";

const PIN_HTML = `<div style="transform:translate(-50%,-100%)">
  <svg width="30" height="42" viewBox="0 0 24 24" fill="#6d28d9" stroke="white" stroke-width="1.5">
    <path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 7 11.5 7.3 11.8a1 1 0 0 0 1.4 0C13 21.5 20 15.4 20 10c0-4.4-3.6-8-8-8Z"/>
    <circle cx="12" cy="10" r="2.6" fill="white" stroke="none"/>
  </svg></div>`;

/** Read-only mini map showing a single coach location pin. */
export function CoachMap({ lat, lng, height = 200 }: { lat: number; lng: number; height?: number }) {
  const el = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default as typeof LeafletNS;
      if (cancelled || !el.current || mapRef.current) return;
      const map = L.map(el.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView([lat, lng], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap", maxZoom: 19 }).addTo(map);
      L.marker([lat, lng], { icon: L.divIcon({ html: PIN_HTML, className: "", iconSize: [30, 42] }) }).addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  return <div ref={el} style={{ height }} className="w-full overflow-hidden rounded-2xl border border-slate-100" />;
}
