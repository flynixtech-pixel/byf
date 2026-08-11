"use client";

import { useState } from "react";
import { X, Sparkles, Ban, Check } from "lucide-react";

export interface CourtItem {
  id: string;
  name: string;
  sports: string[];
  active: boolean;
}

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

function matchSport(courtSports: string[] | undefined, targetSport: string): boolean {
  if (!courtSports || courtSports.length === 0) return true;
  const targetLower = targetSport.trim().toLowerCase();
  return courtSports.some((s) => s.trim().toLowerCase() === targetLower);
}

export function SportCourtSelectionModal({
  isOpen,
  sports,
  courts,
  bookedCourtIds,
  slotTime,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  sports: string[];
  courts: CourtItem[];
  bookedCourtIds: string[];
  slotTime: string;
  onClose: () => void;
  onConfirm: (selectedSport: string, selectedCourtId: string) => void;
}) {
  const [selectedSport, setSelectedSport] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeCourts = courts.filter((c) => c.active !== false);

  const confirmSport = (sport: string) => {
    let targetCourts = activeCourts.filter((c) => matchSport(c.sports, sport));
    if (targetCourts.length === 0) targetCourts = activeCourts;

    const firstAvailable = targetCourts.find((c) => !bookedCourtIds.includes(c.id)) || targetCourts[0];
    onConfirm(sport, firstAvailable?.id || "");
  };

  const handleSportClick = (sport: string, isFullyBooked: boolean) => {
    if (isFullyBooked) return;
    setSelectedSport(sport);
    confirmSport(sport);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:items-center sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl border border-slate-100">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
              <Sparkles size={14} />
              <span>Select Venue Booking Details</span>
            </div>
            <h2 className="text-base font-black text-slate-900 mt-0.5">Select Sport</h2>
            <p className="text-[11px] font-medium text-slate-500">
              Slot Time: <span className="font-bold text-slate-800">{slotTime}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sport Selection Grid */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-600 mb-2">Which sport is being booked?</p>
          <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {sports.map((sport) => {
              let sportCourts = activeCourts.filter((c) => matchSport(c.sports, sport));
              if (activeCourts.length > 0 && sportCourts.length === 0) {
                sportCourts = activeCourts;
              }

              let isFullyBooked = false;
              let freeCount = 0;

              if (activeCourts.length === 0) {
                isFullyBooked = bookedCourtIds.length > 0;
                freeCount = isFullyBooked ? 0 : 1;
              } else {
                const freeCourts = sportCourts.filter((c) => !bookedCourtIds.includes(c.id));
                freeCount = freeCourts.length;
                isFullyBooked = freeCount === 0;
              }

              const isSelected = selectedSport === sport;

              return (
                <button
                  key={sport}
                  type="button"
                  disabled={isFullyBooked}
                  onClick={() => handleSportClick(sport, isFullyBooked)}
                  className={`relative flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all ${
                    isFullyBooked
                      ? "border-slate-200 bg-slate-50/70 opacity-60 cursor-not-allowed"
                      : isSelected
                      ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-sm cursor-pointer"
                      : "border-slate-200 bg-white text-slate-900 hover:border-emerald-400 hover:bg-slate-50 cursor-pointer active:scale-95 shadow-2xs"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-2xl">{getSportEmoji(sport)}</span>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-extrabold text-slate-900 mt-1 capitalize">{sport}</span>
                  <span
                    className={`text-[10px] font-semibold ${
                      isFullyBooked
                        ? "text-rose-600 flex items-center gap-1"
                        : isSelected
                        ? "text-emerald-700 font-bold"
                        : "text-slate-500"
                    }`}
                  >
                    {isFullyBooked ? (
                      <>
                        <Ban size={10} /> Fully Booked
                      </>
                    ) : (
                      `${freeCount} Court${freeCount > 1 ? "s" : ""} Available`
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
