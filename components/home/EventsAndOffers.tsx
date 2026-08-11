"use client";

import { ArrowRight, Calendar, MapPin, Medal, Sparkles, Trophy } from "lucide-react";
import { SectionHeading } from "./ui";

export function EventsAndOffers({
  onViewAllEvents,
}: {
  onViewAllEvents: () => void;
}) {
  return (
    <section id="tournaments" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading title="Upcoming Events & Tournaments" subtitle="Participate in local leagues, tournaments and compete for exciting prize pools." />

      <div
        onClick={onViewAllEvents}
        className="group relative cursor-pointer overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-[0_10px_35px_rgba(245,158,11,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(245,158,11,0.18)]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Banner Cover */}
          <div className="relative h-44 lg:h-auto lg:col-span-5 overflow-hidden bg-slate-900 p-6 text-white flex flex-col justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/events-banner.png"
              alt="Upcoming Events Banner"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 lg:bg-gradient-to-r lg:from-black/80 lg:via-black/40 lg:to-black/20" />

            <div className="relative z-10 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-md">
                <Sparkles className="h-3 w-3 fill-slate-950" /> Championship
              </span>
              <span className="rounded-full bg-black/65 backdrop-blur-md px-3 py-1 text-[10px] font-extrabold text-amber-200 border border-amber-400/30">
                ₹50,000 Prize Pool
              </span>
            </div>

            <div className="relative z-10 mt-auto">
              <p className="text-xs font-extrabold uppercase tracking-widest text-amber-300">Annual Tournament</p>
              <h3 className="text-2xl font-black text-white drop-shadow-md">BYV Premier League 2026</h3>
            </div>
          </div>

          {/* Right Details */}
          <div className="p-6 lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                  <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>31 May – 6 June 2026</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>Maharana Pratap Khel Gaon, Udaipur</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-amber-50/80 border border-amber-100 p-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                  <Trophy className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-slate-900">Multi-Sport Championship</p>
                  <p className="text-xs font-medium text-amber-800">Football · Pickleball · Badminton · Lawn Tennis</p>
                </div>
                <div className="shrink-0 text-right pr-2">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Available Slots</span>
                  <span className="text-sm font-black text-emerald-600">12 / 16 Teams</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs font-semibold text-slate-500">Open for all registered BYV players and teams</span>
              <button
                type="button"
                onClick={onViewAllEvents}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-amber-500/20 transition group-hover:brightness-110"
              >
                <Medal className="h-4 w-4" /> Register &amp; View Details
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
