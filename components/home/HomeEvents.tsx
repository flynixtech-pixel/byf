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
      <div className="relative overflow-hidden rounded-[1.75rem] border border-violet-100 bg-gradient-to-br from-white via-violet-50/70 to-rose-50 p-4 shadow-[0_22px_60px_-35px_rgba(76,29,149,0.45)] sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="relative mb-4 flex items-end justify-between gap-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25 sm:h-12 sm:w-12 sm:rounded-2xl"><Sparkles className="h-5 w-5 sm:h-6 sm:w-6" /></div>
            <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-600 sm:text-[11px]">Happening around you</p><h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-2xl">Discover Events</h2><p className="mt-0.5 hidden text-sm text-slate-500 sm:block">Fresh experiences, live shows and memorable nights.</p></div>
          </div>
          <Link href="/events" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-violet-700 hover:underline sm:text-sm">View All <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>

        <div className="relative flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
          {events.slice(0, 4).map((event, index) => {
            const image = getListingImage(event, "poster");
            const category = event.subCategories?.[0] || "Event";
            return (
              <Link key={event._id} href={`/venues/${event.slug || event._id}`} className="group min-w-[78%] snap-start overflow-hidden rounded-2xl border border-white/80 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:min-w-0">
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  {image ? <Image src={image} alt={event.title} fill priority={index < 2} sizes="(max-width: 640px) 78vw, (max-width: 1024px) 45vw, 280px" className="object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center bg-gradient-to-br from-violet-100 to-rose-100"><CalendarDays className="h-9 w-9 text-violet-400" /></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-slate-950/55 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md">{category}</span>
                  <div className="absolute inset-x-3 bottom-3"><h3 className="line-clamp-1 text-sm font-extrabold text-white sm:text-base">{event.title}</h3><p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-white/85"><CalendarDays className="h-3 w-3" /> {eventDate(event)}</p></div>
                </div>
                <div className="flex items-center justify-between gap-3 p-3">
                  <p className="flex min-w-0 items-center gap-1 text-[11px] font-medium text-slate-500"><MapPin className="h-3.5 w-3.5 shrink-0 text-violet-500" /><span className="truncate">{event.city || "Udaipur"}</span></p>
                  <p className="flex shrink-0 items-center gap-1 text-[10px] font-black text-slate-900"><Ticket className="h-3.5 w-3.5 text-violet-600" />{event.priceTiers?.length ? eventTierSummary(event.priceTiers) : event.price > 0 ? `₹${event.price.toLocaleString("en-IN")}` : "Free"}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
