"use client";

import { Tag, Zap, GraduationCap, Swords, Trophy, MapPin, Handshake } from "lucide-react";

const QUICK_ACTIONS = [
  {
    id: "coaches",
    label: "Coaches",
    icon: GraduationCap,
    iconBg: "bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600",
    glowColor: "shadow-amber-500/25",
  },
  {
    id: "challenge-a-friend",
    label: "Challenge a Friend",
    icon: Swords,
    iconBg: "bg-gradient-to-br from-rose-500 via-red-500 to-orange-500",
    glowColor: "shadow-rose-500/25",
  },
  {
    id: "tournaments",
    label: "Tournaments",
    icon: Trophy,
    iconBg: "bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500",
    glowColor: "shadow-yellow-500/30",
  },
  {
    id: "near-me",
    label: "Near Me",
    icon: MapPin,
    iconBg: "bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500",
    glowColor: "shadow-emerald-500/25",
  },
  {
    id: "community",
    label: "Community",
    icon: Handshake,
    iconBg: "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600",
    glowColor: "shadow-blue-500/25",
  },
];

export function QuickActionsSection({
  onQuickAction,
  onViewAllQuickActions,
}: {
  onQuickAction: (taskId: string, gameId: string) => void;
  onViewAllQuickActions: () => void;
}) {
  return (
    <section id="quick-actions" className="mx-auto mt-3 max-w-7xl px-4 sm:mt-6 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-3 shadow-sm backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/25 sm:h-11 sm:w-11 sm:rounded-2xl">
            <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-[-0.03em] text-slate-950 sm:text-2xl">Quick Actions</h2>
            <p className="hidden text-xs text-slate-600 sm:block sm:text-sm">Instant shortcuts for coaches, matches, tournaments, and nearby venues.</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-5 gap-1 sm:mt-6 sm:gap-4">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onQuickAction(a.id, "")}
              className="group flex flex-col items-center justify-start text-center cursor-pointer transition-all duration-300 active:scale-95 min-w-0 w-full overflow-hidden"
            >
              <div
                className={`grid h-10 w-10 place-items-center rounded-xl ${a.iconBg} text-white shadow-md ${a.glowColor} transition duration-300 group-hover:scale-105 sm:h-20 sm:w-20 sm:rounded-3xl`}
              >
                <a.icon className="h-4.5 w-4.5 stroke-[2.2] drop-shadow-xs sm:h-9 sm:w-9" />
              </div>
              <span className="mt-1 text-[9.5px] font-bold leading-none text-slate-800 transition duration-200 group-hover:text-rose-600 sm:mt-2.5 sm:text-xs sm:font-semibold text-center whitespace-nowrap truncate max-w-full">
                {a.id === "challenge-a-friend" ? (
                  <>
                    Challenge<span className="hidden sm:inline"> a Friend</span>
                  </>
                ) : (
                  a.label
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-red-500 px-3 py-2 text-white shadow-sm sm:mt-6 sm:rounded-2xl sm:p-4">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-xs sm:h-10 sm:w-10 sm:rounded-xl">
            <Tag className="h-3.5 w-3.5 text-white sm:h-5 sm:w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold sm:text-sm truncate">Flat 20% off your next booking</p>
            <p className="hidden text-[10px] text-white/90 font-medium sm:block sm:text-xs">Use code VIBE20 at checkout</p>
          </div>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black uppercase text-white sm:hidden">
            VIBE20
          </span>
        </div>
      </div>
    </section>
  );
}

