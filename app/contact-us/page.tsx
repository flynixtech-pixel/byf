"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/home/Footer";
import { Mail, Phone, MapPin, CheckCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { buildWhatsAppLink, WHATSAPP_DISPLAY } from "@/lib/contact";

export default function ContactUsPage() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate contact submission
    setSubmitted(true);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  const whatsappMessage = "Hello Book Your Vibe team, I'd like to get support or inquire about your services.";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef2ff,_#f8fafc_45%,_#ffffff_80%)]">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        {/* Header section */}
        <section className="text-center space-y-4">
          <p className="inline-block rounded-full bg-brand-50 px-4 py-1 text-xs font-bold uppercase tracking-widest text-brand-600">
            Get In Touch
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
            We'd Love to Hear From You
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-6 text-slate-500">
            Have questions about booking, hosting tournaments, or listing your venue as a vendor? Our team is here to support you.
          </p>
        </section>

        <section className="mt-14 grid gap-10 lg:grid-cols-2">
          {/* Contact Details Card */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm space-y-6">
              <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
                Contact Information
              </h2>
              
              <div className="space-y-4">
                <a href="mailto:info@bookyourvibe.in" className="flex items-center gap-4 group">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-brand-600 transition group-hover:bg-brand-50">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address</p>
                    <p className="text-sm font-semibold text-slate-950 mt-0.5">info@bookyourvibe.in</p>
                  </div>
                </a>

                <a href={buildWhatsAppLink(whatsappMessage)} target="_blank" rel="noreferrer" className="flex items-center gap-4 group">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-emerald-500 transition group-hover:bg-emerald-50">
                    <WhatsAppIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">WhatsApp Support</p>
                    <p className="text-sm font-semibold text-slate-950 mt-0.5">{WHATSAPP_DISPLAY}</p>
                  </div>
                </a>

                <a href="tel:+916350651667" className="flex items-center gap-4 group">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-brand-600 transition group-hover:bg-brand-50">
                    <Phone className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone Hotline</p>
                    <p className="text-sm font-semibold text-slate-950 mt-0.5">+91 63506 51667</p>
                  </div>
                </a>

                <a
                  href="https://www.google.com/maps/search/Udaipur,+Rajasthan,+India"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 group"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-brand-600 transition group-hover:bg-brand-50">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Our Office Address</p>
                    <p className="text-sm font-semibold text-slate-950 mt-0.5">Udaipur, Rajasthan, India</p>
                  </div>
                </a>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
              <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>Vendor Onboarding Desk</h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Are you a sports club, turf, court, or box arena owner? Contact our partner onboarding managers directly for bulk registrations, customized slots setups, or POS integration advice.
              </p>
              <Link href="/vendor/register" className="mt-5 inline-block text-xs font-bold uppercase tracking-widest text-brand-300 hover:underline">
                Register as Vendor Partner &rarr;
              </Link>
            </div>
          </div>

          {/* Interactive Form Column */}
          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            {submitted ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 space-y-4">
                <CheckCircle className="h-16 w-16 text-emerald-500" />
                <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>Message Received!</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  Thank you for reaching out. A support coordinator will respond to your inquiry via email within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 rounded-xl border border-slate-200 px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
                  Send a Message
                </h2>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your name"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none focus:border-brand-500 transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter your email"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none focus:border-brand-500 transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Subject</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Inquiry subject"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none focus:border-brand-500 transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Your Message</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Write details of your inquiry..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none focus:border-brand-500 transition resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition"
                >
                  Send Inquiry
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
