"use client";

import { useMemo, useState } from "react";
import { Check, ChevronUp, PartyPopper, RotateCcw, Search, X } from "lucide-react";
import { EVENT_CATEGORIES, EventCategory } from "./EventCategoryFilter";

export interface AdditionalEventCategory {
  id: string;
  label: string;
  emoji: string;
}

export const EXTRA_EVENT_CATEGORIES: AdditionalEventCategory[] = [
  { id: "marathon", label: "Marathons & Fitness", emoji: "🏃" },
  { id: "comedy", label: "Standup Comedy", emoji: "🎙️" },
  { id: "workshop", label: "Workshops & Learning", emoji: "🎨" },
  { id: "concert", label: "Live Music & Concerts", emoji: "🎸" },
  { id: "corporate", label: "Corporate Offsites", emoji: "🏢" },
  { id: "festival", label: "Cultural Festivals", emoji: "🎪" },
  { id: "food-wine", label: "Food & Wine Tastings", emoji: "🍷" },
  { id: "gaming-esports", label: "Gaming & Esports", emoji: "🎮" },
];

interface AllEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedId?: string;
  onSelectCategory: (categoryId: string) => void;
}

export function AllEventsModal({
  isOpen,
  onClose,
  selectedId,
  onSelectCategory,
}: AllEventsModalProps) {
  const [search, setSearch] = useState("");

  const filteredMain = useMemo(() => {
    if (!search.trim()) return EVENT_CATEGORIES;
    const q = search.toLowerCase();
    return EVENT_CATEGORIES.filter((c) => c.label.toLowerCase().includes(q));
  }, [search]);

  const filteredExtra = useMemo(() => {
    if (!search.trim()) return EXTRA_EVENT_CATEGORIES;
    const q = search.toLowerCase();
    return EXTRA_EVENT_CATEGORIES.filter((c) => c.label.toLowerCase().includes(q));
  }, [search]);

  if (!isOpen) return null;

  function handleSelect(id: string) {
    onSelectCategory(id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-xl max-h-[90vh] flex flex-col rounded-t-[2.5rem] sm:rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900">Event Categories</h3>
              {selectedId && selectedId !== "all" && (
                <button
                  type="button"
                  onClick={() => handleSelect("all")}
                  className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10.5px] font-bold text-rose-600 hover:bg-rose-200 transition cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" /> Reset Filter
                </button>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Explore parties, workshops, sports, and live shows</p>
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
              placeholder="Search event categories..."
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

          {/* Main Categories Section */}
          {filteredMain.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">Featured Categories</h4>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1 text-[11px] font-extrabold text-rose-500 hover:underline cursor-pointer"
                >
                  View less <ChevronUp className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {filteredMain.map((cat) => {
                  const isSelected = selectedId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelect(cat.id)}
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
                      <span className="text-2xl sm:text-3xl leading-none mb-1.5">{cat.iconFallback}</span>
                      <span
                        className={`text-[11px] font-extrabold tracking-tight truncate w-full ${
                          isSelected ? "text-slate-900 font-black" : "text-slate-800"
                        }`}
                      >
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* More Event Types Section */}
          {filteredExtra.length > 0 && (
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 mb-3">All Event Types</h4>

              <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-3">
                {filteredExtra.map((cat) => {
                  const isSelected = selectedId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelect(cat.id)}
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
                      <span className="text-2xl leading-none mb-1">{cat.emoji}</span>
                      <span
                        className={`text-[10px] sm:text-[11px] font-bold tracking-tight line-clamp-2 leading-tight w-full ${
                          isSelected ? "text-slate-900 font-black" : "text-slate-700"
                        }`}
                      >
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
