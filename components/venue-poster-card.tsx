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
}: {
  href: string;
  image?: string;
  title: string;
  subtitle?: string;
  price?: number;
  city?: string;
  badge?: string;
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

      {badge && (
        <span className="absolute right-2.5 top-2.5 rounded-full bg-black/50 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wide text-white backdrop-blur">
          {badge}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <h3 className="line-clamp-2 text-[14.5px] font-black leading-tight text-white">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 truncate text-[11px] font-semibold text-white/70">{subtitle}</p>
        )}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          {city && (
            <span className="flex min-w-0 items-center gap-1 truncate text-[11px] font-medium text-white/70">
              <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{city}</span>
            </span>
          )}
          {price !== undefined && (
            <span className="shrink-0 text-[13px] font-extrabold text-white">₹{price.toLocaleString("en-IN")}</span>
          )}
        </div>
      </div>
    </Link>
  );
});
