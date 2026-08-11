import Link from "next/link";
import { SiteHeader } from "../../components/site-header";
import { MobileCard, MobileTopBar } from "@/components/mobile/ui";

export const metadata = {
  title: "Offers | Book Your Vibe",
  description: "Browse discounts, bundles, and member-friendly offers.",
};

const OFFERS = [
  { title: "First booking bonus", desc: "Get 20% off your first slot on selected venues.", tag: "New users", accent: "from-brand-500 to-accent-500" },
  { title: "Midweek saver", desc: "Lower rates for Tuesday to Thursday evening slots.", tag: "Weekday deal", accent: "from-sky-500 to-cyan-500" },
  { title: "Squad bundle", desc: "Split the bill with friends and save on group bookings.", tag: "Groups", accent: "from-emerald-500 to-teal-500" },
  { title: "Flash sale", desc: "Limited-time drops on nearby venues before prime-time.", tag: "Limited", accent: "from-fuchsia-500 to-violet-600" },
];

export default function OffersPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_45%,_#ffffff_82%)]">
      <div className="hidden sm:block">
        <SiteHeader />
      </div>

      <div className="sm:hidden">
        <div className="px-4 pt-4">
          <MobileTopBar />
        </div>
        <main className="flex flex-col gap-5 px-4 py-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Offers</p>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
              Useful discounts, not noisy promos.
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Book more often without digging through banners or confusing terms.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {OFFERS.map((offer) => (
              <MobileCard key={offer.title} className="!p-4">
                <div className={`rounded-2xl bg-gradient-to-r ${offer.accent} p-4 text-white`}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
                    {offer.tag}
                  </p>
                  <h2 className="mt-1 text-lg font-extrabold">{offer.title}</h2>
                </div>
                <p className="mt-3 text-sm text-slate-600">{offer.desc}</p>
              </MobileCard>
            ))}
          </div>
        </main>
      </div>

      <main className="mx-auto hidden max-w-7xl px-4 py-10 sm:block sm:px-6 sm:py-14">
        <section className="overflow-hidden rounded-[2rem] bg-white p-6 shadow-[0_20px_80px_rgba(148,163,184,0.18)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-600">Offers</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Useful discounts, not noisy promos.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                These offers are designed to help players book more often without digging through
                cluttered banners or confusing terms.
              </p>
            </div>
            <div className="rounded-[1.75rem] bg-gradient-to-br from-brand-500 to-accent-500 p-6 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                Featured today
              </p>
              <p className="mt-3 text-3xl font-black">Save more on your next game.</p>
              <p className="mt-3 text-sm leading-6 text-white/85">
                Pair a midweek booking with a squad deal and unlock the best effective price.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {OFFERS.map((offer) => (
            <article
              key={offer.title}
              className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className={`rounded-[1.5rem] bg-gradient-to-r ${offer.accent} p-5 text-white`}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">{offer.tag}</p>
                <h2 className="mt-2 text-2xl font-black">{offer.title}</h2>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">{offer.desc}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[2rem] bg-slate-950 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-300">
                Membership
              </p>
              <h2 className="mt-2 text-2xl font-black">Simple pricing, no surprise math.</h2>
            </div>
            <Link
              href="/venues"
              className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
            >
              Check venues
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
