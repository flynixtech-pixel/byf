"use client";

import { Sparkles } from "lucide-react";
import { WHY_BYV } from "./data";
import { SectionHeading } from "./ui";

export function WhyBookYourVibe() {
  return (
    <section id="why-book-your-vibe" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Built for the players"
        title="Why Choose Us 💯"
        subtitle="The ultimate ecosystem for how you play, eat, and vibe."
      />
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WHY_BYV.map((f) => (
          <div
            key={f.id}
            className="group flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 transition-colors duration-300 group-hover:bg-brand-500 group-hover:text-white">
              <f.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-[14px] font-display italic font-bold text-slate-900 drop-shadow-sm leading-tight">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 line-clamp-3">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
