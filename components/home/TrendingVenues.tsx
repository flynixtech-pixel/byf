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
    <div className="group flex w-full flex-col overflow-hidden rounded-[1.25rem] border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
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
        className="relative aspect-[16/9] w-full cursor-pointer overflow-hidden bg-slate-100 text-left"
      >
        {venue.image ? (
          <Image
            src={venue.image}
            alt={venue.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 250px"
            className="object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-50">
            <Building2 className="h-6 w-6 text-slate-300" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />
        
        <div className="absolute left-2.5 top-2.5">
          <StarRating rating={venue.rating} />
        </div>
        
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow-sm transition hover:scale-110"
          aria-label="Toggle favorite"
        >
          <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
        </button>
        
        <div className="absolute left-2.5 bottom-2.5 scale-90 origin-bottom-left">
          <StatusPill status={venue.status} />
        </div>
      </div>
      
      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <h3 className="line-clamp-2 text-[13px] font-display font-bold leading-tight text-slate-900 drop-shadow-sm mb-1" title={venue.name}>
          {venue.name}
        </h3>
        <p className="flex items-center gap-1 text-[10px] font-medium text-slate-500 mb-2">
          <MapPin className="h-3 w-3 shrink-0 text-brand-500" aria-hidden /> <span className="truncate">{venue.area}</span>
        </p>
        <div className="mt-auto flex items-end justify-between border-t border-slate-100/50 pt-2">
          <div className="flex flex-col justify-center">
            {venue.strikePrice && venue.strikePrice > venue.pricePerHour && (
              <div className="mb-0.5 flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-slate-400 line-through">₹{venue.strikePrice}</span>
                <span className="text-[8px] font-extrabold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100/50 uppercase tracking-wider">
                  {Math.round(((venue.strikePrice - venue.pricePerHour) / venue.strikePrice) * 100)}% OFF
                </span>
              </div>
            )}
            <p className="text-[13px] font-black text-slate-900">
              ₹{venue.pricePerHour}
              <span className="font-bold text-slate-400 text-[9px]"> /hr</span>
            </p>
          </div>
          <PrimaryButton onClick={onBook} className="!px-3 !py-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wide shadow-sm active:scale-95 transition-transform">
            Book
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
    <section id="venues" className="mx-auto mt-4 sm:mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading
        title="Top Tier Turfs"
        icon={Flame}
        actionLabel="View More"
        onAction={onViewAll}
        hideActionOnMobile={true}
      />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
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
        className="mt-6 w-full rounded-[1rem] border border-slate-200 py-2.5 text-[13px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 sm:hidden"
      >
        View More Venues
      </button>
    </section>
  );
}