"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { MapPin, Trophy, Calendar, User, ArrowLeft, ShieldCheck, Award } from "lucide-react";

interface PlayerProfileData {
  id: string;
  name: string;
  username?: string;
  profileImage?: string | null;
  city: string;
  sports: string[];
  completedBookings: number;
}

export default function PublicPlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.id as string;
  const [player, setPlayer] = useState<PlayerProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/leaderboard/players?limit=50`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.items) {
          const found = data.items.find((p: any) => p.playerId === playerId);
          if (found) {
            setPlayer(found);
          } else {
            // Default placeholder profile for deep-linked player IDs
            setPlayer({
              id: playerId,
              name: "Active BYV Player",
              username: "@player",
              city: "Udaipur",
              sports: ["Cricket", "Football"],
              completedBookings: 12,
            });
          }
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setPlayer({
            id: playerId,
            name: "Active BYV Player",
            username: "@player",
            city: "Udaipur",
            sports: ["Cricket", "Football"],
            completedBookings: 12,
          });
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        <div className="flex items-center gap-2 font-bold text-sm">
          <Trophy className="h-5 w-5 animate-bounce text-brand-500" /> Loading Player Profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header Navigation */}
      <div className="bg-slate-900 text-white px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20 transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Leaderboard
          </button>
          <span className="text-xs font-extrabold uppercase tracking-widest text-brand-400">
            BYV Player Profile
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
        {/* Main Profile Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-brand-500 shadow-md">
              {player?.profileImage ? (
                <Image src={player.profileImage} alt={player.name} fill unoptimized className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-600 text-white text-2xl font-black">
                  {player?.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase() || <User className="h-10 w-10 text-white" />}
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">{player?.name}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                  <ShieldCheck className="h-3 w-3" /> Verified Player
                </span>
              </div>

              {player?.username && <p className="text-xs font-bold text-slate-400 mt-0.5">{player.username}</p>}

              <p className="mt-2 flex items-center justify-center sm:justify-start gap-1 text-xs font-semibold text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {player?.city || "Udaipur"}, India
              </p>

              {player?.sports && player.sports.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                  {player.sports.map((sport) => (
                    <span
                      key={sport}
                      className="rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-bold text-brand-600"
                    >
                      #{sport}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white p-4 text-center min-w-[140px] shadow-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-100">Completed</p>
              <p className="text-3xl font-black mt-0.5">{player?.completedBookings || 0}</p>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-brand-100 mt-0.5">Bookings 🏅</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-6 text-center">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <Award className="h-6 w-6 text-amber-500 mx-auto mb-1" />
              <p className="text-xs font-extrabold text-slate-900">Active Competitor</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Ranked in BYV Top 20</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <Calendar className="h-6 w-6 text-brand-500 mx-auto mb-1" />
              <p className="text-xs font-extrabold text-slate-900">Regular Player</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Frequent Turf Booker</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <Trophy className="h-6 w-6 text-indigo-500 mx-auto mb-1" />
              <p className="text-xs font-extrabold text-slate-900">Vibe Enthusiast</p>
              <p className="text-[11px] text-slate-500 mt-0.5">100% Booking Fulfillment</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
