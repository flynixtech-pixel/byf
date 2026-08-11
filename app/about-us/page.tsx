import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/home/Footer";
import { Users, Shield, Award, Heart } from "lucide-react";

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef2ff,_#f8fafc_45%,_#ffffff_80%)]">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        {/* Hero Section */}
        <section className="rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.26)] sm:p-14 text-center">
          <p className="inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-brand-300">
            Our Mission & Story
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
            Connecting Sports & Players
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Book Your Vibe is India's leading sports slot booking platform, designed to bring venue owners, coaches, and sports enthusiasts together under one unified community.
          </p>
        </section>

        {/* Our Vision */}
        <section className="mt-20 grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
              Why We Started Book Your Vibe
            </h2>
            <p className="text-base leading-7 text-slate-600">
              Finding a reliable turf, court, or arena at the perfect slot time was always a hassle. We set out to change that. Book Your Vibe simplifies slots checking and venue reservations down to a single click.
            </p>
            <p className="text-base leading-7 text-slate-600">
              But we didn't stop at bookings. We also built integrated features for tournament registrations, challenges, community chatrooms, and sports-related merchant services (like food and coaching listings) to offer the ultimate post-game experience.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <Users className="h-8 w-8 text-brand-500" />
              <h3 className="mt-4 font-bold text-slate-900">Active Community</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">Connect, chat, and form local matches with local players.</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <Shield className="h-8 w-8 text-brand-500" />
              <h3 className="mt-4 font-bold text-slate-900">Verified Venues</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">All turfs, box cricket arenas, and courts are double verified.</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <Award className="h-8 w-8 text-brand-500" />
              <h3 className="mt-4 font-bold text-slate-900">Tournaments</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">Register and play in leagues, matches, and get recognized.</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <Heart className="h-8 w-8 text-brand-500" />
              <h3 className="mt-4 font-bold text-slate-900">Game-Day Payouts</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">Reliable merchant payout cycles and seamless slots control.</p>
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="mt-20 border-t border-slate-200/50 pt-16">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
            Our Core Values
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="text-center space-y-3">
              <h3 className="text-lg font-bold text-slate-900">Accessibility First</h3>
              <p className="text-sm leading-6 text-slate-600">
                Everyone should have easy access to sports infrastructure. We design features that allow quick, frictionless bookings.
              </p>
            </div>
            <div className="text-center space-y-3">
              <h3 className="text-lg font-bold text-slate-900">Merchant Empowerment</h3>
              <p className="text-sm leading-6 text-slate-600">
                We empower local arena owners, caterers, and sports coaches to scale their businesses and maximize booking occupancy.
              </p>
            </div>
            <div className="text-center space-y-3">
              <h3 className="text-lg font-bold text-slate-900">Building Connection</h3>
              <p className="text-sm leading-6 text-slate-600">
                Sports is about connecting people. Our community features ensure you never have to play alone or struggle to find a team.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
