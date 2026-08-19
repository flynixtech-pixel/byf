"use client";

import { ArrowRight, Flame, MapPin, Swords, PlusCircle, GraduationCap } from "lucide-react";
import { PrimaryButton, SectionHeading } from "./ui";

export function CommunityMatches({
  onJoin,
  onHost,
  onBookCoach,
  onViewAll,
  onLaunchChallenge,
}: {
  onJoin: () => void;
  onHost: () => void;
  onBookCoach: () => void;
  onViewAll: () => void;
  onLaunchChallenge: () => void;
}) {
  return (
    <section id="community" className="mx-auto mt-6 sm:mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Squad Up"
        title="Matches & Challenges 🏆"
        subtitle="Find active players, crash an open match, or send a challenge."
        actionLabel="View All"
        onAction={onViewAll}
      />
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <button
          type="button"
          onClick={onLaunchChallenge}
          className="group relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-left text-white shadow-xl shadow-slate-900/10 transition active:scale-[0.99] flex flex-col justify-between"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(249,115,22,0.34),transparent_34%),radial-gradient(circle_at_80%_100%,rgba(16,185,129,0.18),transparent_38%)]" />
          <div className="relative flex flex-col h-full justify-between w-full">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/35 bg-orange-500/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-orange-300">
                <Flame className="h-4 w-4" /> Vibe Challenge
              </span>
              <h3 className="mt-3.5 text-xl font-bold uppercase leading-tight">Challenge a Friend</h3>
              <p className="mt-2 max-w-md text-xs font-medium text-slate-400">
                Pick a sport, set the stakes, and send a cinematic duel poster to your opponent.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between w-full">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="text-[10px] font-bold uppercase tracking-wide">Generate poster &amp; share</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-orange-400">
                  View Details <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </span>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                <Swords className="h-5 w-5" />
              </span>
            </div>
          </div>
        </button>

        <div className="flex flex-col gap-3">
          {/* Card 1: Join Match */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Swords className="h-5 w-5" />
              </span>
              <div>
                <span className="inline-block rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
                  Open Match
                </span>
                <p className="text-sm font-bold text-slate-900 mt-1">Badminton Doubles</p>
                <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" /> Shobhagpura · 1.2 km
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
              <div className="sm:text-right">
                <p className="text-xs font-bold text-brand-600">Today, 8:00 PM</p>
                <p className="text-[10px] text-slate-500">₹100 / Player</p>
              </div>
              <PrimaryButton onClick={onJoin} className="text-xs px-4 py-2">Join Now</PrimaryButton>
            </div>
          </div>

          {/* Card 2: Host a Match */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
                <PlusCircle className="h-5 w-5" />
              </span>
              <div>
                <span className="inline-block rounded-full bg-orange-50 border border-orange-100 px-2.5 py-0.5 text-[9px] font-bold text-orange-700 uppercase tracking-wider">
                  Host Match
                </span>
                <p className="text-sm font-bold text-slate-900 mt-1">Create Match Lobby</p>
                <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  Rent a court &amp; invite community players
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
              <div className="sm:text-right">
                <p className="text-xs font-bold text-orange-600">Instant Setup</p>
                <p className="text-[10px] text-slate-500">Split payment active</p>
              </div>
              <PrimaryButton onClick={onHost} className="text-xs px-4 py-2 bg-orange-500 hover:bg-orange-600 border-orange-500 hover:border-orange-600 shadow-orange-500/10">Host Lobby</PrimaryButton>
            </div>
          </div>

          {/* Card 3: Book a Coach - HIDDEN FOR NOW
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <GraduationCap className="h-5 w-5" />
              </span>
              <div>
                <span className="inline-block rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-wider">
                  Coaches
                </span>
                <p className="text-sm font-bold text-slate-900 mt-1">Book Professional Coach</p>
                <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  1-on-1 or group slots at nearby venues
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
              <div className="sm:text-right">
                <p className="text-xs font-bold text-blue-600">Learn &amp; Excel</p>
                <p className="text-[10px] text-slate-500">Verified instructors</p>
              </div>
              <PrimaryButton onClick={onBookCoach} className="text-xs px-4 py-2 bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 shadow-blue-500/10">Book Coach</PrimaryButton>
            </div>
          </div>
          */}
        </div>
      </div>
    </section>
  );
}
