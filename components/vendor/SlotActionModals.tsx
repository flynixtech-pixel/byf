"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Phone,
  MessageCircle,
  MessageSquareText,
  HelpCircle,
  Ban,
  CheckCircle2,
  Wrench,
} from "lucide-react";

const BLOCK_REASONS = ["Maintenance", "Private Event", "Tournament", "Other"] as const;

/* ─── BLOCK REASON PICKER ──────────────────────────────────────── */
export function BlockReasonModal({
  onPick,
  onClose,
}: {
  onPick: (reason: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-slate-900">Reason for blocking</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2">
          {BLOCK_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => onPick(reason)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition"
            >
              {reason}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── CONFIRM WITH UNDO COUNTDOWN ──────────────────────────────── */
export function ConfirmCountdownModal({
  title,
  seconds,
  onConfirm,
  onUndo,
}: {
  title: string;
  seconds: number;
  onConfirm: () => void | Promise<void>;
  onUndo: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);

  const fire = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    void onConfirm();
  };

  useEffect(() => {
    if (remaining <= 0) {
      fire();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-2xl text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-vibe-violet/10 mb-3">
          <HelpCircle size={22} className="text-vibe-violet" />
        </div>
        <h3 className="text-base font-extrabold text-slate-900">Are you sure?</h3>
        <p className="mt-1.5 text-sm text-slate-500">
          You are about to <span className="font-bold text-slate-800">{title}</span>. This action will be finalized in{" "}
          <span className="font-bold text-vibe-violet">{remaining}S</span>.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={onUndo}
            className="rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Undo
          </button>
          <button
            onClick={fire}
            className="rounded-xl bg-vibe-violet py-3 text-sm font-bold text-white hover:bg-vibe-violetSoft transition"
          >
            Confirm Now
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MANAGE BOOKED SLOT (contact + manage) ────────────────────── */
export function ManageBookedSlotModal({
  customerName,
  phone,
  timeLabel,
  courtName,
  courtsFree,
  courtsTotal,
  onClose,
  onClear,
  onMarkPaid,
  onBlockMaintenance,
}: {
  customerName?: string;
  phone?: string;
  timeLabel: string;
  /** Which court this booking sits on — only set on venues that have courts. */
  courtName?: string;
  /** Courts still sellable in this slot, so a multi-court venue doesn't look sold out. */
  courtsFree?: number;
  courtsTotal?: number;
  onClose: () => void;
  onClear: () => void;
  onMarkPaid: () => void;
  onBlockMaintenance: () => void;
}) {
  const name = customerName && customerName !== "Hold" ? customerName : "Booking";
  const digits = (phone ?? "").replace(/\D/g, "");
  const hasPhone = digits.length === 10;
  const telHref = hasPhone ? `tel:+91${digits}` : undefined;
  const smsHref = hasPhone ? `sms:+91${digits}` : undefined;
  const waLink = (text: string) => (hasPhone ? `https://wa.me/91${digits}?text=${encodeURIComponent(text)}` : undefined);

  const greetings = [
    `Hi ${name}, your court is ready!`,
    "Reply here if you need directions.",
    "Reminder: Payment due at venue.",
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg p-6 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">{name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {timeLabel}
              {courtName ? ` • ${courtName}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {typeof courtsTotal === "number" && courtsTotal > 1 && (
          <p
            className={`mb-4 rounded-xl px-3 py-2 text-[11px] font-bold ${
              courtsFree && courtsFree > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {courtsFree && courtsFree > 0
              ? `${courtsFree} of ${courtsTotal} courts still free at this time — you can take more bookings.`
              : `All ${courtsTotal} courts are booked at this time.`}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 mb-5">
          <ContactButton href={telHref} icon={<Phone size={18} className="text-blue-600" />} label="Call" tone="bg-blue-50" />
          <ContactButton href={waLink("Hi, reaching out about your booking.")} icon={<MessageCircle size={18} className="text-emerald-600" />} label="WhatsApp" tone="bg-emerald-50" />
          <ContactButton href={smsHref} icon={<MessageSquareText size={18} className="text-vibe-violet" />} label="Message" tone="bg-vibe-violet/10" />
        </div>

        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Preset Greetings</p>
        <div className="space-y-2 mb-5">
          {greetings.map((g) => (
            <a
              key={g}
              href={waLink(g)}
              className={`block w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 transition ${
                hasPhone ? "hover:bg-slate-50" : "opacity-50 pointer-events-none"
              }`}
            >
              &ldquo;{g}&rdquo;
            </a>
          ))}
        </div>

        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Manage Slot</p>
        <div className="space-y-2">
          <ManageRow icon={<Ban size={18} className="text-rose-500" />} title="Clear / Make Available" onClick={onClear} />
          <ManageRow icon={<CheckCircle2 size={18} className="text-emerald-600" />} title="Mark as Paid & Confirmed" onClick={onMarkPaid} />
          <ManageRow icon={<Wrench size={18} className="text-slate-500" />} title="Block for Maintenance" onClick={onBlockMaintenance} />
        </div>
      </div>
    </div>
  );
}

function ContactButton({ href, icon, label, tone }: { href?: string; icon: React.ReactNode; label: string; tone: string }) {
  return (
    <a
      href={href}
      className={`flex flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-bold text-slate-700 transition ${tone} ${
        href ? "hover:opacity-80" : "opacity-40 pointer-events-none"
      }`}
    >
      {icon}
      {label}
    </a>
  );
}

function ManageRow({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3.5 hover:bg-slate-50 text-left transition"
    >
      {icon}
      <span className="text-sm font-bold text-slate-800">{title}</span>
    </button>
  );
}
