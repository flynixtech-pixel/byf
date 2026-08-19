"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Sparkles, Ticket } from "lucide-react";
import type { Listing } from "@/lib/api/types";
import { getListingImage } from "@/lib/api/venues";
import { eventTierSummary } from "@/lib/eventPricing";

function eventDate(event: Listing) {
  if (!event.availableFrom) return "Date coming soon";
  return new Date(event.availableFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function HomeEvents({ events }: { events: Listing[] }) {
  if (events.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="relative">
        <div className="relative mb-4 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-end sm:justify-between sm:mb-6">
          <div className="flex items-center gap-3">
            <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-600 sm:text-[11px]">THE VIBE RIGHT NOW</p><h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-2xl font-display">Upcoming Events 🔥</h2><p className="mt-0.5 hidden text-sm text-slate-500 sm:block">Lock in your tickets for the most hype events and shows.</p></div>
          </div>
          <Link
            href="/events"
            className="hidden sm:inline-flex items-center gap-1 whitespace-nowrap text-xs sm:text-sm font-semibold transition text-brand-600 hover:text-brand-700"
          >
            View More <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Link>
        </div>

        <div className="relative grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {events.slice(0, 4).map((event, index) => {
            const image = getListingImage(event, "poster");
            const category = event.subCategories?.[0] || "Event";
            return (
              <Link key={event._id} href={`/venues/${event.slug || event._id}`} className="group flex flex-col overflow-hidden rounded-[20px] bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-500/10 border border-white/10">
                <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full overflow-hidden">
                  {image ? (
                    <Image src={image} alt={event.title} fill priority={index < 2} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full place-items-center bg-slate-800"><CalendarDays className="h-9 w-9 text-slate-600" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent opacity-80" />
                  <span className="absolute left-3 top-3 rounded-lg bg-black/60 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-md border border-white/10 z-10">{category}</span>
                </div>
                <div className="relative z-10 flex flex-1 flex-col p-4 sm:p-5 -mt-8">
                  <h3 className="line-clamp-2 text-[16px] sm:text-[18px] font-display font-black leading-tight tracking-tight text-white drop-shadow-md">{event.title}</h3>
                  
                  <div className="mt-auto pt-3 sm:pt-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-xs font-bold text-slate-300 uppercase tracking-wide">
                        <CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-brand-500" /> {eventDate(event)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/10 pt-2 sm:pt-2.5">
                      <p className="flex items-center gap-1 sm:gap-1.5 min-w-0 truncate text-[9px] sm:text-xs font-semibold text-slate-400">
                        <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-slate-500" /> <span className="truncate">{event.city || "Udaipur"}</span>
                      </p>
                      <span className="shrink-0 flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-[15px] font-display font-black tracking-wider text-white">
                        <Ticket className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-brand-500" />
                        {event.priceTiers?.length ? eventTierSummary(event.priceTiers) : event.price > 0 ? `₹${event.price.toLocaleString("en-IN")}` : "Free"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <Link href="/events" className="mt-5 block w-full rounded-2xl border border-slate-200 py-2.5 text-center text-[13px] font-bold text-slate-600 sm:hidden">View More Events</Link>
      </div>
    </section>
  );
}
