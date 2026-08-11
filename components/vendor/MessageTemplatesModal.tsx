"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, Phone, X } from "lucide-react";

export interface MessageTemplateContext {
  customerName?: string;
  phone?: string;
  orderId: string;
  /** Pre-formatted slot label, e.g. "09:00 AM - 10:00 AM". */
  timeLabel: string;
  /** Pre-formatted date label, e.g. "Fri, 17 July". */
  dateLabel: string;
  totalAmount?: number;
  paymentStatus?: string;
}

/** The three ready-to-send templates, built from the booking's real details. */
export function buildTemplates(ctx: MessageTemplateContext): { id: string; title: string; body: string }[] {
  const name = ctx.customerName && ctx.customerName !== "Hold" ? ctx.customerName : "there";
  const amount = ctx.totalAmount != null ? `₹${ctx.totalAmount}` : "the balance";

  return [
    {
      id: "confirmed",
      title: "Booking confirmed",
      body: `Hi ${name}, your booking is confirmed for ${ctx.timeLabel} on ${ctx.dateLabel}. Booking ID: ${ctx.orderId}. See you at the venue! — Book Your Vibe`,
    },
    {
      id: "reminder",
      title: "Arrival reminder",
      body: `Hi ${name}, a quick reminder that your slot is at ${ctx.timeLabel} on ${ctx.dateLabel}. Please arrive 10 minutes early. Booking ID: ${ctx.orderId}. — Book Your Vibe`,
    },
    {
      id: "payment",
      title: "Payment pending",
      body: `Hi ${name}, ${amount} is still pending for your booking on ${ctx.dateLabel} at ${ctx.timeLabel}. Booking ID: ${ctx.orderId}. Please complete the payment before your slot. — Book Your Vibe`,
    },
  ];
}

/**
 * Tap "Message" on a booking → pick one of three ready-to-send templates.
 * Sending uses a WhatsApp deep link (same pattern as ManageBookedSlotModal).
 */
export function MessageTemplatesModal({
  ctx,
  onClose,
}: {
  ctx: MessageTemplateContext;
  onClose: () => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const digits = (ctx.phone ?? "").replace(/\D/g, "");
  // Accept a bare 10-digit number or one already carrying the 91 country code.
  const msisdn = digits.length === 10 ? `91${digits}` : digits.length === 12 && digits.startsWith("91") ? digits : "";
  const hasPhone = msisdn.length > 0;

  const waHref = (text: string) => (hasPhone ? `https://wa.me/${msisdn}?text=${encodeURIComponent(text)}` : undefined);
  const templates = buildTemplates(ctx);

  async function copy(id: string, body: string) {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      /* clipboard unavailable — the WhatsApp button still works */
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg p-5 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-slate-900">Send a message</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {ctx.customerName ?? "Customer"} · {ctx.timeLabel}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {!hasPhone && (
          <p className="mb-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-[11px] font-bold text-amber-700">
            No valid phone number on this booking — you can still copy the text.
          </p>
        )}

        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Ready to send</p>
        <div className="space-y-2.5">
          {templates.map((t) => (
            <div key={t.id} className="rounded-2xl border border-slate-200 p-3.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">{t.body}</p>
              <div className="mt-3 flex gap-2">
                <a
                  href={waHref(t.body)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#00a86b] py-2.5 text-[11px] font-black text-white transition active:scale-[0.97] ${
                    hasPhone ? "hover:bg-[#00965f]" : "pointer-events-none opacity-40"
                  }`}
                >
                  <MessageCircle size={13} /> Send on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => copy(t.id, t.body)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] font-black text-slate-600 transition hover:bg-slate-100 active:scale-[0.97]"
                >
                  {copiedId === t.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  {copiedId === t.id ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {hasPhone && (
          <a
            href={`tel:+${msisdn}`}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            <Phone size={14} className="text-slate-500" /> Call instead
          </a>
        )}
      </div>
    </div>
  );
}
