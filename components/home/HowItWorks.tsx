"use client";

import { Compass } from "lucide-react";
import { HOW_IT_WORKS } from "./data";
import { SectionHeading } from "./ui";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Zero hassle"
        title="How It Works ⚡"
        subtitle="Four simple steps. No phone calls, no cap."
      />
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HOW_IT_WORKS.map((step, i) => (
          <div
            key={step.id}
            className="group relative flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 transition-colors duration-300 group-hover:bg-brand-500 group-hover:text-white">
              <step.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <span className="mb-1 block text-[9px] font-black uppercase tracking-widest text-brand-400">Step {i + 1}</span>
              <h3 className="text-sm font-bold text-slate-900 drop-shadow-sm">{step.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 line-clamp-3">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
