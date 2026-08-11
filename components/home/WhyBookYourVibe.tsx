"use client";

import { Sparkles } from "lucide-react";
import { WHY_BYV } from "./data";
import { SectionHeading } from "./ui";

export function WhyBookYourVibe() {
  return (
    <section id="why-book-your-vibe" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Built for how you actually play"
        title="Why Book Your Vibe"
        subtitle="Not just another booking form — a full layer around how you play, eat and pay."
        icon={Sparkles}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WHY_BYV.map((f) => (
          <div
            key={f.id}
            className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <f.icon className="h-5 w-5" />
            </span>
            <p className="text-base font-bold text-slate-900">{f.title}</p>
            <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
