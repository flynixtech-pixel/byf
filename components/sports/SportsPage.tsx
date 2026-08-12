"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Gamepad2, 
  Volleyball, 
  Table2, 
  Disc2,
  Waves,
  Dumbbell,
  ChevronRight
} from "lucide-react";
import { Footer } from "@/components/home/Footer";
import { BrandLogo } from "@/components/brand-logo";
import { browseVenues } from "@/lib/api/venues";

const CATEGORIES = [
  {
    id: "cricket",
    title: "Cricket",
    icon: Disc2,
    description: "Experience the thrill of the gentleman's game. Book top-rated turfs and nets.",
    subCategories: [
      { name: "Box Cricket", slug: "box-cricket" },
      { name: "Cricket Nets", slug: "cricket-nets" },
      { name: "Full Ground", slug: "cricket-ground" },
    ]
  },
  {
    id: "football",
    title: "Football",
    icon: Volleyball,
    description: "Gather your squad for an electrifying match. Find the perfect pitch.",
    subCategories: [
      { name: "5-a-side Turf", slug: "5-a-side" },
      { name: "7-a-side Turf", slug: "7-a-side" },
      { name: "11-a-side Field", slug: "11-a-side" },
      { name: "Futsal", slug: "futsal" },
    ]
  },
  {
    id: "racquet",
    title: "Racquet Sports",
    icon: Table2,
    description: "Smash your way to victory. Premium indoor and outdoor courts.",
    subCategories: [
      { name: "Badminton", slug: "badminton" },
      { name: "Tennis", slug: "tennis" },
      { name: "Table Tennis", slug: "table-tennis" },
      { name: "Pickleball", slug: "pickleball" },
      { name: "Squash", slug: "squash" },
    ]
  },
  {
    id: "fitness",
    title: "Fitness & Wellness",
    icon: Dumbbell,
    description: "Push your limits and stay healthy with top gyms and wellness centers.",
    subCategories: [
      { name: "Gym", slug: "gym" },
      { name: "Yoga", slug: "yoga" },
      { name: "Zumba", slug: "zumba" },
      { name: "CrossFit", slug: "crossfit" },
    ]
  },
  {
    id: "aquatics",
    title: "Aquatics & Others",
    icon: Waves,
    description: "Dive in or jump high. Discover swimming pools and basketball courts.",
    subCategories: [
      { name: "Swimming Pool", slug: "swimming" },
      { name: "Basketball", slug: "basketball" },
      { name: "Volleyball", slug: "volleyball" },
    ]
  }
];

export function SportsPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchCounts() {
      const promises: Promise<void>[] = [];
      const newCounts: Record<string, number> = {};
      
      for (const cat of CATEGORIES) {
        for (const sub of cat.subCategories) {
          promises.push(
            browseVenues({ category: sub.slug, limit: 1 }).then((res) => {
              newCounts[sub.slug] = res.total;
            }).catch(() => {})
          );
        }
      }
      await Promise.allSettled(promises);
      setCounts(newCounts);
    }
    fetchCounts();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-50">
      {/* Simple Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-12 lg:pt-8 lg:pb-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Simple Nav */}
          <header className="flex items-center justify-between mb-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 px-4 py-3 sm:px-6 sm:py-4 backdrop-blur-md">
            <BrandLogo 
              className="group shrink-0" 
            />
            <Link href="/" className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline">
              &larr; Back to Home
            </Link>
          </header>

          <div className="max-w-3xl text-center mx-auto">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl mb-4 text-brand-600 dark:text-brand-400">
              Find Your Perfect Game
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
              Browse through our meticulously organized sports categories and find the best turfs, courts, and centers near you.
            </p>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div 
                  key={cat.id} 
                  className={`group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition hover:shadow-md hover:border-brand-500/50 ${idx === 3 || idx === 4 ? "md:col-span-1 lg:col-span-1" : ""}`}
                >
                  <div className="relative z-10">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 transition group-hover:scale-105">
                      <Icon className="h-6 w-6" />
                    </div>
                    
                    <h2 className="text-xl font-bold mb-2">{cat.title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6 h-10">
                      {cat.description}
                    </p>

                    <div className="space-y-2">
                      {cat.subCategories.map((sub) => {
                        const count = counts[sub.slug] !== undefined ? counts[sub.slug] : "...";
                        return (
                          <Link 
                            key={sub.slug} 
                            href={`/venues?category=${sub.slug}`}
                            className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-950/50 px-4 py-3 transition hover:bg-brand-50 dark:hover:bg-brand-900/20 border border-slate-100 dark:border-slate-800 hover:border-brand-200 dark:hover:border-brand-800"
                          >
                            <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover/link:text-brand-600 dark:group-hover/link:text-brand-400">{sub.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{count} Venues</span>
                              <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
