import Link from "next/link";

export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-[#3f5449]">Last Updated: July 24, 2026</p>
        
        <div className="mt-8 space-y-8 text-sm leading-7 text-[#3f5449]">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>1. Introduction</h2>
            <p>
              Welcome to Book Your Vibes ("we," "our," or "us"). We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, mobile application, or use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>2. Information We Collect</h2>
            <p>
              We collect information that you provide directly to us when registering a vendor account, booking slots, or communicating with us. This includes:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Contact Details (Name, email address, phone number, physical address).</li>
              <li>Business Information (Venue details, business name, registration details).</li>
              <li>Financial Details (Bank account number, IFSC code for payment payouts).</li>
              <li>Usage Data and location details when using our sports booking features.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>3. How We Use Your Information</h2>
            <p>
              We process your data to provide, improve, and secure our sports slot booking platform, including:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Managing account registration and verification via email OTP.</li>
              <li>Processing online slots bookings, tickets, and tournament listings.</li>
              <li>Settling payouts directly to vendor partner bank accounts.</li>
              <li>Sending transaction alerts, confirmations, and security notifications.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>4. Sharing Your Information</h2>
            <p>
              We do not sell your personal data. We only share information with third-party service providers (like payment gateways, hosting providers) to the extent necessary to perform services on our behalf, or when required by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>5. Data Security</h2>
            <p>
              We use appropriate technical and organizational measures, including encryption and secure hosting, to protect your personal information against unauthorized access, loss, or alteration.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#0c1912]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>6. Your Rights</h2>
            <p>
              Depending on your location, you may have the right to access, correct, or delete your personal data stored with us. If you wish to exercise these rights, please contact our support team at support@bookyourvibes.com.
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
