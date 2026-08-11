"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BadgePercent,
  Check,
  ShieldCheck,
  Sparkles,
  Tag,
  Wallet,
  X,
} from "lucide-react";
import { getDiningBillQuote, payDiningBill } from "@/lib/api/dineout";
import { ApiError } from "@/lib/api/client";
import type { DiningBill, DiningBillQuote, FoodOutlet } from "@/lib/api/types";

const TIP_PRESETS = [0, 20, 50, 100];

const BANK_OFFERS = [
  { code: "HDFC10", label: "HDFC Credit Card", description: "Up to 10% off, max ₹250" },
  { code: "ICICI8", label: "ICICI Dining", description: "Up to 8% off, max ₹200" },
  { code: "SBI7", label: "SBI Dining", description: "Up to 7% off, max ₹150" },
  { code: "AXIS5", label: "Axis Dining", description: "Up to 5% off, max ₹100" },
] as const;

const PAY_METHODS = [
  { value: "UPI", label: "UPI / QR", emoji: "⚡" },
  { value: "Card", label: "Cards", emoji: "💳" },
  { value: "NetBanking", label: "NetBanking", emoji: "🏦" },
  { value: "Wallet", label: "Wallet", emoji: "👛" },
] as const;

type PayMethod = (typeof PAY_METHODS)[number]["value"];

/** Straight-line distance in metres between two coordinates. */
function haversineMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

function formatDistance(metres: number): string {
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)}km` : `${metres}m`;
}

/**
 * Pay a restaurant bill through the app.
 *
 * The player types in the total printed on their bill; the server prices the discount,
 * convenience fee and tip so the amount charged always matches what was shown. A rough
 * distance check flags the case where someone has opened the wrong outlet.
 */
export function PayBillSheet({
  outlet,
  bookingId,
  onClose,
  onPaid,
}: {
  outlet: FoodOutlet;
  /** Set when settling the bill against a reservation. */
  bookingId?: string;
  onClose: () => void;
  onPaid?: (bill: DiningBill) => void;
}) {
  const [step, setStep] = useState<"amount" | "review" | "done">("amount");
  const [amountText, setAmountText] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [bankOfferCode, setBankOfferCode] = useState<string>(BANK_OFFERS[0]!.code);
  const [walletAmountText, setWalletAmountText] = useState("");
  const [rewardPointsText, setRewardPointsText] = useState("");
  const [tip, setTip] = useState(0);
  const [payMethod, setPayMethod] = useState<PayMethod>("UPI");
  /**
   * Quote tagged with the amount/coupon/tip it was priced for, so a stale response can't
   * overwrite a fresh one and "still calculating" falls out of the comparison.
   */
  const [quoteResult, setQuoteResult] = useState<{ key: string; data: DiningBillQuote | null } | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paidBill, setPaidBill] = useState<DiningBill | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const outletKey = outlet.slug || outlet._id;
  const billAmount = Number(amountText) || 0;
  const flatPct = outlet.dineout?.flatDiscountPct ?? 0;

  // Rough "is this the right outlet?" check. Denied permission just skips the banner.
  useEffect(() => {
    const { lat, lng } = outlet.location ?? {};
    if (lat === undefined || lng === undefined) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setDistance(haversineMetres({ lat: pos.coords.latitude, lng: pos.coords.longitude }, { lat, lng })),
      () => setDistance(null),
      { timeout: 8000, maximumAge: 300_000 }
    );
  }, [outlet.location]);

  const walletAmount = Number(walletAmountText) || 0;
  const rewardPointsRedeemed = Number(rewardPointsText) || 0;
  const quoteKey = `${outletKey}|${billAmount}|${appliedCoupon}|${bankOfferCode}|${walletAmount}|${rewardPointsRedeemed}|${tip}`;
  const quote = quoteResult?.key === quoteKey ? quoteResult.data : null;
  const quoting = quoteResult?.key !== quoteKey;

  useEffect(() => {
    if (step !== "review" || billAmount <= 0) return;
    let cancelled = false;
    getDiningBillQuote({
      outletId: outletKey,
      billAmount,
      couponCode: appliedCoupon || undefined,
      tipAmount: tip,
      bankOfferCode: bankOfferCode || undefined,
      walletAmount: walletAmount > 0 ? walletAmount : undefined,
      rewardPointsRedeemed: rewardPointsRedeemed > 0 ? rewardPointsRedeemed : undefined,
    })
      .then((data) => {
        if (!cancelled) setQuoteResult({ key: quoteKey, data });
      })
      .catch((err) => {
        if (cancelled) return;
        setQuoteResult({ key: quoteKey, data: null });
        setError(err instanceof ApiError ? err.describe() : "Could not price this bill");
      });
    return () => {
      cancelled = true;
    };
  }, [step, outletKey, billAmount, appliedCoupon, bankOfferCode, walletAmount, rewardPointsRedeemed, tip, quoteKey]);

  async function handlePay() {
    if (!quote || paying) return;
    setPaying(true);
    setError(null);
    try {
      const bill = await payDiningBill({
        outletId: outletKey,
        billAmount,
        couponCode: quote.couponCode || undefined,
        tipAmount: tip,
        bankOfferCode: bankOfferCode || undefined,
        walletAmount: walletAmount > 0 ? walletAmount : undefined,
        rewardPointsRedeemed: rewardPointsRedeemed > 0 ? rewardPointsRedeemed : undefined,
        paymentMethod: payMethod,
        bookingId,
        distanceMetres: distance ?? undefined,
      });
      setPaidBill(bill);
      onPaid?.(bill);
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  const farAway = distance !== null && distance > 500;

  /* --------------------------------- Receipt --------------------------------- */

  if (step === "done" && paidBill) {
    const saved =
      paidBill.flatDiscount +
      paidBill.couponDiscount +
      (paidBill.bankOfferDiscount ?? 0) +
      (paidBill.walletAmount ?? 0) +
      (paidBill.rewardPointsRedeemed ?? 0);
    return (
      <Shell onClose={onClose} title="Payment successful">
        <div className="overflow-y-auto p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-8 w-8" strokeWidth={3} />
          </div>
          <h2 className="mt-3 text-xl font-extrabold text-slate-900">
            ₹{paidBill.payableAmount.toLocaleString("en-IN")} paid
          </h2>
          <p className="mt-1 text-xs text-slate-500">{outlet.name}</p>

          {saved > 0 && (
            <div className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-700">
              <BadgePercent className="h-3.5 w-3.5" /> You saved ₹{saved.toLocaleString("en-IN")} on this bill
            </div>
          )}

          <div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left text-xs">
            <Row label="Bill ID" value={paidBill.billId} mono />
            <Row label="Bill amount" value={`₹${paidBill.billAmount.toLocaleString("en-IN")}`} />
            {paidBill.flatDiscount > 0 && (
              <Row
                label={`${paidBill.flatDiscountPct}% restaurant discount`}
                value={`−₹${paidBill.flatDiscount.toLocaleString("en-IN")}`}
                tone="green"
              />
            )}
            {paidBill.couponDiscount > 0 && (
              <Row
                label={`Coupon ${paidBill.couponCode}`}
                value={`−₹${paidBill.couponDiscount.toLocaleString("en-IN")}`}
                tone="green"
              />
            )}
            {paidBill.bankOfferDiscount && paidBill.bankOfferDiscount > 0 && (
              <Row
                label={`Bank offer ${paidBill.bankOfferCode}`}
                value={`−₹${paidBill.bankOfferDiscount.toLocaleString("en-IN")}`}
                tone="green"
              />
            )}
            {paidBill.walletAmount && paidBill.walletAmount > 0 && (
              <Row label="Wallet redeemed" value={`−₹${paidBill.walletAmount.toLocaleString("en-IN")}`} tone="green" />
            )}
            {paidBill.rewardPointsRedeemed && paidBill.rewardPointsRedeemed > 0 && (
              <Row
                label="Reward points redeemed"
                value={`−₹${paidBill.rewardPointsRedeemed.toLocaleString("en-IN")}`}
                tone="green"
              />
            )}
            {paidBill.tipAmount > 0 && <Row label="Tip" value={`₹${paidBill.tipAmount.toLocaleString("en-IN")}`} />}
            {paidBill.cashbackEarned && paidBill.cashbackEarned > 0 && (
              <Row
                label="Cashback earned"
                value={`₹${paidBill.cashbackEarned.toLocaleString("en-IN")}`}
                tone="green"
              />
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900">
              <span>Paid via {paidBill.paymentMethod}</span>
              <span>₹{paidBill.payableAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-slate-400">Show this screen to the restaurant if they ask.</p>

          <button
            onClick={onClose}
            className="mt-5 w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-extrabold text-white transition hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </Shell>
    );
  }

  /* ------------------------------ Enter amount ------------------------------ */

  if (step === "amount") {
    return (
      <Shell onClose={onClose} title="Paying bill to" subtitle={outlet.name}>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {farAway && (
            <div className="mb-5 flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-xs font-bold text-white">
              <AlertCircle className="h-4 w-4 shrink-0" />
              You are {formatDistance(distance!)} away. Is this the correct outlet?
            </div>
          )}

          <div className="py-6 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-4xl font-extrabold text-slate-300">₹</span>
              <input
                value={amountText}
                onChange={(e) => setAmountText(e.target.value.replace(/\D/g, "").slice(0, 7))}
                inputMode="numeric"
                autoFocus
                placeholder="0"
                aria-label="Bill amount"
                className="w-40 border-b-2 border-slate-200 bg-transparent pb-1 text-center text-4xl font-extrabold text-slate-900 outline-none focus:border-brand-500 placeholder:text-slate-300"
              />
            </div>
            <p className="mt-3 text-sm text-slate-500">Enter total amount as shown on the bill</p>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
              <div className="flex items-stretch gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-500">Flat discount</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <BadgePercent className="h-3.5 w-3.5" />
                    </span>
                    {flatPct > 0 ? `Flat ${flatPct}% off` : "No flat discount"}
                  </p>
                  <p className="text-[11px] text-slate-500">on total bill</p>
                </div>
                <div className="flex items-center text-slate-300">+</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-500">Coupon</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="DINE250"
                      maxLength={30}
                      aria-label="Coupon code"
                      className="w-full min-w-0 bg-transparent text-sm font-extrabold uppercase text-slate-900 outline-none placeholder:font-semibold placeholder:text-slate-400"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">applied during bill settlement</p>
                </div>
              </div>
            </div>

          {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-center text-xs font-semibold text-rose-600">{error}</p>}
        </div>

        <div className="border-t border-slate-100 p-4">
          <button
            onClick={() => {
              setAppliedCoupon(couponInput.trim());
              setError(null);
              setStep("review");
            }}
            disabled={billAmount <= 0}
            className="w-full rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 py-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-md transition hover:scale-[1.01] disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            Apply offers &amp; pay
          </button>
        </div>
      </Shell>
    );
  }

  /* ------------------------------ Review & pay ------------------------------ */

  return (
    <Shell
      onClose={onClose}
      title={`Paying: ${outlet.name}`}
      subtitle={[outlet.location?.area, outlet.location?.city].filter(Boolean).join(", ") || undefined}
      onBack={() => setStep("amount")}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {quote?.couponError && (
          <p className="rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-700">
            {quote.couponError} — carrying on without it.
          </p>
        )}

        {quote && quote.totalSavings > 0 && (
          <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-bold text-emerald-800">
              <BadgePercent className="h-4 w-4" /> Total savings
            </span>
            <span className="text-sm font-extrabold text-emerald-700">
              ₹{quote.totalSavings.toLocaleString("en-IN")}
            </span>
          </div>
        )}

        {/* Tip */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Add a tip (optional)</p>
          <div className="flex flex-wrap gap-2">
            {TIP_PRESETS.map((t) => (
              <button
                key={t}
                onClick={() => setTip(t)}
                className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                  tip === t
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {t === 0 ? "No tip" : `₹${t}`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-brand-600" /> Bank offers
            </p>
            <div className="space-y-2">
              {BANK_OFFERS.map((offer) => {
                const active = bankOfferCode === offer.code;
                return (
                  <button
                    key={offer.code}
                    type="button"
                    onClick={() => setBankOfferCode(offer.code)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/15" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{offer.label}</p>
                        <p className="text-[11px] text-slate-500">{offer.description}</p>
                      </div>
                      {active && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">On</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Wallet className="h-3.5 w-3.5 text-brand-600" /> Wallet &amp; rewards
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">Wallet amount to redeem</span>
                <input
                  value={walletAmountText}
                  onChange={(e) => setWalletAmountText(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-500">Reward points to redeem</span>
                <input
                  value={rewardPointsText}
                  onChange={(e) => setRewardPointsText(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                You will earn {quote?.cashbackEarned ? `₹${quote.cashbackEarned.toLocaleString("en-IN")}` : "cashback"} after payment.
              </div>
            </div>
          </div>
        </div>

        {/* Bill details */}
        <div>
          <p className="mb-2 text-sm font-extrabold text-slate-900">Bill Details</p>
          <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-white p-4 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Total bill amount</span>
              <span className="font-bold text-slate-900">₹{billAmount.toLocaleString("en-IN")}</span>
            </div>
            {quote && quote.flatDiscount > 0 && (
              <div className="flex justify-between border-t border-dashed border-slate-200 pt-2.5">
                <span className="text-slate-600">{quote.flatDiscountPct}% Regular discount</span>
                <span className="font-bold text-emerald-600">−₹{quote.flatDiscount.toLocaleString("en-IN")}</span>
              </div>
            )}
            {quote && quote.couponDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Coupon {quote.couponCode}</span>
                <span className="font-bold text-emerald-600">−₹{quote.couponDiscount.toLocaleString("en-IN")}</span>
              </div>
            )}
            {quote && quote.bankOfferDiscount && quote.bankOfferDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Bank offer {quote.bankOfferCode}</span>
                <span className="font-bold text-emerald-600">−₹{quote.bankOfferDiscount.toLocaleString("en-IN")}</span>
              </div>
            )}
            {quote && quote.walletAmount && quote.walletAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Wallet redeemed</span>
                <span className="font-bold text-emerald-600">−₹{quote.walletAmount.toLocaleString("en-IN")}</span>
              </div>
            )}
            {quote && quote.rewardPointsRedeemed && quote.rewardPointsRedeemed > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Reward points redeemed</span>
                <span className="font-bold text-emerald-600">−₹{quote.rewardPointsRedeemed.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="border-b border-dashed border-slate-300 text-slate-600">Convenience fee</span>
              <span className="font-semibold text-slate-700">₹{quote?.convenienceFee.toFixed(2) ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">GST on convenience fee</span>
              <span className="font-semibold text-slate-700">₹{quote?.gstOnConvenienceFee.toFixed(2) ?? "—"}</span>
            </div>
            {tip > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Tip</span>
                <span className="font-semibold text-slate-700">₹{tip}</span>
              </div>
            )}
            {quote?.cashbackEarned && quote.cashbackEarned > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Cashback earned</span>
                <span className="font-bold text-emerald-600">₹{quote.cashbackEarned.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-dashed border-slate-200 pt-2.5 text-sm font-extrabold text-slate-900">
              <span>
                To Pay <span className="text-[10px] font-semibold text-slate-400">(Rounded off)</span>
              </span>
              <span>₹{quote ? quote.payableAmount.toLocaleString("en-IN") : "—"}</span>
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Pay using</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PAY_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setPayMethod(m.value)}
                className={`flex flex-col items-center rounded-2xl border p-3 transition ${
                  payMethod === m.value
                    ? "border-emerald-600 bg-emerald-50/50 font-bold text-emerald-900 ring-2 ring-emerald-500"
                    : "border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                <span className="text-lg">{m.emoji}</span>
                <span className="mt-1 text-[11px]">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="rounded-xl bg-rose-50 p-3 text-center text-xs font-semibold text-rose-600">{error}</p>}

        <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <ShieldCheck className="h-3 w-3" /> 128-bit SSL encrypted · secure transaction
        </p>
      </div>

      <div className="border-t border-slate-100 p-4">
        {farAway && (
          <p className="mb-2 flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            You are {formatDistance(distance!)} away. Is this the correct outlet?
          </p>
        )}
        <button
          onClick={handlePay}
          disabled={!quote || quoting || paying}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-lg shadow-emerald-600/25 transition hover:scale-[1.01] disabled:opacity-50"
        >
          {paying
            ? "Processing…"
            : quoting || !quote
              ? "Calculating…"
              : `Pay ₹${quote.payableAmount.toLocaleString("en-IN")}`}
        </button>
      </div>
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  onClose,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-900 px-5 py-4 text-white">
          <div className="flex min-w-0 items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Back"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-base font-extrabold tracking-tight">{title}</h3>
              {subtitle && <p className="truncate text-[11px] text-slate-300">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: "green" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-medium text-slate-500">{label}</span>
      <span
        className={`font-bold ${tone === "green" ? "text-emerald-600" : "text-slate-900"} ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
