"use client";

import { CreditCard } from "lucide-react";
import { COMMERCE_PLANS } from "./data";
import { SectionHeading } from "./ui";

export function CommerceSection() {
  return (
    <section id="commerce" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
      <SectionHeading
        eyebrow="Payments, pricing & plans"
        title="Commerce"
        subtitle="The spec includes monetization surfaces for players, owners, and the BYV team, so the frontend needs room for all three."
        icon={CreditCard}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {COMMERCE_PLANS.map((plan) => (
          <div
            key={plan.name}
            className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"
          >
            <div className={`bg-gradient-to-r ${plan.accent} p-5 text-white`}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">{plan.note}</p>
              <h3 className="mt-2 text-2xl font-extrabold">{plan.name}</h3>
              <p className="mt-1 text-3xl font-extrabold">{plan.price}</p>
            </div>
            <div className="space-y-3 p-5">
              {plan.bullets.map((bullet) => (
                <div key={bullet} className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="mt-1 h-2 w-2 rounded-full bg-brand-500" />
                  <span>{bullet}</span>
                </div>
              ))}
              <button className="mt-2 w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-600">
                Compare plan
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        {["UPI", "Cards", "Wallet", "Split pay"].map((method) => (
          <div key={method} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            {method}
          </div>
        ))}
      </div>
    </section>
  );
}
