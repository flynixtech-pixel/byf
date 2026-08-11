"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Swords, Users } from "lucide-react";
import { SiteHeader } from "../../components/site-header";
import { MobileCard, MobileTopBar } from "@/components/mobile/ui";
import type { Challenge } from "@/lib/api/challenges";
import { ChallengeFlow } from "@/components/challenges/ChallengeFlow";

const RECENT_CHALLENGES_KEY = "byv_recent_challenges";

function statusStyle(status: Challenge["status"]) {
  switch (status) {
    case "accepted":
      return "bg-emerald-50 text-emerald-700";
    case "rejected":
    case "cancelled":
      return "bg-rose-50 text-rose-600";
    case "completed":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function ChallengeRow({ challenge }: { challenge: Challenge }) {
  return (
    <Link href={`/challenge/${challenge.code}`}>
      <MobileCard className="flex flex-col gap-2 !p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">{challenge.sport}</p>
            <h2 className="mt-1 text-sm font-extrabold text-slate-900">
              {challenge.challenger?.name ?? "You"} vs {challenge.opponent?.name ?? "Opponent"}
            </h2>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${statusStyle(challenge.status)}`}>
            {challenge.status}
          </span>
        </div>
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3 w-3" /> {challenge.venueName} · {challenge.scheduleLabel}
        </p>
        <p className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {challenge.playersCount}
          </span>
          <span>{challenge.series}</span>
          <span>{challenge.stakeType}</span>
        </p>
      </MobileCard>
    </Link>
  );
}

function readRecentChallenges(): Challenge[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_CHALLENGES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function ChallengesPage() {
  const [challenges] = useState<Challenge[]>(readRecentChallenges);
  const [isFlowOpen, setIsFlowOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_42%,_#ffffff_78%)]">
      <div className="hidden sm:block">
        <SiteHeader />
      </div>

      <div className="sm:hidden px-4 pt-4">
        <MobileTopBar />
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-600">View Challenges</p>
          <div className="flex items-center justify-between mt-2">
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Every duel you&apos;ve thrown or accepted.
            </h1>
            <button
              onClick={() => setIsFlowOpen(true)}
              className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm"
            >
              New Challenge
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Challenges you create on this device show up here with their live status.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {challenges.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <Swords className="h-8 w-8 text-slate-300" />
              <div>
                <p className="text-sm font-semibold text-slate-500">No challenges yet.</p>
                <p className="text-xs text-slate-400 mt-1">Ready to throw down the gauntlet?</p>
              </div>
              <button
                onClick={() => setIsFlowOpen(true)}
                className="rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
              >
                Launch a Vibe Challenge
              </button>
            </div>
          ) : (
            challenges.map((c) => <ChallengeRow key={c.code} challenge={c} />)
          )}
        </div>
      </main>

      {isFlowOpen && <ChallengeFlow onClose={() => setIsFlowOpen(false)} />}
    </div>
  );
}
