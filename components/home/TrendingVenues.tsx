"use client";

import Image from "next/image";
import { Building2, Flame, Heart, MapPin } from "lucide-react";
import { type Venue } from "@/lib/venues";
import { PrimaryButton, SectionHeading, StarRating, StatusPill } from "./ui";

function VenueCard({
  venue,
  isFavorite,
  onToggleFavorite,
  onView,
  onBook,
}: {
  venue: Venue;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onView: () => void;
  onBook: () => void;
}) {
  return (
    <div className="group flex w-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div
        role="button"
        tabIndex={0}
        onClick={onView}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onView();
          }
        }}
        className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-slate-100 text-left"
      >
        {/* next/image (was a CSS background-image): optimised + lazy-loaded, and a 4:3
            box keeps the photo in a natural shape instead of a cropped letterbox strip. */}
        {venue.image ? (
          <Image
            src={venue.image}
            alt={venue.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100">
            <Building2 className="h-8 w-8 text-slate-300" />
          </div>
        )}
        {/* Keeps the overlaid pills readable on bright photos. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" />
        <div className="absolute left-3 top-3">
          <StarRating rating={venue.rating} />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow"
          aria-label="Toggle favorite"
        >
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-accent-500 text-accent-500" : "text-slate-400"}`} />
        </button>
        {/* inset-x-3 (not just left-3) bounds the row, so a multi-sport venue listing
            seven categories truncates to one line instead of stacking over the photo. */}
        <div className="absolute left-3 bottom-3">
          <StatusPill status={venue.status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-bold text-slate-900">{venue.name}</h3>
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5" aria-hidden /> {venue.area}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">
            ₹{venue.pricePerHour}
            <span className="font-normal text-slate-400"> /hour</span>
          </p>
          <PrimaryButton onClick={onBook} className="!px-4 !py-2 text-xs">
            Book Now
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export function TrendingVenues({
  venues,
  favorites,
  onToggleFavorite,
  onViewVenue,
  onBookVenue,
  onViewAll,
}: {
  venues: Venue[];
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  onViewVenue: (v: Venue) => void;
  onBookVenue: (v: Venue) => void;
  onViewAll: () => void;
}) {
  if (venues.length === 0) return null;

  return (
    <section id="venues" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
      <SectionHeading
        eyebrow="Booked the most this week"
        title="Trending Venues"
        subtitle="Hand-picked from real booking volume across Udaipur — updated daily."
        icon={Flame}
        actionLabel="View All Venues"
        onAction={onViewAll}
      />
      {/* Was grid-cols-2 at every width, which stretched each card to ~630px on desktop. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {venues.slice(0, 4).map((v) => (
          <VenueCard
            key={v.id}
            venue={v}
            isFavorite={favorites.has(v.id)}
            onToggleFavorite={() => onToggleFavorite(v.id)}
            onView={() => onViewVenue(v)}
            onBook={() => onBookVenue(v)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onViewAll}
        className="mt-4 w-full rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-600"
      >
        View More Venues
      </button>
    </section>
  );
}