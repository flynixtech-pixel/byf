"use client";

import { Receipt } from "lucide-react";
import { POS_ITEMS, POS_TABS } from "./data";
import { SectionHeading } from "./ui";

export function WalkInPOSSection() {
  const subtotal = POS_ITEMS.reduce((sum, item) => sum + item.qty * item.price, 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  return (
    <section id="pos" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
      <SectionHeading
        eyebrow="Resolve before build"
        title="Walk-In POS Screen"
        subtitle="A spec preview for the venue-side point of sale that handles walk-ins, bookings, and food counters."
        icon={Receipt}
      />
      <div className="grid gap-4 lg:grid-cols-[0.75fr_1.15fr_0.9fr]">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Mode</p>
          <div className="mt-4 flex flex-col gap-2">
            {POS_TABS.map((tab) => (
              <div
                key={tab.id}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                <span className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4 text-brand-500" /> {tab.label}
                </span>
                <span className="text-xs text-slate-400">Live</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Current ticket</p>
          <div className="mt-4 divide-y divide-slate-100">
            {POS_ITEMS.map((item) => (
              <div key={item.name} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    Qty {item.qty} · ₹{item.price} each
                  </p>
                </div>
                <p className="font-bold text-slate-900">₹{item.qty * item.price}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-2xl">
          <p className="text-sm font-bold text-white">Checkout summary</p>
          <div className="mt-4 space-y-3 rounded-2xl bg-white/5 p-4 text-sm text-slate-200">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Service tax</span>
              <span>₹{tax}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-bold text-white">
              <span>Total</span>
              <span>₹{total}</span>
            </div>
          </div>
          <button className="mt-4 w-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-4 py-3 text-sm font-semibold text-white">
            Take Payment
          </button>
          <p className="mt-3 text-xs text-slate-400">
            QR, cash, UPI, and split settlement fit the same cashier flow.
          </p>
        </div>
      </div>
    </section>
  );
}
