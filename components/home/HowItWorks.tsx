"use client";

import { Compass } from "lucide-react";
import { HOW_IT_WORKS } from "./data";
import { SectionHeading } from "./ui";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="From search to scan"
        title="How Book Your Vibe Works"
        subtitle="Four steps, no phone calls."
        icon={Compass}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HOW_IT_WORKS.map((step, i) => (
          <div
            key={step.id}
            className="relative flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <span className="text-xs font-bold text-brand-300">STEP {i + 1}</span>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <step.icon className="h-6 w-6" />
            </span>
            <p className="text-base font-bold text-slate-900">{step.title}</p>
            <p className="text-sm leading-relaxed text-slate-500">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
