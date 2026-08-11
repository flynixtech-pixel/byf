"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, QrCode, Search, Trash2, X } from "lucide-react";
import { Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { createVendor, deleteVendor, listVendors, updateVendor, updateVendorStatus, CreateVendorInput } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { Vendor, VendorStatus } from "@/lib/api/types";

type Tab = "all" | "onboarding";

const emptyDraft: CreateVendorInput = {
  ownerName: "",
  businessName: "",
  email: "",
  phone: "",
  state: "Rajasthan",
  city: "",
  password: "",
};

export default function VendorManagementPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("All States");
  const [statusFilter, setStatusFilter] = useState<"All Status" | VendorStatus>("All Status");
  const [qrVendor, setQrVendor] = useState<Vendor | null>(null);
  const [editVendor, setEditVendor] = useState<Vendor | "new" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listVendors({ limit: 100 })
      .then((result) => setVendors(result.items))
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load vendors"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const states = useMemo(() => ["All States", ...Array.from(new Set(vendors.map((v) => v.state)))], [vendors]);
  const pendingOnboarding = useMemo(() => vendors.filter((v) => v.status === "pending"), [vendors]);

  const filtered = useMemo(() => {
    const source = tab === "onboarding" ? pendingOnboarding : vendors;
    return source.filter((v) => {
      const matchesQuery =
        v.ownerName.toLowerCase().includes(query.toLowerCase()) || v.businessName.toLowerCase().includes(query.toLowerCase());
      const matchesState = stateFilter === "All States" || v.state === stateFilter;
      const matchesStatus = statusFilter === "All Status" || v.status === statusFilter;
      return matchesQuery && matchesState && matchesStatus;
    });
  }, [vendors, tab, pendingOnboarding, query, stateFilter, statusFilter]);

  async function toggleNotification(vendor: Vendor, key: keyof Vendor["notifications"]) {
    try {
      const updated = await updateVendor(vendor._id, { notifications: { [key]: !vendor.notifications[key] } });
      setVendors((prev) => prev.map((v) => (v._id === vendor._id ? updated : v)));
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to update notification");
    }
  }

  async function handleDelete(vendor: Vendor) {
    if (!window.confirm(`Remove vendor "${vendor.businessName}"?`)) return;
    try {
      await deleteVendor(vendor._id);
      setToast(`Removed ${vendor.businessName}`);
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to remove vendor");
    }
  }

  async function handleApprove(vendor: Vendor) {
    try {
      const updated = await updateVendorStatus(vendor._id, "approved");
      setVendors((prev) => prev.map((v) => (v._id === vendor._id ? updated : v)));
      setToast(`Approved ${vendor.businessName}`);
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to approve vendor");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">Vendor Management</h1>
        <p className="mt-0.5 text-xs text-ink-faint">Manage vendors, onboarding, admin CRM follow-ups, and commissions.</p>
      </div>

      <div className="inline-flex rounded-xl border border-surface-border bg-white p-1">
        {(["all", "onboarding"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === t ? "bg-vibe-violet text-white" : "text-ink-soft hover:bg-cream-300"}`}
          >
            {t === "all" ? "All Vendors" : `New Onboarding (${pendingOnboarding.length})`}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl2 border border-surface-border bg-white p-4 shadow-panel lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vendors..."
            className="w-full rounded-lg border border-surface-border bg-cream-200/40 py-2 pl-9 pr-3 text-sm outline-none focus:border-vibe-violet"
          />
        </div>
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="rounded-lg border border-surface-border bg-white px-3 py-2 text-sm">
          {states.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "All Status" | VendorStatus)}
          className="rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
        >
          <option>All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
        <button
          onClick={() => setEditVendor("new")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-vibe-violet px-4 py-2 text-sm font-semibold text-white hover:bg-vibe-violetSoft"
        >
          <Plus size={15} /> Add New Vendor
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-surface-border bg-white shadow-panel">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-border text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Notification Services</th>
              <th className="px-4 py-3">Actions</th>
              <th className="px-4 py-3">QR Code</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v._id} className="border-b border-surface-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink">{v.ownerName}</p>
                  <p className="text-xs text-ink-faint">{v.businessName}</p>
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  <p>{v.email}</p>
                  <p className="text-xs text-ink-faint">{v.phone}</p>
                </td>
                <td className="px-4 py-3">
                  {v.status === "approved" ? (
                    <Badge tone="success">approved</Badge>
                  ) : v.status === "suspended" ? (
                    <Badge tone="danger">suspended</Badge>
                  ) : (
                    <button onClick={() => handleApprove(v)} title="Click to approve">
                      <Badge tone="pending">pending</Badge>
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 text-xs text-ink-soft">
                    {(["email", "whatsapp", "offline"] as const).map((k) => (
                      <label key={k} className="flex items-center gap-1.5">
                        <input type="checkbox" checked={v.notifications[k]} onChange={() => toggleNotification(v, k)} className="accent-vibe-violet" />
                        {k[0].toUpperCase() + k.slice(1)}
                      </label>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setToast(`Viewing ${v.businessName}`)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-vibe-violet hover:bg-vibe-violet/10"
                      title="View"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => setEditVendor(v)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-cream-300"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-vibe-coral hover:bg-vibe-coral/10"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setQrVendor(v)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink/85"
                  >
                    <QrCode size={13} /> Generate QR
                  </button>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-faint">
                  Loading vendors...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-faint">
                  No vendors match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {qrVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setQrVendor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display font-semibold text-ink">QR Preview</p>
              <button onClick={() => setQrVendor(null)} className="text-ink-faint hover:text-ink">
                <X size={16} />
              </button>
            </div>
            <div
              className="mx-auto h-40 w-40 rounded-lg"
              style={{
                backgroundImage: "repeating-conic-gradient(#1c1b29 0% 25%, #fff 0% 50%)",
                backgroundSize: "20px 20px",
              }}
            />
            <p className="mt-3 text-sm font-semibold text-ink">{qrVendor.businessName}</p>
            <p className="text-xs text-ink-faint">Demo preview only — not a scannable code.</p>
          </div>
        </div>
      )}

      {editVendor && (
        <VendorModal
          vendor={editVendor === "new" ? null : editVendor}
          onClose={() => setEditVendor(null)}
          onSave={async (draft) => {
            try {
              if (editVendor !== "new" && editVendor) {
                const updated = await updateVendor(editVendor._id, {
                  ownerName: draft.ownerName,
                  businessName: draft.businessName,
                  email: draft.email,
                  phone: draft.phone,
                });
                setVendors((prev) => prev.map((v) => (v._id === updated._id ? updated : v)));
                setToast(`Updated ${updated.businessName}`);
              } else {
                await createVendor(draft);
                setToast(`Added ${draft.businessName}`);
                refresh();
              }
              setEditVendor(null);
            } catch (err) {
              setToast(err instanceof ApiError ? err.describe() : "Failed to save vendor");
            }
          }}
        />
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function VendorModal({
  vendor,
  onClose,
  onSave,
}: {
  vendor: Vendor | null;
  onClose: () => void;
  onSave: (v: CreateVendorInput) => void;
}) {
  const [draft, setDraft] = useState<CreateVendorInput>(
    vendor
      ? { ...emptyDraft, ownerName: vendor.ownerName, businessName: vendor.businessName, email: vendor.email, phone: vendor.phone, state: vendor.state, city: vendor.city ?? "" }
      : emptyDraft
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display font-semibold text-ink">{vendor ? "Edit Vendor" : "Add New Vendor"}</p>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={draft.businessName}
            onChange={(e) => setDraft({ ...draft, businessName: e.target.value })}
            placeholder="Business name"
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
          />
          <input
            value={draft.ownerName}
            onChange={(e) => setDraft({ ...draft, ownerName: e.target.value })}
            placeholder="Contact person"
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
          />
          <input
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            placeholder="Email"
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
          />
          <input
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            placeholder="Phone (10-digit)"
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
          />
          <input
            value={draft.state}
            onChange={(e) => setDraft({ ...draft, state: e.target.value })}
            placeholder="State"
            className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
          />
          {!vendor && (
            <input
              type="password"
              value={draft.password}
              onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              placeholder="Temporary password"
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
            />
          )}
        </div>
        <button
          onClick={() => draft.businessName.trim() && onSave(draft)}
          className="mt-5 w-full rounded-lg bg-vibe-violet py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft"
        >
          Save Vendor
        </button>
      </div>
    </div>
  );
}
