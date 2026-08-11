"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Trophy, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { TournamentRegistrationFlow } from "@/components/tournament/TournamentRegistrationFlow";
import { getPublicTournamentById } from "@/lib/api/tournaments";
import { ApiError } from "@/lib/api/client";
import { Tournament } from "@/lib/api/types";

const MOCK_TOURNAMENTS: Tournament[] = [
  {
    _id: "tour-1",
    vendorId: "v-1",
    title: "Championship Badminton Cup 2026",
    category: "Badminton",
    description: "Battle it out in the premier Badminton championship of Udaipur. Open to singles and doubles teams.",
    city: "Udaipur",
    state: "Rajasthan",
    address: "One Arena, Shobhagpura",
    entryFee: 500,
    prizeMoney: 15000,
    startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    registrationDeadline: new Date(Date.now() + 86400000 * 3).toISOString(),
    maxTeams: 32,
    registeredTeamsCount: 18,
    status: "Upcoming",
    fixtures: [],
    spotsLeft: 14,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "tour-2",
    vendorId: "v-2",
    title: "BYV Box Cricket Premier League",
    category: "Cricket",
    description: "Fast-paced indoor box cricket league. Standard rules, 8 players per team. Cash prize for Winners & Runners-up.",
    city: "Udaipur",
    state: "Rajasthan",
    address: "Bhawani Nagar Box Turf",
    entryFee: 1200,
    prizeMoney: 25000,
    startDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 12).toISOString(),
    registrationDeadline: new Date(Date.now() + 86400000 * 7).toISOString(),
    maxTeams: 16,
    registeredTeamsCount: 14,
    status: "Upcoming",
    fixtures: [],
    spotsLeft: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "tour-3",
    vendorId: "v-3",
    title: "Udaipur Table Tennis Social League",
    category: "Table Tennis",
    description: "Friendly table tennis social mixes and knockout tournament. Bring your own paddle or rent one at the venue.",
    city: "Udaipur",
    state: "Rajasthan",
    address: "Hiran Magri Table Tennis Club",
    entryFee: 250,
    prizeMoney: 5000,
    startDate: new Date(Date.now() - 86400000 * 1).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 1).toISOString(),
    registrationDeadline: new Date(Date.now() - 86400000 * 2).toISOString(),
    maxTeams: 24,
    registeredTeamsCount: 24,
    status: "Ongoing",
    fixtures: [
      { id: "fix-1", round: "Quarter Finals Match 1", scheduledAt: new Date().toISOString(), status: "Completed", teamAScore: 3, teamBScore: 1, teamAId: "team-1", teamBId: "team-2" },
      { id: "fix-2", round: "Quarter Finals Match 2", scheduledAt: new Date().toISOString(), status: "Scheduled", teamAId: "team-3", teamBId: "team-4" }
    ],
    spotsLeft: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    getPublicTournamentById(id)
      .catch((err) => {
        const mock = MOCK_TOURNAMENTS.find((t) => t._id === id);
        if (mock) return mock;
        if (!(err instanceof ApiError)) throw err;
        return null;
      })
      .then((data) => {
        if (data) {
          setTournament(data);
        } else {
          const mock = MOCK_TOURNAMENTS.find((t) => t._id === id);
          if (mock) setTournament(mock);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center text-sm text-slate-400">Loading tournament...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <Trophy className="mx-auto h-16 w-16 text-slate-300" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Tournament not found</h1>
          <p className="mt-2 text-sm text-slate-500">This tournament may have wrapped up or the link is incorrect.</p>
          <Link
            href="/tournaments"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Browse all tournaments
          </Link>
        </div>
      </div>
    );
  }

  const canRegister = tournament.status === "Upcoming" && new Date(tournament.registrationDeadline) > new Date() && tournament.spotsLeft !== 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to tournaments
        </button>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">{tournament.category}</p>
              <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{tournament.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-brand-500" />
                  {new Date(tournament.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  {" – "}
                  {new Date(tournament.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-brand-500" /> {tournament.city}, {tournament.address}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{tournament.description}</p>
            </section>

            {!!tournament.leaderboard?.length && (
              <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                  <Trophy className="h-5 w-5 text-brand-500" /> Leaderboard
                </h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead>
                      <tr className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        <th className="pb-2">Team</th>
                        <th className="pb-2 text-center">P</th>
                        <th className="pb-2 text-center">W</th>
                        <th className="pb-2 text-center">D</th>
                        <th className="pb-2 text-center">L</th>
                        <th className="pb-2 text-right">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournament.leaderboard.map((row, idx) => (
                        <tr key={row.teamId} className="border-t border-slate-100">
                          <td className="py-2 font-semibold text-slate-900">
                            {idx + 1}. {row.teamName}
                          </td>
                          <td className="py-2 text-center text-slate-600">{row.played}</td>
                          <td className="py-2 text-center text-slate-600">{row.wins}</td>
                          <td className="py-2 text-center text-slate-600">{row.draws}</td>
                          <td className="py-2 text-center text-slate-600">{row.losses}</td>
                          <td className="py-2 text-right font-bold text-brand-600">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold text-slate-900">Fixtures</h2>
              {tournament.fixtures.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Fixtures will be posted once registration closes.</p>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  {tournament.fixtures.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 text-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{f.round}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(f.scheduledAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {f.status === "Completed" ? (
                        <span className="font-bold text-slate-900">
                          {f.teamAScore} – {f.teamBScore}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Scheduled</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entry fee per team</p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {tournament.entryFee > 0 ? `₹${tournament.entryFee.toLocaleString("en-IN")}` : "Free"}
              </p>

              {!!tournament.prizeMoney && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  <Trophy className="h-4 w-4" /> ₹{tournament.prizeMoney.toLocaleString("en-IN")} prize pool
                </p>
              )}

              <div className="mt-4 space-y-2 border-y border-slate-100 py-4 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-brand-500" />
                  Registration closes {new Date(tournament.registrationDeadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </p>
                {typeof tournament.spotsLeft === "number" && (
                  <p className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-brand-500" />
                    {tournament.spotsLeft} team spot{tournament.spotsLeft === 1 ? "" : "s"} left
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={!canRegister}
                onClick={() => setRegistering(true)}
                className={`mt-5 w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-md transition ${
                  canRegister
                    ? "bg-gradient-to-r from-brand-500 to-brand-600 shadow-brand-500/30 hover:scale-[1.01]"
                    : "cursor-not-allowed bg-slate-300"
                }`}
              >
                {tournament.status !== "Upcoming"
                  ? tournament.status
                  : tournament.spotsLeft === 0
                    ? "Tournament Full"
                    : "Register Your Team"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {registering && <TournamentRegistrationFlow tournament={tournament} onClose={() => setRegistering(false)} />}
    </div>
  );
}
