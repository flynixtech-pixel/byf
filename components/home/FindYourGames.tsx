"use client";

import Image from "next/image";
import { SPORTS_CATALOG } from "./data";
import type { Sport } from "./types";

export function FindYourGames({
  onSelectSport,
}: {
  onSelectSport: (sport: Sport) => void;
}) {
  return (
    <section id="games" className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[1.5rem] bg-[#eaf2ff] px-3.5 py-3.5 shadow-[0_18px_60px_rgba(148,163,184,0.18)] sm:rounded-[2rem] sm:px-6 sm:py-5">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <p className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Find A Venue
          </p>
          <button
            type="button"
            onClick={() => {
              const firstSport = SPORTS_CATALOG[0];
              if (firstSport) onSelectSport(firstSport);
            }}
            className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-sky-500 transition hover:text-sky-600 sm:text-[11px]"
          >
            Explore Sports Venue
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 sm:gap-4 lg:grid-cols-4 xl:grid-cols-7">
          {SPORTS_CATALOG.map((s, index) => (
            <button
              key={s.id}
              onClick={() => onSelectSport(s)}
              className="group flex flex-col items-center justify-start text-center"
            >
              <div className="relative flex h-13 w-13 items-center justify-center sm:h-20 sm:w-20">
                <span
                  className={`absolute inset-1 rounded-full bg-gradient-to-b ${s.bubble} shadow-[0_10px_25px_rgba(148,163,184,0.16)] transition duration-300 group-hover:scale-105 sm:inset-2`}
                />
                <Image
                  src={s.image}
                  alt={s.alt}
                  width={64}
                  height={64}
                  unoptimized
                  priority={index === 0}
                  className="relative z-10 h-8 w-8 object-contain transition duration-300 group-hover:scale-105 sm:h-14 sm:w-14"
                />
                {s.isNew && (
                  <span className="absolute -bottom-1 z-20 rounded-full bg-gradient-to-r from-sky-500 to-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md shadow-sky-500/20">
                    NEW
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] font-bold leading-tight text-slate-900 sm:mt-1.5 sm:text-xs sm:font-extrabold">
                {s.label}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
