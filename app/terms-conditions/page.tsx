import Link from "next/link";

export default function TermsConditionsPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ea] text-[#10241a]">
      <header className="flex items-center justify-between px-6 py-4 sm:px-12 border-b border-[#e4ded0]/50 bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <Link href="/vendor/register" className="flex items-center gap-2 font-[600] text-lg" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="Book Your Vibes Logo"
            className="h-9 w-9 rounded-lg border border-[#e4ded0] object-contain p-0.5 bg-white shrink-0"
            loading="lazy"
            decoding="async"
          />
          Book Your Vibes
        </Link>
        <Link
          href="/vendor/register"
          className="rounded-full border border-[#0c1912] px-5 py-2 text-sm font-bold hover:bg-[#0c1912] hover:text-[#a6ff3c] transition"
        >
          Back to Register
        </Link>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-[#0c1912] sm:text-5xl" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
          Terms & Conditions
        </h1>
        <p className="mt-3 text-sm text-[#3f5449]">Last Updated: July 24, 2026</p>
        
        <div className="mt-8 space-y-8 text-sm leading-7 text-[#3f5449]">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>1. Acceptance of Terms</h2>
            <p>
              By accessing our platform, booking slots, or registering as a merchant/vendor partner on Book Your Vibes, you agree to comply with and be bound by these Terms & Conditions. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>2. Vendor & Merchant Accounts</h2>
            <p>
              When registering as a partner (venue owner, box cricket arena, coach, etc.), you agree to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide accurate, complete, and up-to-date business registration details.</li>
              <li>Maintain the security and confidentiality of your credentials.</li>
              <li>Be fully responsible for slot pricing, slot timings, and availability listed on your profile.</li>
              <li>Verify customer bookings at your venue via QR code check-in or booking ticket receipts.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>3. Booking & Payments</h2>
            <p>
              All online bookings made through the platform are processed using secure third-party payment gateways. For vendor partners:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Payouts will be settled directly to your registered bank account after deducting applicable platform convenience fees.</li>
              <li>Payout settlement cycles will follow the standard merchant payout terms agreed upon during onboarding.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>4. Code of Conduct</h2>
            <p>
              Both players and venue partners must treat each other with respect. Venue partners must maintain their courts, grounds, or sports facilities in safe, playable conditions. Book Your Vibes reserves the right to suspend any partner account violating our standards or receiving repeated customer complaints.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>5. Limitation of Liability</h2>
            <p>
              Book Your Vibes acts as an intermediary platform connecting players and venue partners. We are not liable for any injuries, accidents, property damage, or disputes occurring at partner venues.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>6. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Any changes will be posted on this page with an updated revision date. Continued use of the platform after updates signifies your acceptance of the revised Terms.
            </p>
          </section>
        </div>
      </article>

      <footer className="border-t border-[#e4ded0]/50 py-8 px-6 text-center text-xs text-[#3f5449] sm:px-12 bg-white/30">
        <p>© {new Date().getFullYear()} Book Your Vibes. All rights reserved.</p>
      </footer>
    </main>
  );
}
