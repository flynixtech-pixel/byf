"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Flame, MapPin, MessageCircle, ShieldCheck, Swords, XCircle } from "lucide-react";
import { LoginModal } from "@/components/home/modals/LoginModal";
import { SignupModal } from "@/components/home/modals/SignupModal";
import { useCustomerAuth } from "@/components/providers/CustomerAuthProvider";
import { acceptChallenge, getChallengeInvite, rejectChallenge, type Challenge } from "@/lib/api/challenges";

export default function ChallengeInvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { status } = useCustomerAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    getChallengeInvite(code as string)
      .then((data) => {
        if (!cancelled) setChallenge(data);
      })
      .catch(() => {
        if (!cancelled) setError("Challenge link is invalid or expired.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function handleDecision(decision: "accept" | "reject") {
    if (status !== "authenticated") {
      setAuthOpen(true);
      return;
    }
    setBusy(decision);
    setNotice("");
    try {
      const updated = decision === "accept" ? await acceptChallenge(code as string) : await rejectChallenge(code as string);
      setChallenge(updated);
      setNotice(decision === "accept" ? "Challenge accepted. You are now joined as a player." : "Challenge rejected.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not update challenge.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#071018] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(249,115,22,0.24),transparent_30%),radial-gradient(circle_at_80%_100%,rgba(16,185,129,0.16),transparent_34%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-6">
        <button type="button" onClick={() => router.back()} className="inline-flex w-fit items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm font-bold text-slate-300">
          <ArrowLeft className="h-4 w-4" /> Back to BYV
        </button>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <section>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/35 bg-orange-500/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-orange-300">
              <Flame className="h-4 w-4" /> Live Challenge Invite
            </span>
            <h1 className="mt-5 text-4xl font-black uppercase leading-tight tracking-normal sm:text-6xl">
              You have been challenged
            </h1>
            <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-slate-400">
              Login or sign up as a player to accept the match, lock your spot, and keep the WhatsApp challenge thread moving.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleDecision("accept")}
                disabled={busy !== null || challenge?.status !== "pending"}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-white disabled:opacity-50"
              >
                <CheckCircle2 className="h-5 w-5" /> {busy === "accept" ? "Accepting..." : "Accept Challenge"}
              </button>
              <button
                type="button"
                onClick={() => handleDecision("reject")}
                disabled={busy !== null || challenge?.status !== "pending"}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-6 py-3 text-sm font-black uppercase tracking-wide text-slate-200 disabled:opacity-50"
              >
                <XCircle className="h-5 w-5" /> Reject
              </button>
            </div>
            {status !== "authenticated" && (
              <p className="mt-4 text-sm font-semibold text-orange-300">You will be asked to login before joining as a player.</p>
            )}
            {notice && <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">{notice}</p>}
          </section>

          <section className="rounded-[2rem] border border-orange-500/35 bg-slate-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur">
            {loading && <div className="rounded-3xl bg-white/7 p-8 text-center text-sm font-bold text-slate-300">Loading challenge...</div>}
            {error && <div className="rounded-3xl bg-red-500/10 p-8 text-center text-sm font-bold text-red-200">{error}</div>}
            {challenge && <InvitePoster challenge={challenge} />}
          </section>
        </div>
      </div>

      {authOpen &&
        (authView === "login" ? (
          <LoginModal onClose={() => setAuthOpen(false)} onLoggedIn={() => setAuthOpen(false)} onSwitchToSignup={() => setAuthView("signup")} />
        ) : (
          <SignupModal onClose={() => setAuthOpen(false)} onSignedUp={() => setAuthOpen(false)} onSwitchToLogin={() => setAuthView("login")} />
        ))}
    </main>
  );
}

function InvitePoster({ challenge }: { challenge: Challenge }) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-[#090f19] p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-orange-400">Challenge code</p>
          <h2 className="mt-1 text-2xl font-black text-white">{challenge.code}</h2>
        </div>
        <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-bold uppercase text-slate-300">{challenge.status}</span>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Player initials={challenge.poster.challengerInitials} name={challenge.challenger?.name ?? "Challenger"} />
        <Swords className="h-8 w-8 text-orange-400" />
        <Player initials={challenge.poster.opponentInitials} name={challenge.opponent?.name ?? "Opponent"} />
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/7 p-5">
        <p className="text-xl font-black uppercase">{challenge.sport}</p>
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
          <MapPin className="h-4 w-4 text-orange-400" /> {challenge.venueName}
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-300">{challenge.scheduleLabel}</p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <Mini label="Players" value={challenge.playersCount.toUpperCase()} />
        <Mini label="Series" value={challenge.series} />
        <Mini label="Entry" value={challenge.entryFee === 0 ? "Free" : `₹${challenge.entryFee}`} />
      </div>

      <div className="mt-5 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-orange-400">Food / stakes</p>
        <p className="mt-1 text-sm font-black text-white">{challenge.stakeText}</p>
      </div>

      <a
        href={`https://wa.me/?text=${encodeURIComponent(challenge.shareMessage)}`}
        target="_blank"
        rel="noreferrer"
        className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-sm font-black uppercase tracking-wide text-white"
      >
        <MessageCircle className="h-5 w-5" /> Open WhatsApp Share
      </a>
      <p className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
        <ShieldCheck className="h-4 w-4" /> Powered by Book Your Vibe
      </p>
    </div>
  );
}

function Player({ initials, name }: { initials: string; name: string }) {
  return (
    <div className="min-w-0 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-orange-500 bg-orange-500/20 text-xl font-black text-white">
        {initials || "P"}
      </div>
      <p className="mt-3 max-w-[120px] truncate text-xs font-black uppercase">{name}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/7 p-3">
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-black text-white">{value}</p>
    </div>
  );
}
