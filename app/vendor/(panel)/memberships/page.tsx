"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Plus, Trash2, UserPlus, X } from "lucide-react";
import { PageHero, SectionCard, Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import {
  createMembership,
  createSubscription,
  deleteMembership,
  getVendorListings,
  listMemberships,
  listSubscriptions,
  updateSubscriptionStatus,
  CreateMembershipInput,
} from "@/lib/api/vendor";
import { apiListingToMock } from "@/lib/api/listingAdapter";
import { ApiError } from "@/lib/api/client";
import { Membership, MembershipPlanType, Subscription, SubscriptionStatus } from "@/lib/api/types";
import type { Listing } from "@/lib/types";

const emptyDraft: CreateMembershipInput = {
  listingId: undefined,
  name: "",
  description: "",
  planType: "duration",
  price: 0,
  durationDays: 30,
  sessionsIncluded: undefined,
};

const SUB_TONE: Record<SubscriptionStatus, "success" | "neutral" | "danger"> = {
  active: "success",
  expired: "neutral",
  cancelled: "danger",
};

export default function MembershipsPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [turfs, setTurfs] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<CreateMembershipInput>(emptyDraft);
  const [saving, setSaving] = useState(false);
  /** Enroll sheet open state; `plan` preselects one, null lets the vendor pick. */
  const [enroll, setEnroll] = useState<{ plan: Membership | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    Promise.all([listMemberships(), listSubscriptions()])
      .then(([m, s]) => {
        setMemberships(m);
        setSubscriptions(s);
      })
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load memberships"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    getVendorListings()
      .then((l) => setTurfs(l.map(apiListingToMock).filter((x) => x.type === "Turf")))
      .catch(() => {});
  }, [refresh]);

  const turfName = (listingId?: string) => turfs.find((t) => t.id === listingId)?.title;

  async function handleCreate() {
    if (!draft.name.trim() || draft.price < 0) {
      setToast("Enter a plan name and a valid price.");
      return;
    }
    setSaving(true);
    try {
      await createMembership(draft);
      setToast(`Plan "${draft.name}" created`);
      setDraft(emptyDraft);
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to create plan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(m: Membership) {
    if (!window.confirm(`Delete plan "${m.name}"?`)) return;
    try {
      await deleteMembership(m._id);
      setToast(`Deleted "${m.name}"`);
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to delete plan");
    }
  }

  async function handleSubStatus(sub: Subscription, status: SubscriptionStatus) {
    try {
      await updateSubscriptionStatus(sub._id, status);
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to update subscription");
    }
  }

  const activeCount = subscriptions.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Commerce"
        title="Membership Management"
        description="Create membership plans, sell packages, and track active and expired members."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold">
              <CreditCard size={16} /> {activeCount} Active Member(s)
            </span>
            <button
              onClick={() => setEnroll({ plan: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-vibe-violet shadow-md transition hover:bg-violet-50"
            >
              <UserPlus size={16} /> Add Member
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="Active BYV Partnership" description="Your current vendor subscription tier." className="lg:col-span-1">
          <div className="space-y-4 rounded-2xl bg-slate-900 p-5 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl" />
            <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-[10px] font-black uppercase text-emerald-400">
              Active Business Plan
            </span>
            <div>
              <h3 className="text-xl font-extrabold text-white">BYV Starter Partner</h3>
              <p className="text-xs text-slate-300 mt-1">Standard listing &amp; venue management tools.</p>
            </div>
            <div className="border-t border-slate-800 pt-3 space-y-2 text-xs font-semibold text-slate-300">
              <p className="flex items-center gap-2">✓ Direct Customer Bookings</p>
              <p className="flex items-center gap-2">✓ Venue Agenda &amp; Offline Logs</p>
              <p className="flex items-center gap-2">✓ Instant Bank Settlements</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="BYV Partnership Upgrade Tiers" description="Select a BYV partner membership to boost your venue visibility and bookings." className="lg:col-span-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border-2 border-emerald-500 bg-white p-5 shadow-md relative">
              <span className="absolute -top-3 right-4 rounded-full bg-emerald-500 px-3 py-0.5 text-[9px] font-extrabold uppercase text-white shadow">
                Current Plan
              </span>
              <p className="font-extrabold text-slate-900 text-base">Starter Partner</p>
              <p className="text-xs text-slate-500 mt-0.5">Free standard venue listing</p>
              <p className="mt-3 text-2xl font-black text-slate-900">₹0 <span className="text-xs text-slate-400 font-normal">/ month</span></p>
              <ul className="mt-4 space-y-2 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-1.5">✓ Standard Search Listing</li>
                <li className="flex items-center gap-1.5">✓ QR Ticket Scanner</li>
                <li className="flex items-center gap-1.5">✓ Standard Customer Support</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-500 transition">
              <p className="font-extrabold text-slate-900 text-base">Silver Growth Partner</p>
              <p className="text-xs text-slate-500 mt-0.5">Accelerate local venue bookings</p>
              <p className="mt-3 text-2xl font-black text-brand-600">₹1,499 <span className="text-xs text-slate-400 font-normal">/ month</span></p>
              <ul className="mt-4 space-y-2 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-1.5">✓ 1.5x Search Ranking Boost</li>
                <li className="flex items-center gap-1.5">✓ 2 Last-Minute Boosts / week</li>
                <li className="flex items-center gap-1.5">✓ Verified Badge on Venue Page</li>
                <li className="flex items-center gap-1.5">✓ Priority Support</li>
              </ul>
              <button
                onClick={() => setToast("Subscription upgrade request submitted to BYV Sales!")}
                className="mt-4 w-full rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-700 transition"
              >
                Upgrade to Silver
              </button>
            </div>

            <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/30 p-5 shadow-md relative">
              <span className="absolute -top-3 right-4 rounded-full bg-amber-500 px-3 py-0.5 text-[9px] font-extrabold uppercase text-white shadow">
                Recommended
              </span>
              <p className="font-extrabold text-slate-900 text-base">Gold Premier Partner</p>
              <p className="text-xs text-slate-500 mt-0.5">Maximum bookings &amp; premium placement</p>
              <p className="mt-3 text-2xl font-black text-amber-600">₹2,999 <span className="text-xs text-slate-400 font-normal">/ month</span></p>
              <ul className="mt-4 space-y-2 text-xs text-slate-700 font-semibold">
                <li className="flex items-center gap-1.5">✓ 3x Search Ranking Boost</li>
                <li className="flex items-center gap-1.5">✓ Unlimited Last-Minute Boosts</li>
                <li className="flex items-center gap-1.5">✓ Featured Homepage Banner</li>
                <li className="flex items-center gap-1.5">✓ Dedicated Account Manager</li>
              </ul>
              <button
                onClick={() => setToast("Subscription upgrade request submitted to BYV Sales!")}
                className="mt-4 w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-white hover:bg-amber-600 transition shadow"
              >
                Upgrade to Gold
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-400 transition">
              <p className="font-extrabold text-slate-900 text-base">Platinum Enterprise</p>
              <p className="text-xs text-slate-500 mt-0.5">Multi-turf chains &amp; sports complexes</p>
              <p className="mt-3 text-2xl font-black text-slate-900">₹5,999 <span className="text-xs text-slate-400 font-normal">/ month</span></p>
              <ul className="mt-4 space-y-2 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-1.5">✓ Multi-Venue Management</li>
                <li className="flex items-center gap-1.5">✓ AI Peak Hour Price Optimizer</li>
                <li className="flex items-center gap-1.5">✓ Guaranteed Top Spot in City</li>
              </ul>
              <button
                onClick={() => setToast("Subscription upgrade request submitted to BYV Sales!")}
                className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Members"
        description="Everyone subscribed to one of your plans."
        action={
          <button
            onClick={() => setEnroll({ plan: null })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-vibe-violet px-3 py-2 text-xs font-semibold text-white hover:bg-vibe-violetSoft"
          >
            <UserPlus size={13} /> Add Member
          </button>
        }
      >
        <div className="divide-y divide-surface-border">
          {subscriptions.map((s) => (
            <div key={s._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium text-ink text-sm">{s.customerName}</p>
                <p className="text-xs text-ink-faint">
                  {typeof s.membershipId === "string" ? "Plan" : s.membershipId.name} · {s.phone} · ₹{s.amountPaid.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={SUB_TONE[s.status]}>{s.status}</Badge>
                {s.status === "active" && (
                  <button
                    onClick={() => handleSubStatus(s, "cancelled")}
                    className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
          {!loading && subscriptions.length === 0 && <p className="py-8 text-center text-sm text-ink-faint">No members yet.</p>}
        </div>
      </SectionCard>

      {enroll && (
        <EnrollModal
          memberships={memberships.filter((m) => m.status === "Active")}
          initial={enroll.plan}
          turfName={turfName}
          onClose={() => setEnroll(null)}
          onEnrolled={() => {
            setEnroll(null);
            refresh();
          }}
        />
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function EnrollModal({
  memberships,
  initial,
  turfName,
  onClose,
  onEnrolled,
}: {
  memberships: Membership[];
  /** Plan to preselect; null lets the vendor pick one in the modal. */
  initial: Membership | null;
  turfName: (listingId?: string) => string | undefined;
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const [planId, setPlanId] = useState(initial?._id ?? memberships[0]?._id ?? "");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const plan = memberships.find((m) => m._id === planId) ?? null;
  const [amountPaid, setAmountPaid] = useState(String(initial?.price ?? memberships[0]?.price ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectPlan(id: string) {
    setPlanId(id);
    const next = memberships.find((m) => m._id === id);
    if (next) setAmountPaid(String(next.price));
  }

  async function handleSubmit() {
    if (!plan) {
      setError("Pick a membership plan first.");
      return;
    }
    if (!customerName.trim() || !/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter the member's full name and a valid 10-digit phone number.");
      return;
    }
    setSaving(true);
    try {
      await createSubscription({ membershipId: plan._id, customerName: customerName.trim(), phone, amountPaid: Number(amountPaid) || 0 });
      onEnrolled();
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Failed to enroll member");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display font-semibold text-ink">Add Member</p>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          {error && <p className="text-xs text-vibe-coral">{error}</p>}
          {memberships.length === 0 ? (
            <p className="text-sm text-ink-faint">Create a membership plan first, then add members to it.</p>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-1.5">Membership Plan</label>
              <select
                value={planId}
                onChange={(e) => selectPlan(e.target.value)}
                className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet"
              >
                {memberships.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} — ₹{m.price.toLocaleString("en-IN")}
                    {turfName(m.listingId) ? ` (${turfName(m.listingId)})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Input label="Full Name" value={customerName} onChange={setCustomerName} placeholder="Aarav Mehta" />
          <Input label="Phone Number" value={phone} onChange={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))} placeholder="9812345670" />
          <Input label="Amount Paid (₹)" value={amountPaid} onChange={(v) => setAmountPaid(v.replace(/\D/g, ""))} placeholder={plan ? String(plan.price) : "0"} />
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || memberships.length === 0}
          className="mt-5 w-full rounded-lg bg-vibe-violet py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
        >
          {saving ? "Adding member..." : "Add Member"}
        </button>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet placeholder:text-ink-faint"
      />
    </div>
  );
}
