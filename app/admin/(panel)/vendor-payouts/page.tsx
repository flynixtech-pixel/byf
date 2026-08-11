"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Search, Wallet } from "lucide-react";
import { Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { getVendorPayoutBookings, listPayoutCategories, listVendorPayouts, PayoutBookingBreakdown } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { PayoutCategory, VendorPayout, VendorPayoutStatus } from "@/lib/api/types";

type Step = "category" | "vendor" | "bookings";

const STEPS: { id: Step; label: string }[] = [
  { id: "category", label: "Category" },
  { id: "vendor", label: "Vendor" },
  { id: "bookings", label: "Bookings" },
];

function vendorName(entry: VendorPayout) {
  return typeof entry.vendorId === "string" ? "Unknown vendor" : entry.vendorId.businessName;
}

export default function VendorPayoutsPage() {
  const [categories, setCategories] = useState<PayoutCategory[]>([]);
  const [entries, setEntries] = useState<VendorPayout[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [bookings, setBookings] = useState<PayoutBookingBreakdown[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [step, setStep] = useState<Step>("category");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<VendorPayout | null>(null);
  const [typeFilter, setTypeFilter] = useState<"All" | "Standard" | "Affiliate">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | VendorPayoutStatus>("All");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    listPayoutCategories()
      .then(setCategories)
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load categories"));
  }, []);

  useEffect(() => {
    if (!categoryId) return;
    setLoadingEntries(true);
    listVendorPayouts({ categoryId, limit: 100 })
      .then((result) => setEntries(result.items))
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load payouts"))
      .finally(() => setLoadingEntries(false));
  }, [categoryId]);

  useEffect(() => {
    if (!selectedEntry) return;
    setLoadingBookings(true);
    getVendorPayoutBookings(selectedEntry._id)
      .then(setBookings)
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load booking breakdown"))
      .finally(() => setLoadingBookings(false));
  }, [selectedEntry]);

  const category = categories.find((c) => c._id === categoryId);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesType = typeFilter === "All" || e.type === typeFilter;
      const matchesStatus = statusFilter === "All" || e.status === statusFilter;
      const matchesQuery = vendorName(e).toLowerCase().includes(query.toLowerCase());
      return matchesType && matchesStatus && matchesQuery;
    });
  }, [entries, typeFilter, statusFilter, query]);

  const totals = useMemo(() => {
    const totalVendors = new Set(entries.map((e) => (typeof e.vendorId === "string" ? e.vendorId : e.vendorId._id))).size;
    const settledBookings = entries.reduce((sum, e) => sum + e.bookingsCount, 0);
    const paidAmount = entries.filter((e) => e.status === "Paid").reduce((sum, e) => sum + e.amount, 0);
    return { totalVendors, settledBookings, paidAmount };
  }, [entries]);

  const goBack = useCallback(() => {
    if (step === "bookings") {
      setStep("vendor");
    } else {
      setStep("category");
      setCategoryId(null);
    }
  }, [step]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <Wallet size={20} className="text-vibe-violet" /> Vendor Payouts
          </h1>
          <p className="mt-0.5 text-xs text-ink-faint">All vendor payout history.</p>
        </div>
        {step !== "category" && (
          <button
            onClick={goBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3.5 py-2 text-sm font-semibold text-ink-soft hover:bg-cream-300"
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === s.id ? "bg-vibe-violet text-white" : STEPS.findIndex((x) => x.id === step) > i ? "bg-vibe-limeDark text-white" : "bg-cream-300 text-ink-faint"
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-xs font-semibold uppercase tracking-wide ${step === s.id ? "text-ink" : "text-ink-faint"}`}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="h-px w-8 bg-surface-border" />}
          </div>
        ))}
      </div>

      {step === "category" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => {
                setCategoryId(c._id);
                setStep("vendor");
              }}
              className="rounded-xl2 border border-surface-border bg-white p-5 text-left shadow-panel transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white ${c.color}`}>{c.letter}</span>
              <p className="mt-3 font-semibold text-ink">{c.name}</p>
              <p className="mt-1 text-xs text-ink-faint">{c.subtitle}</p>
              <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-vibe-violet">
                View Payouts <ArrowRight className="h-3.5 w-3.5" />
              </p>
            </button>
          ))}
          {categories.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-ink-faint">No payout categories yet.</p>
          )}
        </div>
      )}

      {step === "vendor" && category && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="Total Vendors" value={totals.totalVendors} />
            <StatTile label="Settled Bookings" value={totals.settledBookings} />
            <StatTile label="Paid Amount" value={`₹${totals.paidAmount.toLocaleString("en-IN")}`} tone="green" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["All", "Standard", "Affiliate"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold ${typeFilter === t ? "bg-ink text-white" : "bg-white text-ink-soft border border-surface-border"}`}
              >
                {t}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-surface-border" />
            {(["All", "Pending", "Processing", "Paid", "Failed", "Cancelled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold ${statusFilter === s ? "bg-vibe-violet text-white" : "bg-white text-ink-soft border border-surface-border"}`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vendor name..."
              className="w-full rounded-lg border border-surface-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-vibe-violet"
            />
          </div>

          <div className="overflow-x-auto rounded-xl2 border border-surface-border bg-white shadow-panel">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Type / Status</th>
                  <th className="px-4 py-3">Amount / Date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e) => (
                  <tr key={e._id} className="border-b border-surface-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{vendorName(e)}</p>
                      <p className="text-[11px] text-ink-faint">{e.bookingsCount} bookings</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge tone="info">{e.type}</Badge>
                        <Badge tone={e.status === "Paid" ? "success" : e.status === "Pending" ? "pending" : e.status === "Failed" || e.status === "Cancelled" ? "danger" : "neutral"}>
                          {e.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">₹{e.amount.toLocaleString("en-IN")}</p>
                      <p className="text-[11px] text-ink-faint">{new Date(e.createdAt).toLocaleDateString("en-GB")}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedEntry(e);
                          setStep("bookings");
                        }}
                        className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-300"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
                {loadingEntries && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-faint">
                      Loading payouts...
                    </td>
                  </tr>
                )}
                {!loadingEntries && filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-faint">
                      No payouts match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {step === "bookings" && selectedEntry && (
        <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
          <p className="font-display font-semibold text-ink">{vendorName(selectedEntry)}</p>
          <p className="mb-4 text-xs text-ink-faint">
            {selectedEntry.type} payout · {selectedEntry.status} · ₹{selectedEntry.amount.toLocaleString("en-IN")}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  <th className="pb-2">Order ID</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Listing</th>
                  <th className="pb-2">Owner Amount</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.orderId} className="border-b border-surface-border last:border-0">
                    <td className="py-2 font-mono text-xs text-ink-soft">{b.orderId}</td>
                    <td className="py-2 text-ink-soft">{b.customerName}</td>
                    <td className="py-2 text-ink-soft">{b.listingTitle}</td>
                    <td className="py-2 font-semibold text-ink">₹{b.vendorEarning.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                {loadingBookings && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-ink-faint">
                      Loading bookings...
                    </td>
                  </tr>
                )}
                {!loadingBookings && bookings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-ink-faint">
                      No individual booking breakdown available for this vendor yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function StatTile({ label, value, tone = "default" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-xl2 border border-surface-border bg-white p-4 shadow-panel">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${tone === "green" ? "text-vibe-limeDark" : "text-ink"}`}>{value}</p>
    </div>
  );
}
