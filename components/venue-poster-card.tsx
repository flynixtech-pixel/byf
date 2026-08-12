"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Store } from "lucide-react";

/**
 * Vertical "movie poster" card — BookMyShow/Allevents style. Venues are shot at a
 * 4:5 portrait ratio specifically for this (see PackageStudio's poster upload), so
 * this is the one place that ratio should actually get honoured on screen.
 */
export const VenuePosterCard = memo(function VenuePosterCard({
  href,
  image,
  title,
  subtitle,
  price,
  city,
  badge,
  isFavorite = false,
  onToggleFavorite,
}: {
  href: string;
  image?: string;
  title: string;
  subtitle?: string;
  price?: number;
  city?: string;
  badge?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}) {
  return (
    <Link
      href={href}
      className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-slate-900 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      {image ? (
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-500">
          <Store className="h-10 w-10" />
        </span>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Top Left Badge */}
      {badge && (
        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-white backdrop-blur-md border border-white/10 z-10">
          {badge}
        </span>
      )}

      {/* Top Right Heart Favorite Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite?.(e);
        }}
        aria-label="Favorite venue"
        className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60 active:scale-90 z-10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={isFavorite ? "#f43f5e" : "none"}
          stroke={isFavorite ? "#f43f5e" : "currentColor"}
          strokeWidth="2.5"
          className="h-3.5 w-3.5"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      </button>

      <div className="absolute inset-x-0 bottom-0 p-3.5 z-10">
        <h3 className="line-clamp-1 text-sm sm:text-base font-black leading-tight text-white">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 truncate text-[11px] font-semibold text-white/75">{subtitle}</p>
        )}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          {city && (
            <span className="flex min-w-0 items-center gap-1 truncate text-[11px] font-semibold text-white/80">
              <MapPin className="h-3 w-3 shrink-0 text-white/70" /> <span className="truncate">{city}</span>
            </span>
          )}
          {price !== undefined && (
            <span className="shrink-0 text-sm font-black text-white">₹{price.toLocaleString("en-IN")}</span>
          )}
        </div>
      </div>
    </Link>
  );
});
