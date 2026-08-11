"use client";

import { MessageCircle } from "lucide-react";
import { TESTIMONIALS } from "./data";
import { SectionHeading } from "./ui";

export function Testimonials() {
  return (
    <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="From the community" title="Players & Owners Love It" icon={MessageCircle} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.id}
            className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <span className="text-brand-500" aria-hidden>
              <t.icon className="h-7 w-7" />
            </span>
            <p className="text-sm leading-relaxed text-slate-600">&ldquo;{t.quote}&rdquo;</p>
            <div>
              <p className="text-sm font-bold text-slate-900">{t.name}</p>
              <p className="text-xs text-slate-400">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
