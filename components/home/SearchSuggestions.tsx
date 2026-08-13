"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Compass, Flame, MapPin, Search, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { type Venue } from "@/lib/venues";

export interface SearchSuggestionItem {
  id: string;
  label: string;
  category?: string;
  type: "category" | "venue" | "popular";
  iconEmoji?: string;
  city?: string;
  href: string;
}

const POPULAR_SEARCHES: SearchSuggestionItem[] = [
  { id: "pop-1", label: "Pickleball Courts", type: "popular", iconEmoji: "🏓", href: "/venues?category=pickleball" },
  { id: "pop-2", label: "Box Cricket Arenas", type: "popular", iconEmoji: "🏏", href: "/venues?category=cricket" },
  { id: "pop-3", label: "Football Turf", type: "popular", iconEmoji: "⚽", href: "/venues?category=football" },
  { id: "pop-4", label: "Badminton Courts", type: "popular", iconEmoji: "🏸", href: "/venues?category=badminton" },
];

interface Props {
  query: string;
  venues: Venue[];
  isOpen: boolean;
  onClose: () => void;
  onSelectSuggestion: (href: string) => void;
}

export function SearchSuggestions({
  query,
  venues,
  isOpen,
  onClose,
  onSelectSuggestion,
}: Props) {
  const trimmedQuery = query.trim().toLowerCase();

  // Instant in-memory filter across top venues & categories (0ms DB delay)
  const matches = useMemo(() => {
    if (!trimmedQuery) return [];

    const venueResults: SearchSuggestionItem[] = venues
      .filter(
        (v) =>
          v.name.toLowerCase().includes(trimmedQuery) ||
          v.area.toLowerCase().includes(trimmedQuery) ||
          v.sport.toLowerCase().includes(trimmedQuery)
      )
      .slice(0, 4)
      .map((v) => ({
        id: v.id,
        label: v.name,
        city: v.area,
        type: "venue",
        href: `/venues/${v.slug || v.id}`,
      }));

    return venueResults;
  }, [trimmedQuery, venues]);

  if (!isOpen) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[300px] sm:max-h-[360px] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] animate-in fade-in slide-in-from-top-2 duration-200 sm:p-4 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* State 1: User typed something */}
      {trimmedQuery ? (
        <div>
          {matches.length > 0 ? (
            <div className="space-y-1">
              <p className="px-2 pb-1.5 text-[10.5px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-brand-500" /> Instant Matches
              </p>
              {matches.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectSuggestion(item.href);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-800 hover:bg-slate-100/80 transition cursor-pointer group"
                >
                  <span className="flex items-center gap-2 truncate">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 group-hover:text-brand-600 transition" />
                    <span className="truncate group-hover:text-brand-600">{item.label}</span>
                  </span>
                  {item.city && (
                    <span className="shrink-0 text-[10.5px] font-semibold text-slate-400">
                      {item.city}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center">
              <p className="text-xs font-semibold text-slate-600">
                Search for &ldquo;{query}&rdquo; across all venues & events
              </p>
              <button
                type="button"
                onClick={() => {
                  onSelectSuggestion(`/venues?search=${encodeURIComponent(query)}`);
                  onClose();
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-extrabold text-brand-600 hover:bg-brand-100 transition cursor-pointer"
              >
                <Search className="h-3 w-3" /> View search results
              </button>
            </div>
          )}
        </div>
      ) : (
        /* State 2: Input focus (empty query) — 2 to 4 Live Packages (Name & Price) */
        <div className="space-y-1">
          <p className="px-2 pb-1.5 text-[10.5px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-amber-500" /> Live Packages
          </p>
          {(venues.length > 0 ? venues.slice(0, 4) : [
            { id: "p1", name: "Royal Box Cricket Turf", pricePerHour: 800, slug: "royal-box-cricket" },
            { id: "p2", name: "Udaipur Badminton Club", pricePerHour: 400, slug: "udaipur-badminton" },
            { id: "p3", name: "Lake City Football Arena", pricePerHour: 1200, slug: "lake-city-football" },
            { id: "p4", name: "Smash Pickleball Court", pricePerHour: 600, slug: "smash-pickleball" },
          ]).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                onSelectSuggestion(`/venues/${v.slug || v.id}`);
                onClose();
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-800 hover:bg-slate-100/80 transition cursor-pointer group"
            >
              <span className="flex items-center gap-2 truncate">
                <Compass className="h-3.5 w-3.5 text-slate-400 group-hover:text-brand-600 transition" />
                <span className="truncate group-hover:text-brand-600">{v.name}</span>
              </span>
              <span className="shrink-0 text-[11px] font-black text-slate-900 bg-slate-100/70 px-2 py-0.5 rounded-md">
                ₹{v.pricePerHour} <span className="font-semibold text-slate-500 text-[10px]">/hr</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
