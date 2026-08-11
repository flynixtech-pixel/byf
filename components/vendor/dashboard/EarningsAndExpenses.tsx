"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Wallet, Wrench, Home, Users, Package, TrendingUp, X } from "lucide-react";
import {
  createVendorExpense,
  deleteVendorExpense,
  getVendorExpenses,
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type VendorExpense,
} from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";

const CATEGORY_META: Record<ExpenseCategory, { icon: typeof Wrench; tint: string }> = {
  Maintenance: { icon: Wrench, tint: "bg-amber-50 text-amber-600" },
  Rent: { icon: Home, tint: "bg-blue-50 text-blue-600" },
  Salary: { icon: Users, tint: "bg-violet-50 text-violet-600" },
  Misc: { icon: Package, tint: "bg-slate-100 text-slate-500" },
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/**
 * "How much I earn with BYV" + venue running costs.
 *
 * Revenue comes from the dashboard stats (vendorEarning on settled bookings —
 * i.e. what BYV actually paid out), expenses from the vendor's own entries.
 */
export function EarningsAndExpenses({ byvEarnings }: { byvEarnings: number }) {
  const [expenses, setExpenses] = useState<VendorExpense[]>([]);
  const [byCategory, setByCategory] = useState<Partial<Record<ExpenseCategory, number>>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const [category, setCategory] = useState<ExpenseCategory>("Maintenance");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    try {
      const res = await getVendorExpenses();
      setExpenses(res.items);
      setByCategory(res.byCategory);
      setTotal(res.total);
    } catch {
      // Non-fatal — the earnings half of the card still renders.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getVendorExpenses()
      .then((res) => {
        setExpenses(res.items);
        setByCategory(res.byCategory);
        setTotal(res.total);
      })
      // Non-fatal — the earnings half of the card still renders.
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const netProfit = useMemo(() => byvEarnings - total, [byvEarnings, total]);

  async function handleAdd() {
    const value = Number(amount);
    if (!value || value <= 0) return;
    setSaving(true);
    try {
      await createVendorExpense({ category, amount: value, note: note.trim() || undefined });
      setAmount("");
      setNote("");
      setAddOpen(false);
      await refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.describe() : "Failed to add expense");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    try {
      await deleteVendorExpense(id);
      await refresh();
    } catch {
      alert("Failed to delete expense");
    }
  }

  return (
    <>
      {/* ── How much I earn with BYV ── */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-600 to-emerald-700 p-4 text-white shadow-sm">
        <div className="flex items-center gap-2">
          <Wallet size={15} className="text-emerald-200" />
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-100">How much I earn with BYV</p>
        </div>
        <p className="mt-2 text-3xl font-black">{inr(byvEarnings)}</p>
        <p className="text-[10px] font-medium text-emerald-100/80">Paid out to you after platform fee &amp; taxes.</p>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/20 pt-3">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wide text-emerald-100/70">Expenses</p>
            <p className="text-sm font-black">{inr(total)}</p>
          </div>
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wide text-emerald-100/70">Net Profit</p>
            <p className={`text-sm font-black ${netProfit < 0 ? "text-rose-200" : "text-white"}`}>{inr(netProfit)}</p>
          </div>
        </div>
      </div>

      {/* ── Expenses ── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-rose-500" />
            <h2 className="text-sm font-extrabold text-slate-900">Expenses</h2>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-black text-white transition active:scale-95"
          >
            <Plus size={11} /> Add
          </button>
        </div>

        {/* Per-category totals */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {EXPENSE_CATEGORIES.map((c) => {
            const meta = CATEGORY_META[c];
            return (
              <div key={c} className="rounded-xl border border-slate-100 p-2 text-center">
                <span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg ${meta.tint}`}>
                  <meta.icon size={13} />
                </span>
                <p className="mt-1.5 text-[8px] font-bold uppercase tracking-wide text-slate-400">{c}</p>
                <p className="text-[11px] font-black text-slate-800">{inr(byCategory[c] ?? 0)}</p>
              </div>
            );
          })}
        </div>

        {/* Recent entries */}
        <div className="mt-3 space-y-1.5">
          {loading ? (
            <p className="py-4 text-center text-[10px] font-bold text-slate-400">Loading expenses…</p>
          ) : expenses.length === 0 ? (
            <p className="py-4 text-center text-[10px] font-bold text-slate-400">
              No expenses logged yet. Add rent, salary or maintenance to track real profit.
            </p>
          ) : (
            expenses.slice(0, 6).map((e) => {
              const meta = CATEGORY_META[e.category];
              return (
                <div key={e._id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.tint}`}>
                    <meta.icon size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-slate-800">
                      {e.category}
                      {e.note ? <span className="font-medium text-slate-400"> · {e.note}</span> : ""}
                    </p>
                    <p className="text-[9px] font-medium text-slate-400">
                      {new Date(e.spentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <p className="shrink-0 text-[11px] font-black text-slate-800">{inr(e.amount)}</p>
                  <button
                    onClick={() => handleDelete(e._id)}
                    aria-label="Delete expense"
                    className="shrink-0 rounded-lg p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add expense sheet */}
      {addOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[14px] font-black text-slate-900">Add Expense</h3>
              <button onClick={() => setAddOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <X size={14} />
              </button>
            </div>

            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Category</p>
            <div className="mb-3 grid grid-cols-4 gap-2">
              {EXPENSE_CATEGORIES.map((c) => {
                const meta = CATEGORY_META[c];
                const active = category === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`rounded-xl border p-2 text-center transition ${
                      active ? "border-slate-900 bg-slate-50" : "border-slate-200"
                    }`}
                  >
                    <span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg ${meta.tint}`}>
                      <meta.icon size={13} />
                    </span>
                    <p className="mt-1 text-[8px] font-black uppercase text-slate-600">{c}</p>
                  </button>
                );
              })}
            </div>

            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Amount (₹)</p>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-vibe-violet"
            />

            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Note (optional)</p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Floodlight repair"
              maxLength={200}
              className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-vibe-violet"
            />

            <button
              onClick={handleAdd}
              disabled={saving || !amount}
              className="w-full rounded-2xl bg-slate-900 py-3.5 text-[12px] font-black uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add Expense"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
