"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  Minus,
  PackageX,
  Plus,
  Store,
  TrendingDown,
} from "lucide-react";
import { PageHero, SectionCard, Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { listVendorMenu, listVendorOutlets, updateVendorMenuStock } from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import type { FoodOutlet, MenuItem } from "@/lib/api/types";

type StockState = "out" | "low" | "ok" | "untracked";

function stockState(item: MenuItem): StockState {
  if (!item.trackInventory) return "untracked";
  if (item.stockQty <= 0) return "out";
  if (item.stockQty <= item.lowStockThreshold) return "low";
  return "ok";
}

export default function VendorFoodInventoryPage() {
  const [outlets, setOutlets] = useState<FoodOutlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "tracked" | "low" | "out">("all");
  /** Ids currently mid-save, so their buttons disable without blocking the rest of the board. */
  const [busy, setBusy] = useState<Set<string>>(new Set());

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
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load inventory"))
      .finally(() => setLoading(false));
  }, [outletId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = useMemo(() => {
    const tracked = items.filter((i) => i.trackInventory);
    return {
      total: items.length,
      tracked: tracked.length,
      low: tracked.filter((i) => stockState(i) === "low").length,
      out: tracked.filter((i) => stockState(i) === "out").length,
    };
  }, [items]);

  const visible = useMemo(() => {
    if (filter === "tracked") return items.filter((i) => i.trackInventory);
    if (filter === "low") return items.filter((i) => stockState(i) === "low");
    if (filter === "out") return items.filter((i) => stockState(i) === "out");
    return items;
  }, [items, filter]);

  /** Optimistic patch — the board stays responsive while the save lands. */
  async function patch(item: MenuItem, input: Parameters<typeof updateVendorMenuStock>[1]) {
    setBusy((s) => new Set(s).add(item._id));
    setItems((list) => list.map((i) => (i._id === item._id ? { ...i, ...input } : i)));
    try {
      const updated = await updateVendorMenuStock(item._id, input);
      setItems((list) => list.map((i) => (i._id === item._id ? updated : i)));
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to update stock");
      refresh();
    } finally {
      setBusy((s) => {
        const next = new Set(s);
        next.delete(item._id);
        return next;
      });
    }
  }

  const activeOutlet = outlets.find((o) => o._id === outletId) ?? null;

  const SUMMARY = [
    { label: "Menu items", value: stats.total, icon: Boxes, tint: "text-vibe-violet" },
    { label: "Stock tracked", value: stats.tracked, icon: TrendingDown, tint: "text-emerald-600" },
    { label: "Low stock", value: stats.low, icon: AlertTriangle, tint: "text-amber-600" },
    { label: "Out of stock", value: stats.out, icon: PackageX, tint: "text-rose-600" },
  ];

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Food Owner"
        title="Inventory Tracking"
        description="Stock levels per dish. Orders draw stock down automatically; hitting zero pulls the dish off the menu."
        right={
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold">
            <Boxes size={16} /> {stats.tracked} Tracked
          </span>
        }
      />

      {outlets.length === 0 && !loading ? (
        <SectionCard title="No restaurant yet" description="Create a restaurant profile first — inventory lives inside it.">
          <Link
            href="/vendor/food/profile"
            className="inline-flex items-center gap-2 rounded-lg bg-vibe-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft"
          >
            <Store size={16} /> Create Restaurant Profile
          </Link>
        </SectionCard>
      ) : (
        outlets.length > 1 && (
          <div className="flex items-center gap-3 rounded-xl2 border border-surface-border bg-surface-card p-4 shadow-panel">
            <Store size={18} className="shrink-0 text-vibe-violet" />
            <div className="relative flex-1">
              <select
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-surface-border bg-white px-3 py-2.5 pr-9 text-sm font-semibold outline-none focus:border-vibe-violet"
              >
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
        )
      )}

      {activeOutlet && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SUMMARY.map((s) => (
              <div key={s.label} className="rounded-xl2 border border-surface-border bg-white p-4 shadow-panel">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className={`text-[10px] font-extrabold uppercase tracking-wider ${s.tint}`}>{s.label}</p>
                  <s.icon size={15} className={s.tint} />
                </div>
                <p className="text-2xl font-black text-ink">{s.value}</p>
              </div>
            ))}
          </div>

          {stats.low + stats.out > 0 && (
            <div className="flex items-center gap-3 rounded-xl2 border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle size={18} className="shrink-0 text-amber-600" />
              <p className="text-sm text-amber-900">
                <span className="font-semibold">
                  {stats.out > 0 && `${stats.out} item(s) sold out`}
                  {stats.out > 0 && stats.low > 0 && " · "}
                  {stats.low > 0 && `${stats.low} running low`}
                </span>{" "}
                — restock or they stay hidden from players.
              </p>
            </div>
          )}

          <SectionCard
            title={`Stock — ${activeOutlet.name}`}
            description="Turn on tracking for the dishes you count. Everything else keeps the simple in/out toggle."
          >
            <div className="mb-4 flex flex-wrap gap-2">
              {(
                [
                  { key: "all", label: `All (${stats.total})` },
                  { key: "tracked", label: `Tracked (${stats.tracked})` },
                  { key: "low", label: `Low (${stats.low})` },
                  { key: "out", label: `Out (${stats.out})` },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    filter === f.key ? "bg-vibe-violet text-white" : "border border-surface-border text-ink-soft hover:bg-cream-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="py-8 text-center text-sm text-ink-faint">Loading inventory…</p>
            ) : visible.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-faint">Nothing here — try another filter.</p>
            ) : (
              <div className="divide-y divide-surface-border rounded-xl border border-surface-border">
                {visible.map((item) => {
                  const state = stockState(item);
                  const saving = busy.has(item._id);
                  return (
                    <div key={item._id} className="flex flex-wrap items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                        <p className="text-xs text-ink-faint">
                          {item.category || "General"} · ₹{item.price}
                        </p>
                      </div>

                      {state === "untracked" ? (
                        <button
                          onClick={() => patch(item, { trackInventory: true, stockQty: 0, lowStockThreshold: 5 })}
                          disabled={saving}
                          className="rounded-lg border border-dashed border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-vibe-violet hover:text-vibe-violet disabled:opacity-60"
                        >
                          Track stock
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={state === "out" ? "danger" : state === "low" ? "pending" : "success"}>
                            {state === "out" ? "Sold out" : state === "low" ? "Low stock" : "In stock"}
                          </Badge>

                          <div className="flex items-center gap-1 rounded-lg border border-surface-border">
                            <button
                              onClick={() => patch(item, { stockQty: Math.max(0, item.stockQty - 1) })}
                              disabled={saving || item.stockQty <= 0}
                              aria-label={`Reduce ${item.name} stock`}
                              className="flex h-8 w-8 items-center justify-center text-ink-soft hover:bg-cream-300 disabled:opacity-40"
                            >
                              <Minus size={13} />
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={item.stockQty}
                              onChange={(e) =>
                                setItems((list) =>
                                  list.map((i) =>
                                    i._id === item._id ? { ...i, stockQty: Math.max(0, Number(e.target.value) || 0) } : i
                                  )
                                )
                              }
                              onBlur={(e) => patch(item, { stockQty: Math.max(0, Number(e.target.value) || 0) })}
                              aria-label={`${item.name} stock count`}
                              className="w-14 border-x border-surface-border bg-transparent py-1.5 text-center text-sm font-bold outline-none"
                            />
                            <button
                              onClick={() => patch(item, { stockQty: item.stockQty + 1 })}
                              disabled={saving}
                              aria-label={`Add ${item.name} stock`}
                              className="flex h-8 w-8 items-center justify-center text-ink-soft hover:bg-cream-300 disabled:opacity-40"
                            >
                              <Plus size={13} />
                            </button>
                          </div>

                          <label className="flex items-center gap-1.5 text-[11px] text-ink-faint">
                            Alert at
                            <input
                              type="number"
                              min={0}
                              value={item.lowStockThreshold}
                              onChange={(e) =>
                                setItems((list) =>
                                  list.map((i) =>
                                    i._id === item._id
                                      ? { ...i, lowStockThreshold: Math.max(0, Number(e.target.value) || 0) }
                                      : i
                                  )
                                )
                              }
                              onBlur={(e) =>
                                patch(item, { lowStockThreshold: Math.max(0, Number(e.target.value) || 0) })
                              }
                              className="w-12 rounded-lg border border-surface-border px-2 py-1 text-center text-xs font-semibold outline-none focus:border-vibe-violet"
                            />
                          </label>

                          <button
                            onClick={() => patch(item, { trackInventory: false, inStock: true })}
                            disabled={saving}
                            className="text-[11px] font-semibold text-ink-faint underline-offset-2 hover:text-vibe-coral hover:underline disabled:opacity-60"
                          >
                            Stop tracking
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
