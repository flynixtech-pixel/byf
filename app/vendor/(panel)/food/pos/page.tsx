"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeIndianRupee,
  Check,
  ChevronDown,
  Download,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Toast } from "@/components/admin/Toast";
import { createVendorCounterOrder, listVendorMenu, listVendorOutlets } from "@/lib/api/vendor";
import { downloadFoodOrderTicket } from "@/lib/ticket";
import { ApiError } from "@/lib/api/client";
import type { FoodOrder, FoodOutlet, MenuItem } from "@/lib/api/types";

/** GST slab on restaurant food bills — mirrors the rate the server charges. */
const GST_RATE = 5;

const PAY_METHODS = ["Cash", "UPI", "Card", "Other"] as const;
type PayMethod = (typeof PAY_METHODS)[number];

/** A dish with variants counts as a separate bill line per size. */
function lineKey(menuItemId: string, variantLabel?: string) {
  return `${menuItemId}|${variantLabel ?? ""}`;
}

/**
 * Billing Slide / POS — the counter screen the Food Owner rings walk-ins up on.
 *
 * It pulls the live menu, builds a bill, and pushes the sale through the same
 * order pipeline as app orders, so counter takings land in the food revenue
 * dashboard alongside everything else. Bills carry GST and no packaging fee.
 */
export default function VendorFoodPosPage() {
  const [outlets, setOutlets] = useState<FoodOutlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("Cash");
  const [variantPickerFor, setVariantPickerFor] = useState<MenuItem | null>(null);
  const [billing, setBilling] = useState(false);
  const [lastBill, setLastBill] = useState<FoodOrder | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    listVendorOutlets()
      .then((list) => {
        setOutlets(list);
        if (list.length >= 1) setOutletId(list[0]!._id);
        else setLoading(false);
      })
      .catch((err) => {
        setToast(err instanceof ApiError ? err.describe() : "Failed to load restaurants");
        setLoading(false);
      });
  }, []);

  const refresh = useCallback(() => {
    if (!outletId) return;
    listVendorMenu({ outletId })
      .then(setItems)
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load menu"))
      .finally(() => setLoading(false));
  }, [outletId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Switching restaurants abandons the half-built bill — it was priced off the old menu. */
  function changeOutlet(id: string) {
    setOutletId(id);
    setCart({});
    setActiveCategory("All");
    setSearch("");
  }

  const activeOutlet = outlets.find((o) => o._id === outletId) ?? null;

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category || "General"));
    return ["All", ...Array.from(set).sort()];
  }, [items]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (activeCategory !== "All" && (i.category || "General") !== activeCategory) return false;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, activeCategory]);

  const billLines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([key, quantity]) => {
          const [menuItemId, variantLabel] = key.split("|");
          const item = items.find((i) => i._id === menuItemId);
          if (!item) return null;
          const price =
            variantLabel && item.priceVariants.length > 0
              ? item.priceVariants.find((v) => v.label === variantLabel)?.price ?? item.price
              : item.price;
          return { key, menuItemId: menuItemId!, variantLabel: variantLabel || undefined, quantity, item, price };
        })
        .filter(Boolean) as {
        key: string;
        menuItemId: string;
        variantLabel?: string;
        quantity: number;
        item: MenuItem;
        price: number;
      }[],
    [cart, items]
  );

  const subtotal = useMemo(() => billLines.reduce((sum, l) => sum + l.price * l.quantity, 0), [billLines]);
  const taxAmount = Math.round((subtotal * GST_RATE) / 100);
  const grandTotal = subtotal + taxAmount;
  const itemCount = billLines.reduce((n, l) => n + l.quantity, 0);

  function bump(key: string, delta: number) {
    setCart((c) => ({ ...c, [key]: Math.max(0, (c[key] ?? 0) + delta) }));
  }

  function itemQty(item: MenuItem) {
    return Object.entries(cart).reduce((sum, [key, qty]) => (key.startsWith(`${item._id}|`) ? sum + qty : sum), 0);
  }

  function handleAdd(item: MenuItem) {
    if (item.priceVariants.length > 0) setVariantPickerFor(item);
    else bump(lineKey(item._id), 1);
  }

  function clearBill() {
    setCart({});
    setCustomerName("");
    setPhone("");
  }

  async function handleGenerateBill() {
    if (!outletId || billLines.length === 0 || billing) return;
    setBilling(true);
    try {
      const order = await createVendorCounterOrder({
        outletId,
        items: billLines.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          variantLabel: l.variantLabel,
        })),
        customerName: customerName.trim() || undefined,
        phone: phone.trim() || undefined,
        paymentMethod: payMethod,
        paymentStatus: "Paid",
      });
      setLastBill(order);
      setCartOpen(false);
      clearBill();
      // Stock counts move when the sale lands, so pull the menu fresh.
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to create bill");
    } finally {
      setBilling(false);
    }
  }

  function handleDownloadBill() {
    if (!lastBill) return;
    downloadFoodOrderTicket({
      ...lastBill,
      outletName: activeOutlet?.name,
      paymentMethod: `Paid via ${lastBill.paymentMethod ?? payMethod}`,
      subtotal: lastBill.subtotal,
      taxAmount: lastBill.taxAmount,
    });
  }

  /* ------------------------------ Bill panel ------------------------------ */

  const billPanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-vibe-violet">
          <Receipt size={13} /> Current Bill
        </p>
        <div className="flex items-center gap-2">
          {billLines.length > 0 && (
            <button
              onClick={clearBill}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-faint hover:text-vibe-coral"
            >
              <Trash2 size={12} /> Clear
            </button>
          )}
          <button
            onClick={() => setCartOpen(false)}
            aria-label="Close bill"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint hover:bg-cream-300 lg:hidden"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {billLines.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cream-300 text-ink-faint">
              <ShoppingBag size={20} />
            </div>
            <p className="text-sm text-ink-faint">Tap dishes to start a bill.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {billLines.map((line) => (
              <div key={line.key} className="flex items-center gap-2 rounded-xl border border-surface-border p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{line.item.name}</p>
                  <p className="text-[11px] text-ink-faint">
                    {line.variantLabel ? `${line.variantLabel} · ` : ""}₹{line.price} each
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-lg border border-surface-border">
                  <button
                    onClick={() => bump(line.key, -1)}
                    aria-label={`Reduce ${line.item.name}`}
                    className="flex h-7 w-7 items-center justify-center text-ink-soft hover:bg-cream-300"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-ink">{line.quantity}</span>
                  <button
                    onClick={() => bump(line.key, 1)}
                    aria-label={`Add ${line.item.name}`}
                    className="flex h-7 w-7 items-center justify-center text-ink-soft hover:bg-cream-300"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <span className="w-16 shrink-0 text-right text-sm font-bold text-ink">
                  ₹{(line.price * line.quantity).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-surface-border px-4 py-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name (optional)"
            className="rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet placeholder:text-ink-faint"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Phone (optional)"
            inputMode="numeric"
            className="rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet placeholder:text-ink-faint"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {PAY_METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setPayMethod(m)}
              className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                payMethod === m ? "bg-vibe-violet text-white" : "border border-surface-border text-ink-soft hover:bg-cream-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-1.5 rounded-xl bg-cream-200/60 p-3 text-xs">
          <div className="flex justify-between text-ink-soft">
            <span>Subtotal ({itemCount} item{itemCount === 1 ? "" : "s"})</span>
            <span className="font-semibold text-ink">₹{subtotal.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-ink-soft">
            <span>GST @ {GST_RATE}%</span>
            <span className="font-semibold text-ink">₹{taxAmount.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between border-t border-surface-border pt-1.5 text-sm font-bold text-ink">
            <span>Total</span>
            <span className="text-vibe-violet">₹{grandTotal.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <button
          onClick={handleGenerateBill}
          disabled={billLines.length === 0 || billing}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-vibe-violet py-3.5 text-sm font-bold text-white transition hover:bg-vibe-violetSoft disabled:opacity-50"
        >
          <BadgeIndianRupee size={16} />
          {billing ? "Billing…" : `Generate Bill · ₹${grandTotal.toLocaleString("en-IN")}`}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-vibe-indigo via-vibe-violet to-vibe-violetSoft p-5 text-white shadow-pop">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-vibe-lime/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-vibe-lime shadow-[0_0_8px_rgba(190,242,100,0.9)]" /> Counter
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold leading-tight">Billing Slide / POS</h1>
            <p className="text-xs text-white/70">
              Ring up walk-ins against the live menu. Every bill carries GST and feeds the food revenue dashboard.
            </p>
          </div>
          {outlets.length > 1 && (
            <div className="relative">
              <select
                value={outletId}
                onChange={(e) => changeOutlet(e.target.value)}
                className="appearance-none rounded-xl bg-white/15 px-4 py-2.5 pr-9 text-sm font-semibold text-white outline-none backdrop-blur-sm [&>option]:text-ink"
              >
                {outlets.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/70" />
            </div>
          )}
        </div>
      </div>

      {outlets.length === 0 && !loading ? (
        <div className="rounded-xl2 border border-surface-border bg-white p-6 shadow-panel">
          <p className="mb-3 text-sm text-ink-soft">Create a restaurant profile first — the POS bills against its menu.</p>
          <Link
            href="/vendor/food/profile"
            className="inline-flex items-center gap-2 rounded-lg bg-vibe-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft"
          >
            <Store size={16} /> Create Restaurant Profile
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          {/* Menu grid */}
          <div className="rounded-xl2 border border-surface-border bg-white shadow-panel">
            <div className="border-b border-surface-border p-4">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search the menu…"
                  className="w-full rounded-lg border border-surface-border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-vibe-violet placeholder:text-ink-faint"
                />
              </div>
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setActiveCategory(c)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      activeCategory === c
                        ? "bg-vibe-violet text-white"
                        : "border border-surface-border text-ink-soft hover:bg-cream-300"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              {loading ? (
                <p className="py-12 text-center text-sm text-ink-faint">Loading menu…</p>
              ) : visibleItems.length === 0 ? (
                <p className="py-12 text-center text-sm text-ink-faint">
                  {items.length === 0 ? "No dishes on this menu yet." : "No dishes match that search."}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                  {visibleItems.map((item) => {
                    const qty = itemQty(item);
                    const soldOut = !item.inStock || (item.trackInventory && item.stockQty <= 0);
                    return (
                      <button
                        key={item._id}
                        onClick={() => !soldOut && handleAdd(item)}
                        disabled={soldOut}
                        className={`relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                          soldOut
                            ? "cursor-not-allowed border-surface-border opacity-45"
                            : qty > 0
                              ? "border-vibe-violet bg-vibe-violet/5"
                              : "border-surface-border hover:border-vibe-violet hover:bg-cream-200/50"
                        }`}
                      >
                        {qty > 0 && (
                          <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-vibe-violet px-1 text-[10px] font-bold text-white">
                            {qty}
                          </span>
                        )}
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream-200 text-ink-faint">
                          <UtensilsCrossed size={14} />
                        </span>
                        <span className="line-clamp-2 text-xs font-semibold leading-tight text-ink">{item.name}</span>
                        <span className="text-xs font-bold text-vibe-violet">
                          {item.priceVariants.length > 0 ? `from ₹${item.price}` : `₹${item.price}`}
                        </span>
                        {soldOut && <span className="text-[10px] font-bold uppercase text-vibe-coral">Sold out</span>}
                        {!soldOut && item.trackInventory && (
                          <span className="text-[10px] font-semibold text-ink-faint">{item.stockQty} left</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bill — sticky pane on desktop, bottom sheet on mobile */}
          <div className="hidden lg:block">
            <div className="sticky top-4 h-[calc(100vh-2rem)] overflow-hidden rounded-xl2 border border-surface-border bg-white shadow-panel">
              {billPanel}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bill bar */}
      {billLines.length > 0 && !cartOpen && (
        <div className="fixed inset-x-0 bottom-16 z-30 px-4 lg:hidden">
          <button
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-vibe-violet px-5 py-3.5 text-white shadow-pop"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <Receipt size={16} /> {itemCount} item{itemCount === 1 ? "" : "s"}
            </span>
            <span className="text-sm font-black">₹{grandTotal.toLocaleString("en-IN")} · Bill</span>
          </button>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setCartOpen(false)}>
          <div
            className="max-h-[88vh] w-full overflow-hidden rounded-t-3xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-[88vh] flex-col">{billPanel}</div>
          </div>
        </div>
      )}

      {/* Variant picker */}
      {variantPickerFor && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">{variantPickerFor.name}</h3>
                <p className="text-xs text-ink-faint">Pick a size</p>
              </div>
              <button
                onClick={() => setVariantPickerFor(null)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-300 text-ink-faint"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {variantPickerFor.priceVariants.map((v) => (
                <button
                  key={v.label}
                  onClick={() => {
                    bump(lineKey(variantPickerFor._id, v.label), 1);
                    setVariantPickerFor(null);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-surface-border px-4 py-3 text-left transition hover:border-vibe-violet hover:bg-vibe-violet/5"
                >
                  <span className="text-sm font-semibold text-ink">{v.label}</span>
                  <span className="text-sm font-bold text-vibe-violet">₹{v.price}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bill generated */}
      {lastBill && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check size={28} strokeWidth={3} />
            </div>
            <h2 className="mt-3 font-display text-xl font-semibold text-ink">Bill Generated</h2>
            <p className="mt-1 text-xs text-ink-faint">Counter sale recorded and added to today&apos;s food revenue.</p>

            <div className="mt-4 space-y-2 rounded-2xl bg-cream-200/60 p-4 text-left text-xs">
              <Row label="Bill No." value={lastBill.billNo ?? lastBill.orderId} mono />
              <Row label="Customer" value={lastBill.customerName} />
              <Row label="Items" value={String(lastBill.items.length)} />
              <Row label="Subtotal" value={`₹${(lastBill.subtotal ?? 0).toLocaleString("en-IN")}`} />
              <Row label={`GST @ ${lastBill.gstRate ?? GST_RATE}%`} value={`₹${(lastBill.taxAmount ?? 0).toLocaleString("en-IN")}`} />
              <div className="flex justify-between border-t border-surface-border pt-2 text-sm font-bold text-ink">
                <span>Total paid</span>
                <span className="text-vibe-violet">₹{lastBill.totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadBill}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-surface-border px-4 py-3 text-xs font-bold text-ink-soft hover:bg-cream-200"
              >
                <Download size={14} /> Bill
              </button>
              <button
                onClick={() => setLastBill(null)}
                className="rounded-xl bg-vibe-violet px-4 py-3 text-xs font-bold text-white hover:bg-vibe-violetSoft"
              >
                New Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-faint">{label}</span>
      <span className={`font-semibold text-ink ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
