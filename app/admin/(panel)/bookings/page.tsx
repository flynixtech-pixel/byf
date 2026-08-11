"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { getAdminBookings } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { Booking, BookingStatus, PaymentStatus } from "@/lib/api/types";

const CSV_HEADERS = [
  "Order ID",
  "Customer",
  "Listing",
  "Event Date",
  "Payment Mode",
  "Paid Now",
  "Venue Balance",
  "Total Amount",
  "Platform Fee",
  "Taxes",
  "Affiliate Amt",
  "Vendor Earning",
  "Status",
  "Payment",
];

const STATUS_BADGE_TONE: Record<BookingStatus, "success" | "pending" | "danger" | "neutral"> = {
  Confirmed: "success",
  Pending: "pending",
  Cancelled: "danger",
  Completed: "neutral",
  "Part Paid": "pending",
};

const PAYMENT_BADGE_TONE: Record<PaymentStatus, "success" | "pending" | "danger"> = {
  paid: "success",
  pending: "pending",
  failed: "danger",
  refunded: "danger",
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All Status" | BookingStatus>("All Status");
  const [paymentFilter, setPaymentFilter] = useState<"All Payment" | PaymentStatus>("All Payment");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getAdminBookings({ status: statusFilter === "All Status" ? undefined : statusFilter, limit: 200 })
      .then((result) => {
        setBookings(result.items);
        setTotal(result.total);
      })
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load bookings"))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchesQuery =
        b.customerName.toLowerCase().includes(query.toLowerCase()) ||
        (b.listingTitle ?? "").toLowerCase().includes(query.toLowerCase()) ||
        b.orderId.toLowerCase().includes(query.toLowerCase());
      const matchesPayment = paymentFilter === "All Payment" || b.paymentStatus === paymentFilter;
      return matchesQuery && matchesPayment;
    });
  }, [bookings, query, paymentFilter]);

  const stats = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === "Confirmed").length;
    const pending = bookings.filter((b) => b.status === "Pending").length;
    const revenue = bookings.filter((b) => b.paymentStatus === "paid").reduce((sum, b) => sum + b.totalAmount, 0);
    return { confirmed, pending, revenue };
  }, [bookings]);

  const handleExport = useCallback(() => {
    const rows = filtered.map((b) => {
      const paid = b.paidAmount ?? b.totalAmount;
      const remaining = Math.max(0, b.totalAmount - paid);
      const isFull = b.paymentType === "full" || remaining === 0;
      return [
        b.orderId,
        b.customerName,
        b.listingTitle ?? "",
        new Date(b.dateTime).toLocaleDateString("en-GB"),
        isFull ? "Full Payment" : "Partial Payment",
        paid,
        remaining,
        b.totalAmount,
        b.platformFee,
        b.taxes,
        b.affiliateAmount,
        b.vendorEarning,
        b.status,
        b.paymentStatus,
      ];
    });
    const csv = [CSV_HEADERS, ...rows].map((r) => r.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookings-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast(`Exported ${filtered.length} bookings`);
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Bookings Management</h1>
          <p className="mt-0.5 text-xs text-ink-faint">Manage all listing bookings and payments.</p>
        </div>
        <Badge tone="info">
          Total: {total} | Results: {filtered.length}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Total" value={total.toLocaleString("en-IN")} />
        <StatTile label="Confirmed" value={stats.confirmed.toLocaleString("en-IN")} tone="green" />
        <StatTile label="Revenue" value={`₹${stats.revenue.toLocaleString("en-IN")}`} tone="violet" />
        <StatTile label="Pending" value={stats.pending.toLocaleString("en-IN")} tone="amber" />
      </div>

      <div className="flex flex-col gap-3 rounded-xl2 border border-surface-border bg-white p-4 shadow-panel lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by customer, listing, or order ID..."
            className="w-full rounded-lg border border-surface-border bg-cream-200/40 py-2 pl-9 pr-3 text-sm outline-none focus:border-vibe-violet"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "All Status" | BookingStatus)}
          className="rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
        >
          <option>All Status</option>
          <option>Confirmed</option>
          <option>Pending</option>
          <option>Cancelled</option>
          <option>Completed</option>
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as "All Payment" | PaymentStatus)}
          className="rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
        >
          <option>All Payment</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-lg bg-vibe-lime px-4 py-2 text-sm font-semibold text-vibe-indigo hover:bg-vibe-lime/90"
        >
          <Download size={15} /> Export
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-surface-border bg-white shadow-panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-border text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Listing</th>
              <th className="px-4 py-3">Event Date</th>
              <th className="px-4 py-3">Payment Mode</th>
              <th className="px-4 py-3">Paid Now</th>
              <th className="px-4 py-3">Venue Bal</th>
              <th className="px-4 py-3">Total Amount</th>
              <th className="px-4 py-3">Platform Fee</th>
              <th className="px-4 py-3">Vendor Earning</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const paid = b.paidAmount ?? b.totalAmount;
              const remaining = Math.max(0, b.totalAmount - paid);
              const isFull = b.paymentType === "full" || remaining === 0;

              return (
                <tr key={b._id} className="border-b border-surface-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">{b.orderId}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{b.customerName}</p>
                    <p className="text-xs text-ink-faint">{b.email}</p>
                    {b.isAffiliate && <Badge tone="info">Affiliate</Badge>}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{b.listingTitle}</td>
                  <td className="px-4 py-3 text-ink-faint">
                    {new Date(b.dateTime).toLocaleDateString("en-GB")}
                    <br />
                    <span className="text-[10px]">Booked {new Date(b.createdAt).toLocaleDateString("en-GB")}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={isFull ? "success" : "pending"}>
                      {isFull ? "Full Payment" : "Partial Payment"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">₹{paid.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 font-semibold text-rose-600">
                    {remaining > 0 ? `₹${remaining.toLocaleString("en-IN")}` : "₹0"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">₹{b.totalAmount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-vibe-coral">₹{b.platformFee.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 font-semibold text-ink">₹{b.vendorEarning.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_BADGE_TONE[b.status]}>
                      {b.status === "Part Paid" ? "Partially Paid" : b.status === "Confirmed" ? "Fully Paid" : b.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={PAYMENT_BADGE_TONE[b.paymentStatus]}>{b.paymentStatus}</Badge>
                  </td>
                </tr>
              );
            })}
            {loading && (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-sm text-ink-faint">
                  Loading bookings...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-sm text-ink-faint">
                  No bookings match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-surface-border px-4 py-3 text-xs text-ink-faint">
          <span>
            Showing 1-{filtered.length} of {total}
          </span>
        </div>
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

const TONE_CLASSES: Record<string, string> = {
  default: "text-ink",
  green: "text-vibe-limeDark",
  violet: "text-vibe-violet",
  amber: "text-vibe-amber",
};

function StatTile({ label, value, tone = "default" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl2 border border-surface-border bg-white p-4 shadow-panel">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${TONE_CLASSES[tone]}`}>{value}</p>
    </div>
  );
}
