"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TopPlayersRanking } from "@/components/home/TopPlayersRanking";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/home/Footer";

export default function LeaderboardPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f3f4fb] text-slate-900 pb-16">
      <SiteHeader />
      {/* Top Header Navigation */}
      <div className="bg-slate-900 text-white px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20 transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="text-xs font-extrabold uppercase tracking-widest text-brand-400">
            Leaderboard
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        <TopPlayersRanking fullPage={true} />
      </div>
      
      <Footer />
    </div>
  );
}
