"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHero, SectionCard, Badge } from "@/components/vendor/ui";
import { moduleMeta } from "@/lib/mock-data";
import { createVendorStaff, deleteVendorStaff, listVendorStaff } from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import { ModulePermissionKey, PermissionsMap, VendorStaff } from "@/lib/api/types";
import { ShieldCheck, ShieldPlus, Sparkles, Trash2, UserRoundPlus } from "lucide-react";

type PermState = Record<ModulePermissionKey, { view: boolean; create: boolean; edit: boolean; delete: boolean }>;

const emptyPermissions: PermState = {
  dashboard: { view: false, create: false, edit: false, delete: false },
  bookings: { view: false, create: false, edit: false, delete: false },
  listings: { view: false, create: false, edit: false, delete: false },
  earnings: { view: false, create: false, edit: false, delete: false },
  verification: { view: false, create: false, edit: false, delete: false },
  settings: { view: false, create: false, edit: false, delete: false },
  membership: { view: false, create: false, edit: false, delete: false },
  menu: { view: false, create: false, edit: false, delete: false },
  foodOrders: { view: false, create: false, edit: false, delete: false },
  coaches: { view: false, create: false, edit: false, delete: false },
  tournaments: { view: false, create: false, edit: false, delete: false },
};

/** How broad a module's access is under a preset — respects that module's own
 * allowed toggle set (e.g. "dashboard" only ever supports "view"). */
type AccessLevel = "full" | "operate" | "editView" | "view" | "none";

function buildPreset(levels: Partial<Record<ModulePermissionKey, AccessLevel>>): PermState {
  const result = { ...emptyPermissions };
  for (const mod of moduleMeta) {
    const level = levels[mod.key] ?? "none";
    const perms = { view: false, create: false, edit: false, delete: false };
    if (level !== "none") {
      perms.view = mod.toggles.includes("view");
      if (level === "full") {
        perms.create = mod.toggles.includes("create");
        perms.edit = mod.toggles.includes("edit");
        perms.delete = mod.toggles.includes("delete");
      } else if (level === "operate") {
        perms.create = mod.toggles.includes("create");
        perms.edit = mod.toggles.includes("edit");
      } else if (level === "editView") {
        perms.edit = mod.toggles.includes("edit");
      }
    }
    result[mod.key] = perms;
  }
  return result;
}

const ROLE_PRESETS: { key: string; label: string; description: string; levels: Partial<Record<ModulePermissionKey, AccessLevel>> }[] = [
  {
    key: "partner",
    label: "Family / Partner",
    description: "Full access, same as a co-owner — for trusted family or business partners.",
    levels: Object.fromEntries(moduleMeta.map((m) => [m.key, "full"])) as Partial<Record<ModulePermissionKey, AccessLevel>>,
  },
  {
    key: "manager",
    label: "Manager",
    description: "Runs day-to-day operations and listings — no earnings or account settings access.",
    levels: {
      dashboard: "view",
      bookings: "full",
      listings: "operate",
      verification: "editView",
      settings: "view",
      membership: "operate",
      menu: "operate",
      foodOrders: "editView",
      coaches: "operate",
      tournaments: "operate",
    },
  },
  {
    key: "staff",
    label: "Staff",
    description: "Front-desk basics — bookings, check-ins and orders. No pricing, earnings or settings.",
    levels: {
      dashboard: "view",
      bookings: "operate",
      listings: "view",
      verification: "editView",
      membership: "view",
      menu: "editView",
      foodOrders: "editView",
      coaches: "view",
      tournaments: "view",
    },
  },
];

export default function RoleAccessPage() {
  const [roles, setRoles] = useState<VendorStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermState>(emptyPermissions);
  const [roleName, setRoleName] = useState("");
  const [holderName, setHolderName] = useState("");
  const [holderEmail, setHolderEmail] = useState("");
  const [holderPhone, setHolderPhone] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  function applyPreset(preset: (typeof ROLE_PRESETS)[number]) {
    setPermissions(buildPreset(preset.levels));
    setActivePreset(preset.key);
    // Only prefill the role name if the vendor hasn't already typed one.
    if (!roleName.trim()) setRoleName(preset.label);
  }

  const refresh = useCallback(() => {
    listVendorStaff()
      .then(setRoles)
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load roles"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = (moduleKey: ModulePermissionKey, action: keyof PermState[ModulePermissionKey]) => {
    setActivePreset(null); // manual edit — no longer exactly matches a preset
    setPermissions((prev) => ({
      ...prev,
      [moduleKey]: { ...prev[moduleKey], [action]: !prev[moduleKey][action] },
    }));
  };

  const selectedCount = Object.values(permissions).reduce(
    (sum, mod) => sum + Object.values(mod).filter(Boolean).length,
    0
  );
  const totalPossible = moduleMeta.reduce((sum, m) => sum + m.toggles.length, 0);

  function resetForm() {
    setPermissions(emptyPermissions);
    setActivePreset(null);
    setRoleName("");
    setHolderName("");
    setHolderEmail("");
    setHolderPhone("");
    setPassword("");
  }

  async function handleCreate() {
    if (!roleName.trim() || !holderName.trim() || !holderEmail.trim() || !/^[6-9]\d{9}$/.test(holderPhone)) {
      setToast("Fill role name, holder name, email and a valid 10-digit phone.");
      return;
    }
    if (password.length < 8) {
      setToast("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      await createVendorStaff({
        roleName: roleName.trim(),
        holderName: holderName.trim(),
        holderEmail: holderEmail.trim(),
        holderPhone,
        accountType: "staff",
        password,
        permissions: permissions as PermissionsMap<ModulePermissionKey>,
      });
      setToast(`Created role for ${holderName}`);
      resetForm();
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to create role");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(role: VendorStaff) {
    if (!window.confirm(`Remove ${role.holderName} from your team?`)) return;
    try {
      await deleteVendorStaff(role.id);
      setToast(`Removed ${role.holderName}`);
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to remove role");
    }
  }

  const activeCount = useMemo(() => roles.filter((r) => r.status === "Active").length, [roles]);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Team Access"
        title="Role access management"
        description="Apni vendor team ke liye multiple roles banao, module-wise permissions do, aur access control maintain karo."
        right={
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold">
            <ShieldCheck size={16} /> {roles.length} Active Role(s)
          </span>
        }
      />

      <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs text-indigo-900 shadow-sm">
        <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-extrabold text-sm">Category Verticals &amp; Platform Access Control</p>
          <p className="mt-0.5 text-indigo-700 font-medium">
            Business categories (Turf, Events, Food Counter, Coaches) are assigned exclusively by the BYV Admin during onboarding. Vendor partners can create staff roles within their assigned business verticals.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard
          title="Create New Role"
          description="Role holder details bharo aur module-wise View, Create, Edit, Delete permissions do."
          className="lg:col-span-2"
        >
          <div className="mb-5">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
              <Sparkles size={13} className="text-vibe-violet" /> Quick Presets
            </p>
            <div className="flex flex-wrap gap-2">
              {ROLE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  title={preset.description}
                  onClick={() => applyPreset(preset)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    activePreset === preset.key
                      ? "border-vibe-violet bg-vibe-violet text-white"
                      : "border-surface-border text-ink-soft hover:bg-cream-300"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {activePreset && (
              <p className="mt-1.5 text-[11px] text-ink-faint">
                {ROLE_PRESETS.find((p) => p.key === activePreset)?.description} You can still tweak any toggle below.
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <Input label="Role Name" placeholder="Booking Manager" value={roleName} onChange={setRoleName} />
            <Input label="Role Holder Name" placeholder="Rahul Verma" value={holderName} onChange={setHolderName} />
            <Input label="Role Holder Email" placeholder="roleholder@gmail.com" value={holderEmail} onChange={setHolderEmail} />
            <Input
              label="Role Holder Phone"
              placeholder="9876543210"
              value={holderPhone}
              onChange={(v) => setHolderPhone(v.replace(/\D/g, "").slice(0, 10))}
            />
            <Input label="Temporary Password" placeholder="Min 8 chars, upper+lower+number" value={password} onChange={setPassword} type="password" />
          </div>

          <div className="rounded-xl border border-surface-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-200/60 text-left text-[11px] uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-3 font-semibold">Module</th>
                  <th className="px-4 py-3 font-semibold text-center">View</th>
                  <th className="px-4 py-3 font-semibold text-center">Create</th>
                  <th className="px-4 py-3 font-semibold text-center">Edit</th>
                  <th className="px-4 py-3 font-semibold text-center">Delete</th>
                </tr>
              </thead>
              <tbody>
                {moduleMeta.map((mod) => (
                  <tr key={mod.key} className="border-t border-surface-border">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{mod.label}</p>
                      <p className="text-[11px] text-ink-faint">{mod.description}</p>
                    </td>
                    {(["view", "create", "edit", "delete"] as const).map((action) => (
                      <td key={action} className="px-4 py-3 text-center">
                        {mod.toggles.includes(action) ? (
                          <input
                            type="checkbox"
                            checked={permissions[mod.key][action]}
                            onChange={() => toggle(mod.key, action)}
                            className="h-4 w-4 accent-vibe-violet cursor-pointer"
                          />
                        ) : (
                          <span className="text-ink-faint">–</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-5">
            <button
              onClick={resetForm}
              className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-cream-300"
            >
              Reset
            </button>
            <div className="flex items-center gap-4">
              <p className="text-xs text-ink-faint">
                Selected Permissions: {selectedCount} / {totalPossible}
              </p>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-vibe-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
              >
                <UserRoundPlus size={16} /> {saving ? "Creating..." : "Create Role"}
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Role Guidelines" description="Ready-to-use rules to keep your team access secure.">
          <div className="space-y-3">
            <GuidelineCard
              tone="info"
              title="Least Privilege"
              text="Har role holder ko sirf required modules ka access do."
            />
            <GuidelineCard
              tone="success"
              title="Role Segregation"
              text="Bookings, listings aur earnings roles alag rakhne se misuse risk kam hota hai."
            />
            <GuidelineCard
              tone="pending"
              title="Periodic Review"
              text="Monthly basis par inactive ya ex-team member roles revoke karo."
            />
          </div>

          <div className="mt-5 rounded-xl border border-surface-border p-4">
            <p className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
              Current Role Count
            </p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink">
              {roles.length}
            </p>
            <p className="text-xs text-ink-faint mt-1">
              Active: {activeCount} | Inactive: {roles.length - activeCount}
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Role Holders" description="Team members with access to this vendor account.">
        <div className="divide-y divide-surface-border">
          {roles.map((role) => (
            <div key={role.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-full bg-vibe-violet/10 text-vibe-violet flex items-center justify-center">
                  <ShieldPlus size={16} />
                </span>
                <div>
                  <p className="font-medium text-ink text-sm">{role.holderName}</p>
                  <p className="text-xs text-ink-faint">
                    {role.roleName} · {role.holderEmail}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={role.status === "Active" ? "success" : "neutral"}>{role.status}</Badge>
                <button
                  onClick={() => handleRemove(role)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-vibe-coral hover:bg-vibe-coral/10"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {loading && <p className="py-8 text-center text-sm text-ink-faint">Loading roles...</p>}
          {!loading && roles.length === 0 && <p className="py-8 text-center text-sm text-ink-faint">No team members yet.</p>}
        </div>
      </SectionCard>

      {toast && <p className="text-xs text-ink-faint">{toast}</p>}
    </div>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet placeholder:text-ink-faint"
      />
    </div>
  );
}

function GuidelineCard({
  tone,
  title,
  text,
}: {
  tone: "info" | "success" | "pending";
  title: string;
  text: string;
}) {
  const toneMap = {
    info: "bg-vibe-violet/5 border-vibe-violet/20",
    success: "bg-lime-50 border-lime-200",
    pending: "bg-amber-50 border-amber-200",
  } as const;
  return (
    <div className={`rounded-xl border p-4 ${toneMap[tone]}`}>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="text-xs text-ink-soft mt-1">{text}</p>
    </div>
  );
}
