"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DISTANCE_OPTIONS, filterPillClass, PRICE_OPTIONS, SORT_OPTIONS, type useVenueFilters } from "../useVenueFilters";
import { ModalShell } from "./ModalShell";

export function FiltersModal({
  onClose,
  resultCount,
  filters,
  variant = "global",
}: {
  onClose: () => void;
  resultCount: number;
  filters: ReturnType<typeof useVenueFilters>;
  variant?: "global" | "venue";
}) {
  const {
    sportOptions,
    selectedSports,
    toggleSport,
    clearSports,
    maxPrice,
    setMaxPrice,
    maxDistance,
    setMaxDistance,
    sortBy,
    setSortBy,
    resetFilters,
  } = filters;

  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("Venue");

  const handleApply = () => {
    onClose();
    if (variant === "global") {
      if (selectedCategory === "Event") {
        router.push("/events");
      } else if (selectedCategory === "Dineout") {
        router.push("/food");
      }
    }
  };

  return (
    <ModalShell onClose={onClose} title="Filters" subtitle="Narrow down venues by price, distance & sort order.">
      {variant === "global" && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Category</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSelectedCategory("Venue")} className={filterPillClass(selectedCategory === "Venue")}>
              Venue
            </button>
            <button type="button" onClick={() => setSelectedCategory("Event")} className={filterPillClass(selectedCategory === "Event")}>
              Event
            </button>
            <button type="button" onClick={() => setSelectedCategory("Dineout")} className={filterPillClass(selectedCategory === "Dineout")}>
              Dineout
            </button>
          </div>
        </div>
      )}

      {variant === "venue" && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Sport</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={clearSports} className={filterPillClass(selectedSports.size === 0)}>
              Any
            </button>
            {sportOptions.map((sport) => (
              <button
                key={sport}
                type="button"
                onClick={() => toggleSport(sport)}
                className={filterPillClass(selectedSports.has(sport))}
              >
                {sport}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={variant === "venue" ? "mt-5" : "mt-5"}>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Max Price</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setMaxPrice(null)} className={filterPillClass(maxPrice === null)}>
            Any
          </button>
          {PRICE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMaxPrice(opt.value)}
              className={filterPillClass(maxPrice === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Distance</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setMaxDistance(null)} className={filterPillClass(maxDistance === null)}>
            Any
          </button>
          {DISTANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMaxDistance(opt.value)}
              className={filterPillClass(maxDistance === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Sort By</p>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortBy(opt.value)}
              className={filterPillClass(sortBy === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={resetFilters}
          className="flex-1 rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-600"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="flex-1 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 py-3 text-sm font-semibold text-white shadow-sm"
        >
          {variant === "global" ? (selectedCategory === "Venue" ? `Show ${resultCount} Venues` : `Go to ${selectedCategory}s`) : `Show ${resultCount} Venues`}
        </button>
      </div>
    </ModalShell>
  );
}
