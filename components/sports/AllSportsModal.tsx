"use client";

import { useMemo, useState } from "react";
import { Check, ChevronUp, Heart, RotateCcw, Search, X } from "lucide-react";

export interface SportItem {
  id: string;
  label: string;
  emoji: string;
  popular?: boolean;
}

export const POPULAR_SPORTS: SportItem[] = [
  { id: "pickleball", label: "Pickleball", emoji: "🏓", popular: true },
  { id: "tennis", label: "Tennis", emoji: "🎾", popular: true },
  { id: "table-tennis", label: "Table Tennis", emoji: "🏓", popular: true },
  { id: "cricket", label: "Cricket", emoji: "🏏", popular: true },
  { id: "basketball", label: "Basketball", emoji: "🏀", popular: true },
  { id: "football", label: "Football", emoji: "⚽", popular: true },
];

export const ALL_SPORTS: SportItem[] = [
  { id: "badminton", label: "Badminton", emoji: "🏸" },
  { id: "volleyball", label: "Volleyball", emoji: "🏐" },
  { id: "swimming", label: "Swimming", emoji: "🏊" },
  { id: "boxing", label: "Boxing", emoji: "🥊" },
  { id: "athletics", label: "Athletics", emoji: "👟" },
  { id: "yoga", label: "Yoga", emoji: "🧘" },
  { id: "gym-fitness", label: "Gym / Fitness", emoji: "🏋️" },
  { id: "skating", label: "Skating", emoji: "🛼" },
  { id: "football-turf", label: "Football Turf", emoji: "⚽" },
  { id: "basketball-court", label: "Basketball Court", emoji: "🏀" },
  { id: "indoor-sports", label: "Indoor Sports", emoji: "🏟️" },
  { id: "golf", label: "Golf", emoji: "⛳" },
  { id: "squash", label: "Squash", emoji: "🎾" },
  { id: "table-soccer", label: "Table Soccer", emoji: "⚽" },
  { id: "archery", label: "Archery", emoji: "🎯" },
  { id: "mma", label: "MMA", emoji: "🥊" },
  { id: "snooker-pool", label: "Snooker & Pool", emoji: "🎱" },
  { id: "indoor-games", label: "Indoor Games", emoji: "🎲" },
];

interface AllSportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedId?: string;
  onSelectSport: (sportId: string) => void;
}

export function AllSportsModal({
  isOpen,
  onClose,
  selectedId,
  onSelectSport,
}: AllSportsModalProps) {
  const [search, setSearch] = useState("");
  const [suggested, setSuggested] = useState(false);
  const [suggestText, setSuggestText] = useState("");

  const filteredPopular = useMemo(() => {
    if (!search.trim()) return POPULAR_SPORTS;
    const q = search.toLowerCase();
    return POPULAR_SPORTS.filter((s) => s.label.toLowerCase().includes(q));
  }, [search]);

  const filteredAll = useMemo(() => {
    if (!search.trim()) return ALL_SPORTS;
    const q = search.toLowerCase();
    return ALL_SPORTS.filter((s) => s.label.toLowerCase().includes(q));
  }, [search]);

  if (!isOpen) return null;

  function handleSelect(id: string) {
    onSelectSport(id);
    onClose();
  }

  function handleSuggestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!suggestText.trim()) return;
    setSuggested(true);
    setTimeout(() => {
      setSuggested(false);
      setSuggestText("");
    }, 2500);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-xl max-h-[90vh] flex flex-col rounded-t-[2.5rem] sm:rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900">Sports Selection</h3>
              {selectedId && (
                <button
                  type="button"
                  onClick={() => handleSelect("")}
                  className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10.5px] font-bold text-rose-600 hover:bg-rose-200 transition cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" /> Reset Filter
                </button>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Choose a sport you want to play</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sports..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none transition shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Popular Section */}
          {filteredPopular.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">Popular</h4>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1 text-[11px] font-extrabold text-rose-500 hover:underline cursor-pointer"
                >
                  View less <ChevronUp className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {filteredPopular.map((sport) => {
                  const isSelected = selectedId === sport.id;
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => handleSelect(sport.id)}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border py-3 px-2 text-center transition-all duration-200 active:scale-95 cursor-pointer min-h-[82px] ${
                        isSelected
                          ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/30 shadow-sm"
                          : "border-slate-100 bg-white hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                      )}
                      <span className="text-2xl sm:text-3xl leading-none mb-1.5">{sport.emoji}</span>
                      <span
                        className={`text-[11px] font-extrabold tracking-tight truncate w-full ${
                          isSelected ? "text-slate-900 font-black" : "text-slate-800"
                        }`}
                      >
                        {sport.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Sports Section */}
          {filteredAll.length > 0 && (
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 mb-3">All Sports</h4>

              <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-3">
                {filteredAll.map((sport) => {
                  const isSelected = selectedId === sport.id;
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => handleSelect(sport.id)}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border py-3 px-1.5 text-center transition-all duration-200 active:scale-95 cursor-pointer min-h-[78px] ${
                        isSelected
                          ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/30 shadow-sm"
                          : "border-slate-100 bg-white hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs">
                          <Check className="h-2 w-2" strokeWidth={3} />
                        </span>
                      )}
                      <span className="text-2xl leading-none mb-1">{sport.emoji}</span>
                      <span
                        className={`text-[10px] sm:text-[11px] font-bold tracking-tight line-clamp-2 leading-tight w-full ${
                          isSelected ? "text-slate-900 font-black" : "text-slate-700"
                        }`}
                      >
                        {sport.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Suggest Banner */}
          <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/60 p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                  <Heart className="h-4.5 w-4.5 fill-rose-500 text-rose-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">Can&apos;t find your sport?</p>
                  <p className="text-[10.5px] font-medium text-slate-500 truncate">Let us know and we&apos;ll add it for you.</p>
                </div>
              </div>
              <form onSubmit={handleSuggestSubmit} className="shrink-0">
                {suggested ? (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs">
                    <Check className="h-3 w-3" /> Submitted!
                  </span>
                ) : (
                  <button
                    type="submit"
                    className="rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-500 hover:text-white shadow-2xs cursor-pointer"
                  >
                    Suggest Sport
                  </button>
                )}
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
