"use client";

import { NotepadText } from "lucide-react";
import { BUILD_COST_NOTES, EXTENSION_CARDS } from "./data";
import { SectionHeading } from "./ui";

export function BuildCostAndExtensionsSection() {
  return (
    <section id="extensions" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
      <SectionHeading
        eyebrow="Read before quoting"
        title="Build-Cost Note & Extensions"
        subtitle="The spec calls for a clear separation between what is already represented in the frontend and what should be delivered in later phases."
        icon={NotepadText}
      />
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Build-cost note</p>
          <div className="mt-4 space-y-3">
            {BUILD_COST_NOTES.map((note) => (
              <div key={note} className="flex items-start gap-3 text-sm text-slate-600">
                <span className="mt-1 h-2 w-2 rounded-full bg-brand-500" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Extensions</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {EXTENSION_CARDS.map((ext) => (
              <div key={ext.title} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">{ext.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{ext.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
