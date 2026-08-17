"use client";

import { Layers, Flame, Coffee, Briefcase, Activity, Mic } from "lucide-react";

export interface EventCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  iconFallback?: string;
}

export const EVENT_CATEGORIES: EventCategory[] = [
  {
    id: "all",
    label: "All Events",
    icon: <Layers className="h-3.5 w-3.5" />,
    iconFallback: "🎟️",
  },
  {
    id: "alcoholic-party",
    label: "Nightlife & Mixers",
    icon: <Flame className="h-3.5 w-3.5" />,
    iconFallback: "🥂",
  },
  {
    id: "non-alcoholic-party",
    label: "Sober & Chill",
    icon: <Coffee className="h-3.5 w-3.5" />,
    iconFallback: "☕",
  },
  {
    id: "business",
    label: "Business & Tech",
    icon: <Briefcase className="h-3.5 w-3.5" />,
    iconFallback: "💼",
  },
  {
    id: "sports",
    label: "Sports & Fitness",
    icon: <Activity className="h-3.5 w-3.5" />,
    iconFallback: "🏆",
  },
  {
    id: "performance",
    label: "Live Shows",
    icon: <Mic className="h-3.5 w-3.5" />,
    iconFallback: "🎤",
  },
];

interface Props {
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  className?: string;
}

export function EventCategoryFilter({ selectedCategoryId, onSelectCategory, className = "" }: Props) {
  return (
    <div className={`w-full ${className}`}>
      {/* Scrollable Container on Mobile, Flex Row on Desktop */}
      <div className="-mx-4 flex items-center gap-2.5 overflow-x-auto px-4 pb-2 scroll-smooth scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-start">
        {EVENT_CATEGORIES.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                isSelected
                  ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-500/25 border border-brand-500 scale-105"
                  : "bg-white text-slate-500 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <span className={isSelected ? "text-white opacity-90" : "text-brand-500 opacity-80"}>
                {cat.icon}
              </span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
