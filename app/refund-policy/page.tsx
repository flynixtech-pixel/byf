import Link from "next/link";

export default function RefundPolicyPage() {
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
          Refund & Cancellation Policy
        </h1>
        <p className="mt-3 text-sm text-[#3f5449]">Last Updated: July 24, 2026</p>
        
        <div className="mt-8 space-y-8 text-sm leading-7 text-[#3f5449]">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>1. Booking Cancellations by Users</h2>
            <p>
              Users can cancel their slot bookings, tournament entries, or court reservations through the application. The refund eligibility is determined as follows:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Cancellations made more than 24 hours prior to the scheduled slot: Full refund minus platform transaction fees (if applicable).</li>
              <li>Cancellations made between 12 to 24 hours prior to the scheduled slot: 50% refund.</li>
              <li>Cancellations made less than 12 hours prior to the scheduled slot: No refund.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>2. Cancellations by Merchant / Venue Partners</h2>
            <p>
              If a venue partner is unable to provide the slot due to maintenance, extreme weather conditions, or electricity failure:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The partner must notify the user and cancel the booking through the partner panel.</li>
              <li>The user will receive a 100% full refund of the booking amount.</li>
              <li>No platform convenience fees will be charged to the user.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>3. Refund Processing Time</h2>
            <p>
              Once a refund is initiated, the amount will be credited back to the customer's original payment method (UPI, credit/debit card, net banking) within 5 to 7 business days, depending on bank processing cycles.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>4. Disputes & Support</h2>
            <p>
              In case of slot booking disputes or failure of refunds, please contact us with your booking ID and details at support@bookyourvibes.com. Our support team will resolve payment queries within 48 hours.
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
