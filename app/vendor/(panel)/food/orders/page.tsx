"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ClipboardList, Clock, MapPin, QrCode, ScanLine, Store, X } from "lucide-react";
import { PageHero, Badge } from "@/components/vendor/ui";
import { QrScannerModal } from "@/components/vendor/bookings/QrScannerModal";
import {
  checkInVendorFoodOrder,
  getVendorFoodOrder,
  getVendorFoodOrders,
  listVendorOutlets,
  updateVendorFoodOrderStatus,
} from "@/lib/api/vendor";
import { ORDER_TYPE_LABELS } from "@/lib/foodTaxonomy";
import { ApiError } from "@/lib/api/client";
import { FoodOrder, FoodOrderStatus, FoodOutlet } from "@/lib/api/types";

const STATUS_TONE: Record<FoodOrderStatus, "success" | "pending" | "danger" | "info" | "neutral"> = {
  Pending: "pending",
  Accepted: "info",
  Rejected: "danger",
  Preparing: "info",
  Ready: "success",
  Delivered: "success",
  Cancelled: "neutral",
};

const STATUS_FILTERS: ("All" | FoodOrderStatus)[] = [
  "All",
  "Pending",
  "Accepted",
  "Preparing",
  "Ready",
  "Delivered",
  "Rejected",
  "Cancelled",
];

const SCOPES = [
  { key: "upcoming", label: "Upcoming Orders", hint: "Still in the kitchen" },
  { key: "history", label: "Order History", hint: "Delivered, rejected & cancelled" },
  { key: "all", label: "All Orders", hint: "Everything, every turf" },
] as const;

type Scope = (typeof SCOPES)[number]["key"];

export default function VendorFoodOrdersPage() {
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [outlets, setOutlets] = useState<FoodOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("upcoming");
  const [status, setStatus] = useState<"All" | FoodOrderStatus>("All");
  /** Empty means every turf — the default the owner wants to land on. */
  const [outletId, setOutletId] = useState("");
  const [scanOrderId, setScanOrderId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  /** Order pulled up by a scan — shown in full before it's marked delivered. */
  const [detail, setDetail] = useState<FoodOrder | null>(null);
  const [delivering, setDelivering] = useState(false);

  useEffect(() => {
    listVendorOutlets()
      .then(setOutlets)
      .catch(() => setOutlets([]));
  }, []);

  const refresh = useCallback(() => {
    getVendorFoodOrders({
      status: status === "All" ? undefined : status,
      scope: scope === "all" ? undefined : scope,
      outletId: outletId || undefined,
      limit: 200,
    })
      .then((result) => setOrders(result.items))
      .catch((err) => setError(err instanceof ApiError ? err.describe() : "Failed to load orders"))
      .finally(() => setLoading(false));
  }, [status, scope, outletId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const outletName = useCallback(
    (id?: string) => outlets.find((o) => o._id === id)?.name ?? "—",
    [outlets]
  );

  /** Manual entry or scan — pull the order up and show it before handing anything over. */
  async function handleLookup(orderId: string) {
    if (!orderId.trim()) return;
    setScanning(true);
    setScanResult(null);
    try {
      const order = await getVendorFoodOrder(orderId.trim());
      setDetail(order);
    } catch (err) {
      setScanResult({ ok: false, message: err instanceof ApiError ? err.describe() : "Order not found" });
    } finally {
      setScanning(false);
    }
  }

  /**
   * Scanning a food-order QR opens the order details rather than silently closing it out —
   * the counter needs to see what to hand over first. Delivery is confirmed from the modal.
   */
  async function handleQrScan(orderId: string): Promise<string> {
    const order = await getVendorFoodOrder(orderId).catch((e) => {
      throw new Error(e instanceof ApiError ? e.describe() : "Order not found");
    });
    setDetail(order);
    return `${order.customerName} — ${order.items.length} item(s), ₹${order.totalAmount.toLocaleString("en-IN")}`;
  }

  async function handleMarkDelivered(orderId: string) {
    setDelivering(true);
    try {
      const order = await checkInVendorFoodOrder(orderId);
      setScanResult({ ok: true, message: `${order.customerName} — order marked delivered` });
      setDetail(null);
      setScanOrderId("");
      refresh();
    } catch (err) {
      setScanResult({ ok: false, message: err instanceof ApiError ? err.describe() : "Could not mark delivered" });
      setDetail(null);
    } finally {
      setDelivering(false);
    }
  }

  async function handleStatusChange(order: FoodOrder, next: FoodOrderStatus) {
    try {
      await updateVendorFoodOrderStatus(order.orderId, next);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Failed to update order");
    }
  }

  const activeScope = useMemo(() => SCOPES.find((s) => s.key === scope)!, [scope]);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Food Owner"
        title="Food orders"
        description="Upcoming orders and full history across all your turfs — accept, prepare and deliver."
        right={
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold">
            <ClipboardList size={16} /> {orders.length} Order(s)
          </span>
        }
      />

      {/* QR scan → order details → mark delivered */}
      <div className="rounded-xl2 border border-surface-border bg-white p-4 shadow-panel sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-vibe-violet">
            <QrCode size={13} /> QR Order Scan
          </p>
          <button
            onClick={() => setQrOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-vibe-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-vibe-navyDark"
          >
            <ScanLine size={14} /> Scan Ticket
          </button>
        </div>
        <p className="mt-0.5 text-xs text-ink-faint">
          Scan the QR on the customer&apos;s order ticket — you&apos;ll see the full order, then confirm delivery.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={scanOrderId}
            onChange={(e) => setScanOrderId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup(scanOrderId)}
            placeholder="e.g. BYV-MR7FB67W-1EFF26"
            className="flex-1 rounded-lg border border-surface-border px-3 py-2.5 font-mono text-sm outline-none focus:border-vibe-violet"
          />
          <button
            onClick={() => handleLookup(scanOrderId)}
            disabled={scanning}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-vibe-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
          >
            <CheckCircle2 size={15} /> {scanning ? "Looking up..." : "Look Up Order"}
          </button>
        </div>
        {scanResult && (
          <p className={`mt-2 text-xs font-semibold ${scanResult.ok ? "text-vibe-limeDark" : "text-vibe-coral"}`}>
            {scanResult.message}
          </p>
        )}
      </div>

      {/* Upcoming / History / All */}
      <div className="grid gap-2 sm:grid-cols-3">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            onClick={() => {
              setScope(s.key);
              setStatus("All");
            }}
            className={`rounded-xl2 border p-3 text-left transition ${
              scope === s.key
                ? "border-vibe-violet bg-vibe-violet/5"
                : "border-surface-border bg-white hover:bg-cream-200/50"
            }`}
          >
            <p className={`text-sm font-bold ${scope === s.key ? "text-vibe-violet" : "text-ink"}`}>{s.label}</p>
            <p className="text-[11px] text-ink-faint">{s.hint}</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl2 border border-surface-border bg-white shadow-panel">
        <div className="space-y-3 border-b border-surface-border p-4 sm:p-5">
          {/* Turf selector — "All turfs" is the default */}
          {outlets.length > 1 && (
            <div className="flex items-center gap-2">
              <Store size={15} className="shrink-0 text-vibe-violet" />
              <div className="relative flex-1 sm:max-w-xs">
                <select
                  value={outletId}
                  onChange={(e) => setOutletId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-surface-border bg-white px-3 py-2 pr-9 text-sm font-semibold outline-none focus:border-vibe-violet"
                >
                  <option value="">All turfs ({outlets.length})</option>
                  {outlets.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.name}
                      {o.location?.city ? ` — ${o.location.city}` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  status === s ? "bg-vibe-violet text-white" : "border border-surface-border text-ink-soft hover:bg-cream-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="px-5 py-3 text-xs text-vibe-coral">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-[11px] uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3 font-semibold">Order ID</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Turf</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Items</th>
                <th className="px-5 py-3 text-right font-semibold">Total</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id} className="border-b border-surface-border last:border-0 hover:bg-cream-200/40">
                  <td className="px-5 py-4">
                    <p className="font-mono text-xs font-semibold text-ink">{o.orderId}</p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">{new Date(o.createdAt).toLocaleString("en-GB")}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-ink">{o.customerName}</p>
                    <p className="text-[11px] text-ink-faint">{o.phone}</p>
                  </td>
                  <td className="px-5 py-4 text-xs text-ink-soft">{outletName(o.outletId)}</td>
                  <td className="px-5 py-4">
                    <span className="whitespace-nowrap text-[11px] font-semibold text-ink-soft">
                      {ORDER_TYPE_LABELS[o.orderType ?? "PostMatch"]}
                    </span>
                    {o.scheduledFor && (
                      <p className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-[10px] text-vibe-violet">
                        <Clock size={10} />
                        {new Date(o.scheduledFor).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                    {o.serveTo && (
                      <p className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-[10px] text-ink-faint">
                        <MapPin size={10} /> {o.serveTo}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-ink-soft">
                    {o.items.map((i, idx) => (
                      <p key={idx} className="whitespace-nowrap">
                        {i.name}
                        {i.variantLabel ? ` (${i.variantLabel})` : ""} ×{i.quantity}
                      </p>
                    ))}
                  </td>
                  <td className="px-5 py-4 text-right font-medium text-ink">₹{o.totalAmount.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-4">
                    <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {o.status === "Pending" && (
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleStatusChange(o, "Accepted")}
                          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-300"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleStatusChange(o, "Rejected")}
                          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-vibe-coral hover:bg-vibe-coral/10"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {o.status === "Accepted" && (
                      <button
                        onClick={() => handleStatusChange(o, "Preparing")}
                        className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-300"
                      >
                        Start Preparing
                      </button>
                    )}
                    {o.status === "Preparing" && (
                      <button
                        onClick={() => handleStatusChange(o, "Ready")}
                        className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-300"
                      >
                        Mark Ready
                      </button>
                    )}
                    {o.status === "Ready" && (
                      <button
                        onClick={() => setDetail(o)}
                        className="rounded-lg bg-vibe-violet px-3 py-1.5 text-xs font-semibold text-white hover:bg-vibe-violetSoft"
                      >
                        Mark Delivered
                      </button>
                    )}
                    {["Delivered", "Rejected", "Cancelled"].includes(o.status) && <span className="text-ink-faint">—</span>}
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center text-sm text-ink-faint">
                    Loading orders...
                  </td>
                </tr>
              )}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center text-sm text-ink-faint">
                    No {activeScope.label.toLowerCase()} match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {qrOpen && <QrScannerModal onClose={() => setQrOpen(false)} onCheckIn={handleQrScan} />}

      {detail && (
        <OrderDetailModal
          order={detail}
          outletName={outletName(detail.outletId)}
          busy={delivering}
          onClose={() => setDetail(null)}
          onDeliver={() => handleMarkDelivered(detail.orderId)}
        />
      )}
    </div>
  );
}

/** Full order behind a scanned QR — what to hand over, and the confirm-delivery action. */
function OrderDetailModal({
  order,
  outletName,
  busy,
  onClose,
  onDeliver,
}: {
  order: FoodOrder;
  outletName: string;
  busy: boolean;
  onClose: () => void;
  onDeliver: () => void;
}) {
  const closed = ["Delivered", "Rejected", "Cancelled"].includes(order.status);
  const subtotal = order.subtotal ?? order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 bg-vibe-navy px-5 py-4 text-white">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Scanned Order</p>
            <p className="truncate font-mono text-sm font-bold">{order.orderId}</p>
            <p className="text-[11px] text-white/70">
              {new Date(order.createdAt).toLocaleString("en-GB")} · {outletName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
            <span className="rounded-full bg-cream-300 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
              {ORDER_TYPE_LABELS[order.orderType ?? "PostMatch"]}
            </span>
            {order.paymentStatus && (
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  order.paymentStatus === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {order.paymentStatus}
                {order.paymentMethod ? ` · ${order.paymentMethod}` : ""}
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-surface-border p-3.5">
            <p className="text-sm font-bold text-ink">{order.customerName}</p>
            <p className="text-xs text-ink-faint">{order.phone}</p>
            {order.serveTo && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-vibe-violet">
                <MapPin size={12} /> Serve to {order.serveTo}
              </p>
            )}
            {order.scheduledFor && (
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-vibe-violet">
                <Clock size={12} /> Pickup at{" "}
                {new Date(order.scheduledFor).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            {order.notes && <p className="mt-1.5 text-xs italic text-ink-soft">“{order.notes}”</p>}
          </div>

          <div className="rounded-2xl border border-surface-border p-3.5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Hand over ({order.items.length} line{order.items.length === 1 ? "" : "s"})
            </p>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-vibe-violet/10 text-[11px] font-bold text-vibe-violet">
                      {item.quantity}×
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{item.name}</span>
                      {item.variantLabel && <span className="block text-[10px] text-ink-faint">{item.variantLabel}</span>}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold text-ink">
                    ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-1 border-t border-surface-border pt-3 text-xs">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal</span>
                <span className="font-semibold text-ink">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              {order.taxAmount !== undefined && (
                <div className="flex justify-between text-ink-soft">
                  <span>GST @ {order.gstRate ?? 5}%</span>
                  <span className="font-semibold text-ink">₹{order.taxAmount.toLocaleString("en-IN")}</span>
                </div>
              )}
              {!!order.packagingFee && (
                <div className="flex justify-between text-ink-soft">
                  <span>Packaging &amp; platform fee</span>
                  <span className="font-semibold text-ink">₹{order.packagingFee.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-surface-border pt-1.5 text-sm font-bold text-ink">
                <span>Total</span>
                <span className="text-vibe-violet">₹{order.totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-surface-border p-4">
          {closed ? (
            <p className="text-center text-xs font-semibold text-ink-faint">
              This order is already {order.status.toLowerCase()} — nothing left to hand over.
            </p>
          ) : (
            <button
              onClick={onDeliver}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-vibe-violet py-3.5 text-sm font-bold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
            >
              <CheckCircle2 size={16} /> {busy ? "Marking…" : "Confirm & Mark Delivered"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
