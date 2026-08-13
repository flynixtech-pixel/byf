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
      {/* Scrollable Container on Mobile, Flex Row on Desktop */}
      <div className="-mx-4 flex items-center gap-2.5 overflow-x-auto px-4 py-2 scroll-smooth scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-start">
        {EVENT_CATEGORIES.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`group relative flex h-[72px] min-w-[84px] shrink-0 flex-col items-center justify-center gap-1 rounded-[16px] border px-2.5 py-1.5 text-center transition-all duration-300 ease-in-out transform active:scale-95 cursor-pointer ${
                isSelected
                  ? "border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20 shadow-md shadow-rose-500/10 scale-[1.02]"
                  : "border-slate-100 bg-white text-slate-700 hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <span className="flex items-center justify-center text-[22px] leading-none transition group-hover:scale-110">
                {cat.imageSrc ? (
                  <div className="relative h-6 w-6 shrink-0">
                    <Image
                      src={cat.imageSrc}
                      alt={cat.label}
                      fill
                      className="object-contain"
                      sizes="24px"
                      priority
                    />
                  </div>
                ) : (
                  <span>{cat.iconFallback}</span>
                )}
              </span>
              <span
                className={`text-[10.5px] font-extrabold tracking-tight whitespace-nowrap ${
                  isSelected ? "text-rose-600 font-black" : "text-slate-800"
                }`}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
