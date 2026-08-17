"use client";

import { MessageCircle } from "lucide-react";
import { TESTIMONIALS } from "./data";
import { SectionHeading } from "./ui";

export function Testimonials() {
  return (
    <section className="mx-auto mt-12 mb-0 pb-4 sm:pb-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="From the community" title="Players & Owners Love It 💬" />
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.id}
            className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <div>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-500 mb-2 transition-colors duration-300 group-hover:bg-brand-500 group-hover:text-white" aria-hidden>
                <t.icon className="h-4 w-4" />
              </span>
              <p className="text-xs leading-relaxed text-slate-600 italic line-clamp-4">&ldquo;{t.quote}&rdquo;</p>
            </div>
            <div className="mt-3 border-t border-slate-50 pt-3 flex flex-col">
              <p className="text-[14px] font-display italic font-bold text-slate-900 drop-shadow-sm">{t.name}</p>
              <p className="text-[10px] font-medium text-slate-400 truncate">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
