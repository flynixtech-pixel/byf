"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { type LucideIcon } from "lucide-react";

export interface SportCategoryItem {
  id: string;
  label: string;
  emoji?: string;
  image?: string;
  icon?: LucideIcon;
  note?: string;
}

export interface SportsCategoryBarProps {
  categories: SportCategoryItem[];
  selectedId?: string;
  onSelectCategory?: (id: string) => void;
  className?: string;
  pillClassName?: string;
  variant?: "pill" | "card";
}

export function SportsCategoryBar({
  categories,
  selectedId: externalSelectedId,
  onSelectCategory,
  className = "",
  pillClassName = "",
  variant = "pill",
}: SportsCategoryBarProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string>(
    externalSelectedId || categories[0]?.id || ""
  );
  const [itemsOrder, setItemsOrder] = useState<SportCategoryItem[]>(categories);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;

  // Sync externalSelectedId if it changes from outside
  useEffect(() => {
    if (externalSelectedId && externalSelectedId !== internalSelectedId) {
      setInternalSelectedId(externalSelectedId);
      setItemsOrder((prev) => {
        const idx = prev.findIndex((item) => item.id === externalSelectedId);
        if (idx <= 0) return prev;
        const target = prev[idx];
        const rest = prev.filter((item) => item.id !== externalSelectedId);
        return [target, ...rest];
      });
    }
  }, [externalSelectedId]);

  const handleCategoryClick = (id: string) => {
    setInternalSelectedId(id);

    // Reorder items so clicked category moves smoothly to first position (index 0)
    setItemsOrder((prevOrder) => {
      const idx = prevOrder.findIndex((c) => c.id === id);
      if (idx <= 0) return prevOrder;
      const selectedItem = prevOrder[idx];
      const remainingItems = prevOrder.filter((c) => c.id !== id);
      return [selectedItem, ...remainingItems];
    });

    // Smooth horizontal scroll to index 0
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }

    if (onSelectCategory) {
      onSelectCategory(id);
    }
  };

  return (
    <div
      ref={scrollRef}
      className={`-mx-4 flex items-center gap-2.5 overflow-x-auto px-4 py-2 scroll-smooth scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 ${className}`}
    >
      {itemsOrder.map((cat) => {
        const isSelected = cat.id === activeId;

        if (variant === "card") {
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              className={`group relative flex h-[72px] min-w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-[16px] border px-2.5 py-1.5 text-center transition-all duration-300 ease-in-out transform active:scale-95 cursor-pointer ${
                isSelected
                  ? "border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-md shadow-brand-500/10 scale-[1.02]"
                  : "border-slate-100 bg-white text-slate-700 hover:border-slate-300 hover:shadow-xs"
              } ${pillClassName}`}
            >
              <span className="flex items-center justify-center text-[22px] leading-none transition group-hover:scale-110">
                {cat.emoji ? (
                  <span>{cat.emoji}</span>
                ) : cat.image ? (
                  <Image
                    src={cat.image}
                    alt={cat.label}
                    width={24}
                    height={24}
                    unoptimized
                    className="h-5.5 w-5.5 object-contain"
                  />
                ) : cat.icon ? (
                  <cat.icon className={`h-5 w-5 ${isSelected ? "text-brand-600" : "text-slate-500"}`} />
                ) : null}
              </span>
              <span
                className={`text-[10.5px] font-extrabold tracking-tight whitespace-nowrap ${
                  isSelected ? "text-brand-600 font-black" : "text-slate-800"
                }`}
              >
                {cat.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleCategoryClick(cat.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold sm:px-5 sm:py-2.5 sm:text-sm transition-all duration-300 ease-in-out transform active:scale-95 cursor-pointer ${
              isSelected
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 border border-emerald-600 font-bold scale-[1.02]"
                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
            } ${pillClassName}`}
          >
            {cat.emoji && <span className="text-base sm:text-lg leading-none">{cat.emoji}</span>}
            {!cat.emoji && cat.image && (
              <span className="relative flex h-5 w-5 items-center justify-center shrink-0">
                <Image
                  src={cat.image}
                  alt={cat.label}
                  width={22}
                  height={22}
                  unoptimized
                  className="h-5 w-5 object-contain"
                />
              </span>
            )}
            {!cat.emoji && !cat.image && cat.icon && (
              <cat.icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-slate-500"}`} />
            )}
            <span className="whitespace-nowrap tracking-tight">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
