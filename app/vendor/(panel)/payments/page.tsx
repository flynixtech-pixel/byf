"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { PageHero } from "@/components/vendor/ui";
import StatCard from "@/components/vendor/StatCard";
import { Banknote, PiggyBank, Landmark, CircleDollarSign } from "lucide-react";
import { getVendorSettledPayments } from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import { SettledPayment } from "@/lib/api/types";
import { PageBack } from "@/components/vendor/PageBack";
import { MpinGate } from "@/components/vendor/MpinGate";

export default function PaymentsPage() {
  return (
    <MpinGate title="Payment Settled">
      <PaymentsPageContent />
    </MpinGate>
  );
}

function PaymentsPageContent() {
  const [tab, setTab] = useState<"online" | "offline">("online");
  const [payments, setPayments] = useState<SettledPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getVendorSettledPayments()
      .then(setPayments)
      .catch((err) => setError(err instanceof ApiError ? err.describe() : "Failed to load settlements"))
      .finally(() => setLoading(false));
  }, []);

  const online = useMemo(() => payments.filter((p) => p.payment !== "Cash (Offline)"), [payments]);
  const offline = useMemo(() => payments.filter((p) => p.payment === "Cash (Offline)"), [payments]);

  const totalOnline = online.reduce((s, p) => s + p.yourEarning, 0);
  const totalOffline = offline.reduce((s, p) => s + p.yourEarning, 0);
  const visible = tab === "online" ? online : offline;

  // The two-way ledger between the venue and BYV:
  //  - Online bookings: BYV collects payment via gateway and owes the vendor their earning share.
  //  - Offline/cash bookings: the vendor collects the full cash directly, so BYV never deducted
  //    its commission at the point of sale — the vendor owes that platform fee back to BYV.
  const owedByByv = totalOnline;
  const owedToByv = offline.reduce((s, p) => s + p.platformFee, 0);
  const netSettlement = owedByByv - owedToByv;

  function handleExport() {
    const rows = visible.map((p) => [p.date, p.listingName, p.orderId, p.totalAmount, p.platformFee, p.yourEarning]);
    const csv = [["Date", "Listing Name", "Order ID", "Total Amount", "Platform Fee", "Your Earning"], ...rows]
      .map((r) => r.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "settlements-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageBack fallback="/vendor/dashboard" />
      <PageHero
        eyebrow="Earnings"
        title="Payment settled"
        description="Track your online earnings, offline collections and pending settlements."
        right={
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl bg-white text-vibe-violet font-semibold text-sm px-4 py-2.5 hover:bg-white/90 transition-colors"
          >
            <Download size={16} /> Export
          </button>
        }
      />

      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-xs text-vibe-coral">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Offline Collection"
          value={`₹${totalOffline.toLocaleString("en-IN")}`}
          hint="Direct cash payments collected at the venue"
          icon={Banknote}
          accent="amber"
        />
        <StatCard
          label="Total Online Earnings"
          value={`₹${totalOnline.toLocaleString("en-IN")}`}
          hint="Customer payments minus platform fee & tax"
          icon={CircleDollarSign}
          accent="violet"
        />
        <StatCard
          label="Platform Fee Payable"
          value={`₹${owedToByv.toLocaleString("en-IN")}`}
          hint="Your commission on offline cash bookings — owed to BYV"
          icon={Landmark}
          accent="coral"
        />
        <StatCard
          label={netSettlement >= 0 ? "Net Receivable from BYV" : "Net Payable to BYV"}
          value={`${netSettlement < 0 ? "-" : ""}₹${Math.abs(netSettlement).toLocaleString("en-IN")}`}
          hint={
            netSettlement >= 0
              ? "Online earnings due to you, after netting off what you owe BYV"
              : "Your offline commission dues exceed your online earnings this period"
          }
          icon={PiggyBank}
          accent={netSettlement >= 0 ? "lime" : "coral"}
        />
      </div>

      <p className="text-xs text-ink-faint">
        <strong className="font-semibold text-ink-soft">How settlement works:</strong> BYV owes you your earning
        share on every online booking. For offline/cash bookings, you keep the full amount at the venue, so you owe
        BYV its platform fee on those instead. The two net against each other for your final settlement.
      </p>

      <div className="rounded-xl2 border border-surface-border bg-white shadow-panel">
        <div className="flex gap-1 p-3 border-b border-surface-border">
          {(["online", "offline"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? "bg-vibe-violet text-white" : "text-ink-soft hover:bg-cream-300"
              }`}
            >
              {t === "online" ? "Online Bookings" : "Offline Collections"}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-faint border-b border-surface-border">
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Listing Name</th>
                <th className="px-5 py-3 font-semibold">Order ID</th>
                <th className="px-5 py-3 font-semibold text-right">Total Amount</th>
                <th className="px-5 py-3 font-semibold text-right">Platform Fee</th>
                <th className="px-5 py-3 font-semibold text-right">Your Earning</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.orderId} className="border-b border-surface-border last:border-0 hover:bg-cream-200/40">
                  <td className="px-5 py-4 text-ink-soft">{new Date(p.date).toLocaleDateString("en-GB")}</td>
                  <td className="px-5 py-4 font-medium text-ink">{p.listingName}</td>
                  <td className="px-5 py-4 font-mono text-xs text-ink-soft">{p.orderId}</td>
                  <td className="px-5 py-4 text-right text-ink">
                    ₹{p.totalAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4 text-right text-ink-faint">
                    ₹{p.platformFee.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-vibe-limeDark">
                    ₹{p.yourEarning.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
              {loading && <EmptyRow text="Loading settlements..." />}
              {!loading && visible.length === 0 && (
                <EmptyRow text="No settlements yet — they will show up here once a payout is processed." />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <tr>
      <td colSpan={6} className="px-5 py-14 text-center text-sm text-ink-faint">
        {text}
      </td>
    </tr>
  );
}
