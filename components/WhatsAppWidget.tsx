"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { buildWhatsAppLink } from "@/lib/contact";

function buildEnquiryMessage(name: string, phone: string) {
  return `Hello Book Your Vibe team,\n\nMy name is ${name} and my contact number is ${phone}.\nI would like to enquire about booking a venue/court.\n\nPlease get back to me at the earliest. Thank you.`;
}

export function WhatsAppWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/vendor")) {
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ""))) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    setError("");
    const message = buildEnquiryMessage(name.trim(), phone.replace(/\D/g, ""));
    window.open(buildWhatsAppLink(message), "_blank", "noreferrer");
    setOpen(false);
    setName("");
    setPhone("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Enquire on WhatsApp"
        className="fixed bottom-24 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/40 transition hover:scale-105 hover:bg-emerald-600 sm:bottom-5"
      >
        <WhatsAppIcon className="h-7 w-7" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <WhatsAppIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-extrabold text-slate-900">Chat with us</p>
                  <p className="text-xs text-slate-500">We usually reply within a few minutes.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Your Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-600">Phone Number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="98765 43210"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {error && <p className="text-xs font-semibold text-accent-600">{error}</p>}

              <button
                type="submit"
                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/30 transition hover:bg-emerald-600"
              >
                <WhatsAppIcon className="h-4 w-4" /> Continue on WhatsApp
              </button>
              <p className="text-center text-[11px] text-slate-400">
                Opens WhatsApp with your enquiry pre-filled.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
