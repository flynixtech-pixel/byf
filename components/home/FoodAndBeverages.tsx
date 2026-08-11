"use client";

import { SectionHeading } from "./ui";
import { DineoutPromoCard } from "@/components/dineout/DineoutPromoCard";

/** Live player-facing food outlets section on web. */
export function FoodAndBeverages() {
  return (
    <section id="food" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading
        title="Food & Beverages"
        subtitle="Discover partner restaurants, reserve tables, and pay dine-in bills through BookYourVibe."
        actionLabel="View All"
        onAction={() => window.location.assign("/food")}
      />

      <div className="mt-4">
        <DineoutPromoCard href="/food" />
      </div>
    </section>
  );
}


