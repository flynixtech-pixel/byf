"use client";

import { useState } from "react";
import { useBackDismiss } from "@/lib/useBackDismiss";
import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Check,
  Circle,
  CheckCircle2,
  Clock,
  Cloud,
  Globe,
  LayoutGrid,
  Lock,
  Moon,
  RefreshCw,
  SlidersHorizontal,
  Sun,
  Sunrise,
  Sunset,
  Trophy,
  User,
  Users,
  X,
} from "lucide-react";

/* ─── Filter model ──────────────────────────────────────────────── */

export type StatusFilter = "All" | "Available" | "Confirmed" | "Pending" | "Blocked";
export type TimeOfDayFilter = "All Day" | "Morning" | "Afternoon" | "Evening" | "Night";
export type SourceFilter = "All" | "Online" | "Walk-in";
export type QuickFilter = "Next Booking" | "Empty Slots" | "Today" | "Tomorrow" | "Weekend";

export interface SlotFilters {
  status: StatusFilter;
  timeOfDay: TimeOfDayFilter;
  source: SourceFilter;
  sport: string;
  quick: QuickFilter | null;
}

export const DEFAULT_FILTERS: SlotFilters = {
  status: "All",
  timeOfDay: "All Day",
  source: "All",
  sport: "All",
  quick: null,
};

function getSportEmoji(sport: string) {
  const l = (sport || "").toLowerCase();
  if (l.includes("cricket")) return "🏏";
  if (l.includes("foot") || l.includes("socc")) return "⚽";
  if (l.includes("badm")) return "🏸";
  if (l.includes("tenn") || l.includes("padel") || l.includes("squash")) return "🎾";
  if (l.includes("basket")) return "🏀";
  if (l.includes("volley")) return "🏐";
  if (l.includes("table") || l.includes("tt")) return "🏓";
  if (l.includes("snooker") || l.includes("pool")) return "🎱";
  if (l.includes("golf")) return "⛳";
  return "🏆";
}

/** Hour ranges backing each Time of Day option, as [startHour, endHour) on a 24h clock. */
export const TIME_OF_DAY_RANGES: Record<Exclude<TimeOfDayFilter, "All Day">, [number, number]> = {
  Morning: [6, 12],
  Afternoon: [12, 18],
  Evening: [18, 23],
  Night: [23, 6], // wraps midnight
};

/** True when `hour` (0-23) falls inside the selected Time of Day window. */
export function hourMatchesTimeOfDay(hour: number, tod: TimeOfDayFilter): boolean {
  if (tod === "All Day") return true;
  const [from, to] = TIME_OF_DAY_RANGES[tod];
  return from <= to ? hour >= from && hour < to : hour >= from || hour < to;
}

/** Count of sections actively narrowing the list — drives the badge on the trigger button. */
export function activeFilterCount(f: SlotFilters): number {
  let n = 0;
  if (f.status !== "All") n++;
  if (f.timeOfDay !== "All Day") n++;
  if (f.source !== "All") n++;
  if (f.sport && f.sport !== "All") n++;
  if (f.quick) n++;
  return n;
}

/** Short label for the trigger button, e.g. "All Slots" / "Morning". */
export function filterSummary(f: SlotFilters): string {
  if (f.sport && f.sport !== "All") return `${f.sport} Slots`;
  if (f.timeOfDay !== "All Day") return `${f.timeOfDay} Slots`;
  if (f.status !== "All") return `${f.status}`;
  return "All Slots";
}

/* ─── Option config ─────────────────────────────────────────────── */

const STATUS_OPTS: { value: StatusFilter; label: string; icon: typeof Circle; tint: string }[] = [
  { value: "All", label: "All", icon: LayoutGrid, tint: "text-emerald-700" },
  { value: "Available", label: "Available", icon: Circle, tint: "text-emerald-600" },
  { value: "Confirmed", label: "Confirmed", icon: CheckCircle2, tint: "text-emerald-600" },
  { value: "Pending", label: "Pending", icon: Clock, tint: "text-amber-500" },
  { value: "Blocked", label: "Blocked", icon: Lock, tint: "text-rose-500" },
];

const TOD_OPTS: { value: TimeOfDayFilter; label: string; hint?: string; icon: typeof Sun }[] = [
  { value: "All Day", label: "All Day", icon: CalendarDays },
  { value: "Morning", label: "Morning", hint: "6 AM – 12 PM", icon: Sunrise },
  { value: "Afternoon", label: "Afternoon", hint: "12 PM – 6 PM", icon: Sun },
  { value: "Evening", label: "Evening", hint: "6 PM – 11 PM", icon: Sunset },
  { value: "Night", label: "Night", hint: "11 PM – 6 AM", icon: Moon },
];

const SOURCE_OPTS: { value: SourceFilter; label: string; icon: typeof Users }[] = [
  { value: "All", label: "All", icon: Users },
  { value: "Online", label: "Online", icon: Globe },
  { value: "Walk-in", label: "Walk-in", icon: User },
];

const QUICK_OPTS: { value: QuickFilter; label: string; hint: string; icon: typeof Clock }[] = [
  { value: "Next Booking", label: "Next Booking", hint: "Upcoming slot", icon: Clock },
  { value: "Empty Slots", label: "Empty Slots", hint: "No bookings", icon: Cloud },
  { value: "Today", label: "Today", hint: "All bookings today", icon: CalendarDays },
  { value: "Tomorrow", label: "Tomorrow", hint: "Next day bookings", icon: CalendarCheck },
  { value: "Weekend", label: "Weekend", hint: "Sat & Sun", icon: CalendarRange },
];

/* ─── Pieces ────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-black text-slate-900">{children}</h3>;
}

/** A selectable tile with a check badge in the corner when active. */
function Tile({
  active,
  onClick,
  icon: Icon,
  label,
  hint,
  tint,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Circle;
  label: string;
  hint?: string;
  tint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 transition active:scale-[0.97] cursor-pointer ${
        active ? "border-emerald-500 bg-emerald-50/60" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {active && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
      <Icon size={20} className={tint ?? "text-slate-600"} />
      <span className="text-[11px] font-bold leading-tight text-slate-800">{label}</span>
      {hint && <span className="text-[9px] font-semibold text-slate-400">{hint}</span>}
    </button>
  );
}

/* ─── Sheet ─────────────────────────────────────────────────────── */

export function SlotFilterSheet({
  initial,
  sports = [],
  onApply,
  onClose,
}: {
  initial: SlotFilters;
  sports?: string[];
  onApply: (f: SlotFilters) => void;
  onClose: () => void;
}) {
  // Edited locally so "Apply Filters" is what commits — Reset/Clear All only touch the draft.
  const [draft, setDraft] = useState<SlotFilters>(initial);

  // Intercept browser back button to close sheet instead of popping page history
  useBackDismiss(true, onClose);

  const availableSports = ["All", ...(sports.length > 0 ? sports : ["Cricket", "Football", "Badminton", "Basketball"])];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:mb-6 animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal size={20} className="text-slate-700" />
            <h2 className="text-lg font-black text-slate-900">Filter Slots</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDraft(DEFAULT_FILTERS)}
              className="text-xs font-bold text-emerald-600 transition hover:text-emerald-700 cursor-pointer"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sheet"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Sport Filter Pills */}
        <SectionLabel>Sport</SectionLabel>
        <div className="mb-5 mt-3 flex flex-wrap gap-2">
          {availableSports.map((sp) => {
            const isSelected = (draft.sport || "All") === sp;
            const emoji = getSportEmoji(sp);

            return (
              <button
                key={sp}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, sport: sp }))}
                className={`relative flex items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 text-xs font-extrabold transition cursor-pointer active:scale-95 ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20"
                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:bg-slate-50"
                }`}
              >
                {sp !== "All" && <span className="text-sm">{emoji}</span>}
                <span className="capitalize">{sp === "All" ? "All Sports" : sp}</span>
                {isSelected && (
                  <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="border-t border-slate-100" />

        {/* Status */}
        <div className="mt-5">
          <SectionLabel>Status</SectionLabel>
        </div>
        <div className="mb-5 mt-3 grid grid-cols-5 gap-2">
          {STATUS_OPTS.map((o) => (
            <Tile
              key={o.value}
              active={draft.status === o.value}
              onClick={() => setDraft((d) => ({ ...d, status: o.value }))}
              icon={o.icon}
              label={o.label}
              tint={o.tint}
            />
          ))}
        </div>

        <div className="border-t border-slate-100" />

        {/* Time of Day */}
        <div className="mt-5">
          <SectionLabel>Time of Day</SectionLabel>
        </div>
        <div className="mb-5 mt-3 grid grid-cols-5 gap-2">
          {TOD_OPTS.map((o) => (
            <Tile
              key={o.value}
              active={draft.timeOfDay === o.value}
              onClick={() => setDraft((d) => ({ ...d, timeOfDay: o.value }))}
              icon={o.icon}
              label={o.label}
              hint={o.hint}
              tint="text-slate-700"
            />
          ))}
        </div>

        <div className="border-t border-slate-100" />

        {/* Booking Source */}
        <div className="mt-5">
          <SectionLabel>Booking Source</SectionLabel>
        </div>
        <div className="mb-5 mt-3 grid grid-cols-3 gap-2">
          {SOURCE_OPTS.map((o) => (
            <Tile
              key={o.value}
              active={draft.source === o.value}
              onClick={() => setDraft((d) => ({ ...d, source: o.value }))}
              icon={o.icon}
              label={o.label}
              tint="text-slate-700"
            />
          ))}
        </div>

        <div className="border-t border-slate-100" />

        {/* Quick Filters */}
        <div className="mt-5">
          <SectionLabel>Quick Filters</SectionLabel>
        </div>
        <div className="mb-6 mt-3 grid grid-cols-3 gap-2.5">
          {QUICK_OPTS.map((o) => {
            const active = draft.quick === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, quick: active ? null : o.value }))}
                className={`flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition active:scale-[0.97] cursor-pointer ${
                  active ? "border-emerald-500 bg-emerald-50/60" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <o.icon size={18} className="text-emerald-600" />
                <span className="text-[11px] font-bold leading-tight text-slate-800">{o.label}</span>
                <span className="text-[9px] font-semibold leading-tight text-slate-400">{o.hint}</span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_FILTERS)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-emerald-600 bg-white py-3.5 text-sm font-black text-emerald-700 transition hover:bg-emerald-50 active:scale-[0.98] cursor-pointer"
          >
            <RefreshCw size={15} /> Reset
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="flex-[1.6] rounded-2xl bg-[#116b3f] py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-[#0d5732] active:scale-[0.98] cursor-pointer"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
