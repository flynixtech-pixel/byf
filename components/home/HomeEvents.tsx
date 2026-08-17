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
        <div className="relative mb-4 flex items-end justify-between gap-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-600 sm:text-[11px]">THE VIBE RIGHT NOW</p><h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-2xl font-display">Upcoming Events 🔥</h2><p className="mt-0.5 hidden text-sm text-slate-500 sm:block">Lock in your tickets for the most hype events and shows.</p></div>
          </div>
          <Link href="/events" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-violet-700 hover:underline sm:text-sm">View All <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>

        <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {events.slice(0, 4).map((event, index) => {
            const image = getListingImage(event, "poster");
            const category = event.subCategories?.[0] || "Event";
            return (
              <Link key={event._id} href={`/venues/${event.slug || event._id}`} className="group min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  {image ? <Image src={image} alt={event.title} fill priority={index < 2} sizes="(max-width: 640px) 78vw, (max-width: 1024px) 45vw, 280px" className="object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center bg-gradient-to-br from-violet-100 to-rose-100"><CalendarDays className="h-9 w-9 text-violet-400" /></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-slate-950/55 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md">{category}</span>
                  <div className="absolute inset-x-3 bottom-3"><h3 className="line-clamp-1 text-sm font-extrabold text-white sm:text-base">{event.title}</h3><p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-white/85"><CalendarDays className="h-3 w-3" /> {eventDate(event)}</p></div>
                </div>
                <div className="flex items-center justify-between gap-1.5 px-2.5 py-2.5">
                  <p className="flex min-w-0 items-center gap-1 text-[10px] font-medium text-slate-500"><MapPin className="h-3 w-3 shrink-0 text-violet-500" /><span className="truncate">{event.city || "Udaipur"}</span></p>
                  <p className="flex shrink-0 items-center gap-1 text-[9px] font-black text-slate-900"><Ticket className="h-3 w-3 text-violet-600" />{event.priceTiers?.length ? eventTierSummary(event.priceTiers) : event.price > 0 ? `₹${event.price.toLocaleString("en-IN")}` : "Free"}</p>
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
