"use client";

import Image from "next/image";
import { Heart, MapPinned, Rocket, Users } from "lucide-react";
import { SectionHeading } from "./ui";

const ABOUT_HIGHLIGHTS = [
  {
    id: "mission",
    icon: Rocket,
    title: "Why we started",
    desc: "We got tired of calling five different turfs just to find one free slot. So we built the one place Udaipur books its games from.",
  },
  {
    id: "community",
    icon: Users,
    title: "Built for players",
    desc: "Every feature — from splitting the bill to finding a fourth player — comes from real conversations with the people who play.",
  },
  {
    id: "local",
    icon: MapPinned,
    title: "Rooted in Udaipur",
    desc: "We started local and stayed close to our vendors and players, growing venue by venue instead of chasing numbers.",
  },
  {
    id: "vibe",
    icon: Heart,
    title: "The vibe, not just the venue",
    desc: "Booking a court is the easy part. We care just as much about who you play with and how good that evening feels.",
  },
];

export function AboutUs() {
  return (
    <section id="about-us" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Our story"
        title="About Book Your Vibe"
        subtitle="A homegrown startup on a mission to make playing your favourite sport as easy as ordering food."
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div className="relative h-64 overflow-hidden rounded-3xl shadow-xl shadow-slate-900/10 sm:h-80 lg:h-[26rem]">
          <Image
            src="/vendorimg.jpg"
            alt="Book Your Vibe team at a partner venue"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>

        <div>
          <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
            Book Your Vibe started with a simple frustration — great venues in Udaipur were
            hard to find and even harder to book. What began as a small idea between friends
            who just wanted an easier way to play has grown into a platform trusted by
            thousands of players and venue owners across the city.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            We&rsquo;re not just building a booking app — we&rsquo;re building the layer around
            how people play: finding a court, finding a fourth player, ordering food courtside,
            and settling the bill without an awkward group chat. Every court booked and every
            match played pushes us to make the next one even better.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {ABOUT_HIGHLIGHTS.map((h) => (
              <div key={h.id} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                  <h.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{h.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
