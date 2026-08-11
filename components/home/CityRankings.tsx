"use client";

/* ------------------------------------------------------------------ */
/*  BYV CITY RANKING                                                   */
/*                                                                     */
/*  The top 20 venues in a city ordered by how many bookings they've   */
/*  actually taken — not a curated list, so it moves on its own. The    */
/*  area filter narrows the board to one locality, which is what makes  */
/*  it useful to a player who only plays near home.                    */
/* ------------------------------------------------------------------ */

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MapPin, Trophy } from "lucide-react";
import { getVenueRankings, type RankedVenue } from "@/lib/api/venues";
import { categoryLabel } from "@/lib/taxonomy";
import { SectionHeading } from "./ui";

const ALL_AREAS = "All areas";
const TOP_N = 20;

/** Categories and tags as hashtags — "#BoxCricket", "#Pickleball". */
function hashtagsFor(venue: RankedVenue): string[] {
  const labels = [...venue.categories.map(categoryLabel), ...venue.tags];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const label of labels) {
    const tag = `#${label.replace(/[^a-zA-Z0-9]/g, "")}`;
    if (tag.length < 2 || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
  }
  return tags.slice(0, 3);
}

/** Gold / silver / bronze for the podium, plain slate below it. */
function rankStyle(rank: number): string {
  if (rank === 1) return "bg-amber-400 text-amber-950";
  if (rank === 2) return "bg-slate-300 text-slate-800";
  if (rank === 3) return "bg-orange-300 text-orange-950";
  return "bg-slate-100 text-slate-600";
}

function useRankings(city: string, area: string) {
  // `loadedKey` doubles as the loading flag: anything the board hasn't answered for
  // yet is still in flight, which avoids a second state write on every filter change.
  const [data, setData] = useState<{ items: RankedVenue[]; areas: string[]; loadedKey: string }>({
    items: [],
    areas: [],
    loadedKey: "",
  });
  const requestKey = `${city}|${area}`;

  useEffect(() => {
    let cancelled = false;
    getVenueRankings({ city, area: area === ALL_AREAS ? undefined : area, limit: TOP_N })
      .then((result) => {
        if (cancelled) return;
        // Areas come from the whole city, so switching filters never empties the picker.
        setData((prev) => ({
          items: result.items,
          areas: area === ALL_AREAS ? result.areas : prev.areas,
          loadedKey: requestKey,
        }));
      })
      .catch(() => {
        if (!cancelled) setData((prev) => ({ items: [], areas: prev.areas, loadedKey: requestKey }));
      });
    return () => {
      cancelled = true;
    };
  }, [city, area, requestKey]);

  return { items: data.items, areas: data.areas, loading: data.loadedKey !== requestKey };
}

function RankRow({
  venue,
  compact,
  onOpen,
}: {
  venue: RankedVenue;
  compact?: boolean;
  onOpen: () => void;
}) {
  const tags = useMemo(() => hashtagsFor(venue), [venue]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-2.5 text-left transition hover:border-brand-300 hover:shadow-sm"
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${rankStyle(
          venue.rank
        )}`}
      >
        {venue.rank}
      </span>

      <span
        className={`relative shrink-0 overflow-hidden rounded-xl bg-slate-100 ${
          compact ? "h-12 w-14" : "h-14 w-16"
        }`}
      >
        {venue.image ? (
          <Image src={venue.image} alt={venue.title} fill sizes="64px" unoptimized className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-slate-300">
            <Trophy className="h-4 w-4" />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold text-slate-900">{venue.title}</span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-medium text-slate-500">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          {venue.area}
        </span>
        {tags.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-600"
              >
                {tag}
              </span>
            ))}
          </span>
        )}
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-sm font-black text-slate-900">{venue.bookings}</span>
        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {venue.bookings === 1 ? "booking" : "bookings"}
        </span>
      </span>
    </button>
  );
}

export function CityRankings({
  city = "Udaipur",
  variant = "desktop",
}: {
  city?: string;
  /** "mobile" drops the section chrome down to the compact home-feed styling. */
  variant?: "desktop" | "mobile";
}) {
  const router = useRouter();
  const [area, setArea] = useState(ALL_AREAS);
  const { items, areas, loading } = useRankings(city, area);

  const openVenue = (venue: RankedVenue) => router.push(`/venues/${venue.slug || venue.listingId}`);

  // A city with no venues yet has nothing to rank — showing an empty board would
  // read as a broken section, so the whole thing stays out of the page.
  if (!loading && items.length === 0 && area === ALL_AREAS) return null;

  const filter = (
    <select
      value={area}
      onChange={(e) => setArea(e.target.value)}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-brand-500"
    >
      <option value={ALL_AREAS}>{ALL_AREAS}</option>
      {areas.map((a) => (
        <option key={a} value={a}>
          {a}
        </option>
      ))}
    </select>
  );

  /*
   * The board is a fixed-height box the list scrolls inside, not 20 rows laid out
   * down the page — the ranking is a glance-and-move-on card, and the venue with the
   * most bookings is the one already in view at the top.
   */
  const board = (
    <div className="max-h-[19rem] space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-slate-100" />
        ))
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No venues ranked in {area} yet.
        </p>
      ) : (
        items.map((venue) => (
          <RankRow
            key={venue.listingId}
            venue={venue}
            compact={variant === "mobile"}
            onOpen={() => openVenue(venue)}
          />
        ))
      )}
    </div>
  );

  if (variant === "mobile") {
    return (
      <section>
        <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-slate-900">{city} Ranking 🏆</h2>
            {filter}
          </div>
          <p className="mb-2 text-[11px] font-medium text-slate-500">
            Top {TOP_N} most-booked venues in {city}.
          </p>
          {board}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="BYV Ranking"
        title={`${city} Ranking`}
        subtitle={`The ${TOP_N} most-booked venues in ${city} right now.`}
        icon={Trophy}
      />
      <div className="max-w-2xl rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Ranked by bookings taken
          </p>
          {filter}
        </div>
        {board}
      </div>
    </section>
  );
}
