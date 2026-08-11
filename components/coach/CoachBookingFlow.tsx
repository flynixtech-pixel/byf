"use client";

import { useState } from "react";
import { Check, Clock, ShieldCheck, User, X } from "lucide-react";
import { useCustomerAuth } from "@/components/providers/CustomerAuthProvider";
import { LoginModal } from "@/components/home/modals/LoginModal";
import { SignupModal } from "@/components/home/modals/SignupModal";
import { enrollInCoachBatch } from "@/lib/api/coaches";
import { ApiError } from "@/lib/api/client";
import type { Coach, CoachBatch, CoachSubscription, CoachSubscriptionPlan, PaymentMethod } from "@/lib/api/types";

const PAYMENT_METHODS: PaymentMethod[] = ["Cashfree (Online)", "Cash (Offline)"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface PlanOption {
  plan: CoachSubscriptionPlan;
  label: string;
  price: number;
  sub: string;
}

function planOptions(batch: CoachBatch): PlanOption[] {
  const opts: PlanOption[] = [
    { plan: "monthly", label: "Monthly", price: batch.priceMonthly, sub: "per month" },
    { plan: "yearly", label: "Yearly", price: batch.priceYearly, sub: "per year" },
  ];
  if (batch.demoAvailable) opts.unshift({ plan: "demo", label: "Demo", price: 0, sub: "one free trial" });
  return opts;
}

export function CoachBookingFlow({ coach, batch, onClose }: { coach: Coach; batch: CoachBatch; onClose: () => void }) {
  const { status } = useCustomerAuth();
  const options = planOptions(batch);
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  const [plan, setPlan] = useState<CoachSubscriptionPlan>(options[0].plan);
  const [payment, setPayment] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState<CoachSubscription | null>(null);

  const selected = options.find((o) => o.plan === plan) ?? options[0];
  const isFree = selected.price === 0;

  if (status === "loading") {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-slate-600">Loading...</div>
      </div>
    );
  }

  if (status === "guest") {
    return authView === "login" ? (
      <LoginModal onClose={onClose} onLoggedIn={() => {}} onSwitchToSignup={() => setAuthView("signup")} />
    ) : (
      <SignupModal onClose={onClose} onSignedUp={() => {}} onSwitchToLogin={() => setAuthView("login")} />
    );
  }

  async function handleConfirm() {
    if (!agreed) return;
    setSubmitting(true);
    setError("");
    try {
      const created = await enrollInCoachBatch({ coachId: coach._id, batchId: batch.id, plan, payment });
      setSubscription(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (subscription) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
        <div className="relative m-4 w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-8 w-8" strokeWidth={3} />
          </div>
          <h2 className="mt-4 text-xl font-extrabold text-slate-900">
            {subscription.plan === "demo" ? "Demo Booked!" : "Enrolled!"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">You&rsquo;re in {batch.name} with {coach.name}.</p>

          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left text-sm">
            <Row label="Order ID" value={<span className="font-mono font-bold">{subscription.orderId}</span>} />
            <Row label="Coach" value={`${coach.name} · ${coach.category}`} />
            <Row label="Batch" value={`${batch.name} · ${batch.startTime}–${batch.endTime}`} />
            <Row label="Plan" value={<span className="capitalize">{subscription.plan}</span>} />
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="font-bold text-slate-900">{subscription.paymentStatus === "paid" ? "Paid" : "Payment"}</span>
              <span className="font-extrabold text-emerald-600">₹{subscription.amount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border-l-4 border-brand-400 bg-brand-50 px-3 py-2 text-left text-xs text-slate-600">
            <ShieldCheck className="h-4 w-4 shrink-0 text-brand-500" />
            <span>Keep your Order ID <span className="font-bold">{subscription.orderId}</span> handy for the coach.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/30 transition hover:scale-[1.02]"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="relative my-6 w-full max-w-lg rounded-3xl bg-slate-50 p-5 shadow-2xl sm:p-7">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-xl font-extrabold text-slate-900">Join this Batch</h2>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
              <User className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">{coach.name}</p>
              <p className="text-xs text-slate-500">
                {coach.category}
                {coach.subCategory ? ` · ${coach.subCategory}` : ""}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm">
            <p className="text-sm font-bold text-slate-900">{batch.name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" /> {batch.startTime}–{batch.endTime} · {batch.days.map((d) => DAYS[d]).join(", ")}
            </p>
            {typeof batch.spotsLeft === "number" && (
              <p className="mt-1 text-xs font-semibold text-emerald-600">{batch.spotsLeft} spots left</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-sm font-bold text-slate-900">Choose a plan</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {options.map((o) => (
                <button
                  key={o.plan}
                  type="button"
                  onClick={() => setPlan(o.plan)}
                  className={`rounded-xl border px-2 py-3 text-center transition ${
                    plan === o.plan ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">{o.label}</p>
                  <p className="mt-1 text-sm font-extrabold text-brand-600">{o.price === 0 ? "Free" : `₹${o.price.toLocaleString("en-IN")}`}</p>
                  <p className="text-[10px] text-slate-400">{o.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {!isFree && (
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-sm font-bold text-slate-900">Payment Method</p>
              <div className="mt-3 flex gap-2">
                {PAYMENT_METHODS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPayment(p)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                      payment === p ? "border-brand-400 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {p === "Cashfree (Online)" ? "Pay Online" : "Pay at Academy"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
            <span>
              I accept the <span className="font-semibold underline">Terms &amp; Conditions</span>.
            </span>
          </label>

          <button
            type="button"
            disabled={!agreed || submitting}
            onClick={handleConfirm}
            className={`w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-wide transition ${
              agreed && !submitting
                ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/30 hover:scale-[1.01]"
                : "cursor-not-allowed bg-slate-300 text-white"
            }`}
          >
            {submitting ? "Processing..." : isFree ? "Book Demo" : `Enrol · ₹${selected.price.toLocaleString("en-IN")}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
