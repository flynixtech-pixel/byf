"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronRight, CalendarCheck2, ShieldCheck, Users, Zap } from "lucide-react";
import { LoginModal } from "./modals/LoginModal";
import { SignupModal } from "./modals/SignupModal";

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const router = useRouter();
  // The splash screens were dropped at the client's request — the role picker is
  // now the entry point. There is deliberately no "skip" path: onComplete only
  // fires once the visitor has actually signed in.
  const [step, setStep] = useState<"role" | "player-login" | "player-signup">("role");

  return (
    <>
      <div className="fixed inset-0 z-[100] h-[100dvh] overflow-y-auto bg-neutral-950 text-white">
        {/* Background artwork — supplied as-is, scoped to this screen only. */}
        <Image src="/bg.png" alt="" fill priority className="pointer-events-none z-0 object-cover" />

        {/* Main content — sized to fit one viewport (mobile included) without scrolling. */}
        <div className="relative z-10 flex h-full min-h-[600px] w-full flex-col items-center justify-between px-6 py-4 sm:py-8">

          {/* Wordmark — real BYV logo with a breathing brand-colour glow behind it */}
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-3 duration-700 fill-mode-both">
            <div className="relative mb-2.5 flex h-14 w-14 items-center justify-center sm:mb-4 sm:h-20 sm:w-20">
              <div
                className="absolute inset-[-55%] rounded-full blur-2xl [animation:glow-breathe_4s_ease-in-out_infinite]"
                style={{ background: "radial-gradient(circle, var(--brand-500) 0%, transparent 70%)" }}
              />
              <div className="absolute inset-[-14%] rounded-[24px] border border-brand-500/20" />
              <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] bg-white p-1.5 shadow-xl shadow-brand-900/40 sm:h-20 sm:w-20 sm:rounded-[24px] sm:p-2">
                <Image src="/logo.jpg" alt="Book Your Vibe" width={80} height={80} className="h-full w-full object-contain" priority />
              </div>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-3xl">
              <span className="text-white">Book </span>
              <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">Your</span>
              <span className="text-white"> Vibe</span>
            </h1>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.25em] text-white/40 sm:mt-2 sm:text-[11px] sm:tracking-[0.3em]">BOOK.PLAY.EAT.REPEAT.</p>
            <span className="mt-2 h-px w-12 bg-gradient-to-r from-transparent via-brand-500 to-transparent sm:mt-3 sm:w-16" />
          </div>

          <div className="w-full max-w-sm space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both sm:space-y-3">
            {/* Player Card — brand/orange accent */}
            <button
              onClick={() => setStep("player-login")}
              className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-white/[0.03] to-white/[0.03] p-2.5 text-left shadow-lg shadow-brand-950/30 backdrop-blur-xl transition-all hover:border-brand-500/50 hover:from-brand-500/15 active:scale-[0.98] sm:gap-4 sm:p-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/25 to-brand-600/15 text-base shadow-inner sm:h-11 sm:w-11 sm:text-xl">🏏</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-white sm:text-[15px]">I am a Player</p>
                <p className="mt-0.5 text-[10px] text-white/45 sm:text-xs">Book venues, find games & playpals.</p>
              </div>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-500/40 text-brand-400 transition-transform group-hover:translate-x-0.5 sm:h-9 sm:w-9">
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </button>

            {/* Vendor Card — violet accent, matching the vendor panel's own colour language */}
            <button
              onClick={() => router.push("/vendor/login")}
              className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-white/[0.03] to-white/[0.03] p-2.5 text-left shadow-lg shadow-violet-950/30 backdrop-blur-xl transition-all hover:border-violet-500/50 hover:from-violet-500/15 active:scale-[0.98] sm:gap-4 sm:p-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/25 to-violet-600/15 text-violet-300 shadow-inner sm:h-11 sm:w-11">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:h-5 sm:w-5"><path d="m2 7 4.04-4.04M22 7l-4.04-4.04M2 7l2.1 10.45c.14.72.8 1.25 1.54 1.25h12.72c.74 0 1.4-.53 1.54-1.25L22 7M2 7h20" /><path d="M10 22v-3a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v3" /></svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-white sm:text-[15px]">I am a Venue Owner</p>
                <p className="mt-0.5 text-[10px] text-white/45 sm:text-xs">Manage bookings & pricing.</p>
              </div>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-500/40 text-violet-300 transition-transform group-hover:translate-x-0.5 sm:h-9 sm:w-9">
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </button>
          </div>

          {/* Feature highlights */}
          <div className="grid w-full max-w-lg grid-cols-4 gap-x-2 gap-y-2 animate-in fade-in duration-700 delay-500 fill-mode-both sm:gap-x-4 sm:gap-y-6">
            {[
              { icon: CalendarCheck2, label: "Easy Booking", sub: "Book in just a few taps", accent: "brand" as const },
              { icon: ShieldCheck, label: "Trusted Venues", sub: "Verified & reliable", accent: "violet" as const },
              { icon: Users, label: "Play Together", sub: "Connect. Play. Repeat.", accent: "brand" as const },
              { icon: Zap, label: "Fast & Secure", sub: "Seamless experience", accent: "violet" as const },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center text-center">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full sm:h-10 sm:w-10 ${f.accent === "brand" ? "bg-brand-500/15 text-brand-400" : "bg-violet-500/15 text-violet-300"
                    }`}
                >
                  <f.icon size={13} className="sm:hidden" />
                  <f.icon size={17} className="hidden sm:block" />
                </span>
                <p className="mt-1 text-[9px] font-bold leading-tight text-white sm:mt-2 sm:text-xs">{f.label}</p>
                <p className="mt-0.5 hidden text-[10px] text-white/40 sm:block">{f.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The role screen stays mounted underneath so the site never shows through the
        modal's translucent backdrop. ModalShell is z-50 internally, so this wrapper
        lifts it above the z-[100] screen; it adds no dim of its own. Closing returns
        to the role picker — there is no path into the site without signing in. */}
      {step !== "role" && (
        <div className="relative z-[110]">
          {step === "player-login" ? (
            <LoginModal
              onClose={() => setStep("role")}
              onLoggedIn={onComplete}
              onSwitchToSignup={() => setStep("player-signup")}
            />
          ) : (
            <SignupModal
              onClose={() => setStep("role")}
              onSignedUp={onComplete}
              onSwitchToLogin={() => setStep("player-login")}
            />
          )}
        </div>
      )}
    </>
  );
}
