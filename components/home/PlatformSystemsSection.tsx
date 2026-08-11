"use client";

import { BrickWall } from "lucide-react";
import { PLATFORM_SYSTEMS } from "./data";
import { SectionHeading } from "./ui";

export function PlatformSystemsSection() {
  return (
    <section id="systems" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
      <SectionHeading
        eyebrow="Spec coverage"
        title="The 8 Systems in Detail"
        subtitle="Every major client system has a visible frontend surface here, even when the backend is still stubbed."
        icon={BrickWall}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLATFORM_SYSTEMS.map((system) => (
          <div
            key={system.id}
            className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-brand-500">
                <system.icon className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                In UI
              </span>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-900">{system.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{system.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
        Cross-cutting idea: one source of truth for venue data, role-aware controls, and shared
        UI primitives.
      </div>
    </section>
  );
}
