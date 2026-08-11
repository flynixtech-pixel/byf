"use client";

import { Fragment } from "react";
import Image from "next/image";
import {
  Award,
  Zap,
  Wallet,
  ShieldCheck,
  LayoutGrid,
  CalendarCheck2,
  MessageCircle,
  Check,
  Minus,
} from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: Zap,
    bg: "bg-amber-50",
    text: "text-amber-600",
    title: "Last Min Boost",
    body: "Fill empty slots in real time — one-tap discounts on today's unbooked slots as they're about to go empty.",
  },
  {
    icon: Wallet,
    bg: "bg-lime-50",
    text: "text-lime-700",
    title: "Clear Settlement Ledger",
    body: "See exactly what BYV owes you from online bookings, and what you owe BYV on offline cash bookings — no guesswork.",
  },
  {
    icon: ShieldCheck,
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    title: "Role-Based Team Access",
    body: "Give family, managers or staff exactly the access they need, with ready-made presets — no manual checkbox hunting.",
  },
  {
    icon: LayoutGrid,
    bg: "bg-sky-50",
    text: "text-sky-600",
    title: "One Account, Every Vertical",
    body: "Run Turf, Coaching, Food and Events from a single dashboard instead of juggling separate tools.",
  },
  {
    icon: CalendarCheck2,
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    title: "Real-Time Slot Sync",
    body: "Online and offline/walk-in bookings update the same live calendar — customers never see a slot that's already taken.",
  },
  {
    icon: MessageCircle,
    bg: "bg-green-50",
    text: "text-green-600",
    title: "Direct WhatsApp Support",
    body: "Talk to a real person on our support line when you need help — not a ticket queue.",
  },
];

/** Rows for the head-to-head table. `them: false` = the other app doesn't offer it. */
const COMPARISON: { label: string; them: boolean }[] = [
  { label: "Real-time slot sync across online + offline bookings", them: false },
  { label: "One-tap last-minute discounting on unsold slots", them: false },
  { label: "Combined receivable / payable settlement ledger", them: false },
  { label: "Turf, Coaching, Food & Events from one account", them: false },
  { label: "Ready-made role presets for your team", them: false },
  { label: "Direct WhatsApp support line", them: false },
];

/* Two brand columns, sized together so the header chips and the ✓/✗ cells always line up. */
const COLS = "grid-cols-[1fr_58px_58px] sm:grid-cols-[1fr_92px_92px]";

export default function WhyUsPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* ── HEAD-TO-HEAD TABLE (hero) ─────────────────────────────────── */}
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-slate-900">See the difference</h1>
        <p className="text-sm text-slate-500 mt-1">
          Everything Book Your Vibe gives you that the other booking apps still don&apos;t.
        </p>
      </div>

      <div className="mb-10 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        {/* Brand column headers — BYV (branded) vs the competitor (purple, logo blurred) */}
        <div className={`grid ${COLS} gap-2 px-4 pt-4 sm:px-5`}>
          <span />
          <div className="flex flex-col items-center gap-1.5 rounded-t-2xl border border-b-0 border-emerald-100 bg-gradient-to-b from-emerald-50 to-white pt-3 pb-2">
            <Image
              src="/logo.jpg"
              alt="Book Your Vibe"
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl object-contain shadow-sm ring-1 ring-emerald-100"
            />
            <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700">BYV</span>
          </div>
          <div className="relative flex flex-col items-center gap-1.5 overflow-hidden rounded-t-2xl border border-b-0 border-violet-200 bg-gradient-to-b from-violet-200/70 to-white pt-3 pb-2">
            {/* Logo intentionally blurred — the purple carries the "it's the other guys" signal. */}
            <Image
              src="/compete.jpeg"
              alt=""
              aria-hidden
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl object-cover opacity-90 blur-[3px]"
            />
            <span className="text-[8px] font-black uppercase tracking-wider text-violet-500">The other app</span>
          </div>
        </div>

        {/* Feature rows — continuous emerald / violet bands read as two "sides" */}
        <div className={`grid ${COLS} gap-2 px-4 sm:px-5`}>
          {COMPARISON.map((row, i) => {
            const last = i === COMPARISON.length - 1;
            return (
              <Fragment key={row.label}>
                <div className="flex items-center border-t border-slate-100 py-3.5 pr-1 text-xs font-semibold text-slate-700">
                  {row.label}
                </div>
                <div
                  className={`flex items-center justify-center border-x border-emerald-100 bg-emerald-50/70 py-3.5 ${
                    last ? "rounded-b-2xl border-b" : ""
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
                    <Check size={15} strokeWidth={3} />
                  </span>
                </div>
                <div
                  className={`flex items-center justify-center border-x border-violet-100 bg-violet-50/60 py-3.5 ${
                    last ? "rounded-b-2xl border-b" : ""
                  }`}
                >
                  {row.them ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-white">
                      <Check size={15} strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-violet-300 ring-1 ring-violet-200">
                      <Minus size={15} strokeWidth={3} />
                    </span>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>

        <p className="px-4 py-3 text-center text-[10px] font-medium text-slate-400 sm:px-5">
          Comparison is indicative, based on publicly available features. Logos belong to their respective owners.
        </p>
      </div>

      {/* ── WHY BOOK YOUR VIBE (moved below the table) ─────────────────── */}
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
          <Award className="text-rose-500" /> Why Book Your Vibe?
        </h2>
        <p className="mt-1 text-sm text-slate-500">What BYV gives you that a typical booking app doesn&apos;t.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {HIGHLIGHTS.map((h) => (
          <div key={h.title} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${h.bg} ${h.text}`}>
              <h.icon size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">{h.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{h.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
