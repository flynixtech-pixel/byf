"use client";

import Image from "next/image";

export interface EventCategory {
  id: string;
  label: string;
  imageSrc: string;
  iconFallback: string;
  color: string;
}

export const EVENT_CATEGORIES: EventCategory[] = [
  {
    id: "all",
    label: "All Events",
    imageSrc: "/categories/all.png",
    iconFallback: "✨",
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "alcoholic-party",
    label: "Alcoholic Party",
    imageSrc: "/categories/alcoholic-party.png",
    iconFallback: "🍾",
    color: "from-purple-600 to-pink-600",
  },
  {
    id: "non-alcoholic-party",
    label: "Non-Alcoholic Party",
    imageSrc: "/categories/non-alcoholic-party.png",
    iconFallback: "🥤",
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "business",
    label: "Business",
    imageSrc: "/categories/business.png",
    iconFallback: "💼",
    color: "from-blue-600 to-indigo-600",
  },
  {
    id: "sports",
    label: "Sports",
    imageSrc: "/categories/sports.png",
    iconFallback: "🏆",
    color: "from-orange-500 to-amber-600",
  },
  {
    id: "performance",
    label: "Performance",
    imageSrc: "/categories/performance.png",
    iconFallback: "🎭",
    color: "from-rose-500 to-red-600",
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
      {/* Scrollable Container on Mobile, Grid/Flex Row on Desktop */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 no-scrollbar scroll-smooth sm:flex-wrap sm:items-center sm:justify-center sm:gap-8">
        {EVENT_CATEGORIES.map((cat) => {
          const isActive = selectedCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className="group flex shrink-0 flex-col items-center gap-2 transition-all duration-300 active:scale-95 outline-none focus:outline-none"
            >
              {/* Floating 3D Icon Container (No White Square Background Box) */}
              <div
                className={`relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl p-1 transition-all duration-300 ${
                  isActive
                    ? "scale-110 drop-shadow-[0_10px_20px_rgba(0,0,0,0.18)]"
                    : "opacity-80 hover:opacity-100 hover:scale-105"
                }`}
              >
                <div className="relative h-14 w-14 sm:h-18 sm:w-18 transition-transform duration-300">
                  <Image
                    src={cat.imageSrc}
                    alt={cat.label}
                    fill
                    className="object-contain"
                    sizes="72px"
                    priority
                  />
                </div>
              </div>

              {/* Label & Active Underline Indicator */}
              <div className="relative flex flex-col items-center">
                <span
                  className={`text-xs sm:text-sm font-extrabold transition-colors duration-200 ${
                    isActive ? "text-slate-950 font-black" : "text-slate-700 group-hover:text-brand-600"
                  }`}
                >
                  {cat.label}
                </span>

                {/* Active Accent Underline (Matching Reference Design) */}
                {isActive ? (
                  <span className="mt-1 h-1 w-8 rounded-full bg-gradient-to-r from-brand-500 to-amber-500 shadow-xs" />
                ) : (
                  <span className="mt-1 h-1 w-0 rounded-full bg-brand-500 transition-all duration-300 group-hover:w-4" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
