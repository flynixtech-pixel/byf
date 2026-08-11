"use client";

import { useRef } from "react";
import { CalendarPlus, ChevronDown, ChevronLeft, ChevronRight, Clock, MapPin, QrCode } from "lucide-react";

/* ─── Slots-booked ring ─────────────────────────────────────────── */

function SlotsRing({ booked, total }: { booked: number; total: number }) {
  const pct = total > 0 ? booked / total : 0;
  const r = 26;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative flex h-[68px] w-[68px] shrink-0 items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#059669"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="text-center leading-none">
        <p className="text-[13px] font-black text-slate-900">
          {booked}<span className="text-slate-400">/{total}</span>
        </p>
      </div>
    </div>
  );
}

/* ─── Header ────────────────────────────────────────────────────── */

export function BookingsHeader({
  turfs,
  selectedTurfId,
  onSelectTurf,
  city,
  dateLabel,
  isOpenNow,
  bookedSlots,
  totalSlots,
  nextBookingTime,
  nextBookingIn,
  nextBookingName,
  onOpenQrScanner,
  onAddBooking,
  dates,
  selectedDate,
  todayIso,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
}: {
  turfs: { id: string; title: string }[];
  selectedTurfId: string;
  onSelectTurf: (id: string) => void;
  city?: string;
  dateLabel: string;
  isOpenNow: boolean;
  bookedSlots: number;
  totalSlots: number;
  nextBookingTime?: string;
  /** Relative countdown from now, e.g. "in 15 min". */
  nextBookingIn?: string;
  nextBookingName?: string;
  onOpenQrScanner: () => void;
  onAddBooking: () => void;
  dates: Date[];
  selectedDate: string;
  todayIso: string;
  onSelectDate: (iso: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}) {
  const dateStripRef = useRef<HTMLDivElement>(null);

  const scrollStrip = (offset: number) => {
    if (dateStripRef.current) {
      dateStripRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const handleVendorDateScroll = () => {
    if (!dateStripRef.current || dates.length === 0) return;
    const container = dateStripRef.current;
    const children = Array.from(container.children) as HTMLElement[];
    const containerLeft = container.getBoundingClientRect().left;

    for (const child of children) {
      const rect = child.getBoundingClientRect();
      if (rect.left >= containerLeft - 10 && rect.left <= containerLeft + 60) {
        const iso = child.getAttribute("data-iso");
        if (iso) {
          onSelectDate(iso);
        }
        break;
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Venue + location */}
      <div className="flex items-center gap-2 px-1">
        <div className="min-w-0 flex-1">
          <div className="relative inline-flex items-center">
            <select
              value={selectedTurfId}
              onChange={(e) => onSelectTurf(e.target.value)}
              className="max-w-[220px] cursor-pointer appearance-none truncate bg-transparent pr-5 text-[17px] font-black leading-tight text-slate-900 outline-none"
            >
              {turfs.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-0 text-slate-500" />
          </div>
          {city && (
            <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-slate-400">
              <MapPin size={10} /> {city}
            </p>
          )}
        </div>
      </div>

      {/* Today card — ring, quick actions, next booking */}
      <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            Selected <span className="text-slate-300">•</span> <span className="text-slate-700">{dateLabel}</span>
          </p>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${
              isOpenNow ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isOpenNow ? "bg-emerald-500" : "bg-slate-400"}`} />
            {isOpenNow ? "Open Now" : "Closed"}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-center gap-1">
            <SlotsRing booked={bookedSlots} total={totalSlots} />
            <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Slots Booked</p>
          </div>

          <button
            type="button"
            onClick={onOpenQrScanner}
            className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl bg-emerald-50/70 py-3 transition active:scale-95"
          >
            <QrCode size={19} className="text-emerald-600" />
            <span className="text-[9px] font-bold text-slate-700">QR Scanner</span>
          </button>

          <button
            type="button"
            onClick={onAddBooking}
            className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl bg-emerald-50/70 py-3 transition active:scale-95"
          >
            <CalendarPlus size={19} className="text-emerald-600" />
            <span className="text-[9px] font-bold text-slate-700">Add Booking</span>
          </button>

          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1">
            <Clock size={17} className="text-amber-500" />
            <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Next Booking</p>
            <p className="text-[11px] font-black leading-none text-slate-900">{nextBookingTime ?? "—"}</p>
            {nextBookingIn && (
              <p className="text-[8px] font-black leading-none text-amber-600">{nextBookingIn}</p>
            )}
            {nextBookingName && (
              <p className="max-w-full truncate text-[8px] font-medium text-slate-400">{nextBookingName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Date strip */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous days"
          onClick={() => scrollStrip(-240)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
        >
          <ChevronLeft size={15} />
        </button>

        <div
          ref={dateStripRef}
          className="flex flex-1 gap-1.5 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden items-end"
        >
          {dates.map((d, i) => {
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const isSel = iso === selectedDate;
            const isToday = iso === todayIso;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const isFirst = d.getDate() === 1 || i === 0;
            const monthShort = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();

            return (
              <button
                key={iso}
                data-iso={iso}
                onClick={() => onSelectDate(iso)}
                className={`relative flex h-[54px] w-12 shrink-0 flex-col items-center justify-center rounded-xl border transition ${
                  isSel
                    ? "border-vibe-navy bg-vibe-navy text-white shadow-md"
                    : isWeekend
                    ? "border-rose-100 bg-white text-rose-500 hover:bg-rose-50"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {isFirst && (
                  <span className="absolute -top-2.5 rounded bg-slate-800 px-1 py-0.2 text-[7.5px] font-black text-white uppercase tracking-widest z-10">
                    {monthShort}
                  </span>
                )}
                <span className="text-[8px] font-bold uppercase leading-none mt-0.5">
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className={`mt-1 text-[15px] font-black leading-none ${isSel ? "text-white" : ""}`}>
                  {d.getDate()}
                </span>
                {isToday && (
                  <span className={`mt-1 h-1 w-1 rounded-full ${isSel ? "bg-white" : "bg-emerald-500"}`} />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Next days"
          onClick={() => scrollStrip(240)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
