"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { useAdminAuth } from "@/components/providers/AdminAuthProvider";
import { createAdminSubUser, deleteAdminSubUser, listAdminSubUsers, updateAdminSubUser } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { AdminModuleKey, AdminSubUser, PermissionsMap } from "@/lib/api/types";

const ROLE_OPTIONS = ["SUB_ADMIN", "IT MANAGER", "FINANCE ROLE", "FINANCE", "MARKETING", "SALES"];

const MODULE_KEYS: AdminModuleKey[] = [
  "dashboard",
  "vendors",
  "listings",
  "bookings",
  "payouts",
  "blog",
  "marketing",
  "categories",
  "users",
  "subAdmins",
  "systemHealth",
  "appVersion",
];

function buildPermissions(fullAccess: boolean): PermissionsMap<AdminModuleKey> {
  const map = {} as PermissionsMap<AdminModuleKey>;
  for (const key of MODULE_KEYS) {
    map[key] = { view: true, create: fullAccess, edit: fullAccess, delete: fullAccess };
  }
  return map;
}

export default function AdminUsersPage() {
  const { admin } = useAdminAuth();
  const [users, setUsers] = useState<AdminSubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalUser, setModalUser] = useState<AdminSubUser | null | "new">(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listAdminSubUsers()
      .then(setUsers)
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleRemove(user: AdminSubUser) {
    if (!window.confirm(`Remove ${user.name} from admin directory?`)) return;
    try {
      await deleteAdminSubUser(user._id);
      setToast(`Removed ${user.name}`);
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to remove user");
    }
  }

  async function handleSaveUser(draft: { name: string; email: string; role: string; password: string; fullAccess: boolean }, existing: AdminSubUser | null) {
    try {
      if (existing) {
        await updateAdminSubUser(existing._id, { name: draft.name, role: draft.role, permissions: buildPermissions(draft.fullAccess) });
        setToast(`Updated ${draft.name}`);
      } else {
        await createAdminSubUser({
          name: draft.name,
          email: draft.email,
          role: draft.role,
          password: draft.password,
          permissions: buildPermissions(draft.fullAccess),
        });
        setToast(`Created ${draft.name}`);
      }
      setModalUser(null);
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to save user");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-ink-faint">Admin / Admin Dashboard / Users</p>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="font-display text-xl font-semibold text-ink">Users</h1>
          <Badge tone="info">
            Logged in as: {admin.name} ({admin.email})
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
        <div>
          <p className="font-display font-semibold text-ink">Admin Directory</p>
          <p className="text-xs text-ink-faint">Create sub-admin accounts and manage their platform access.</p>
        </div>
        <button
          onClick={() => setModalUser("new")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus size={15} /> Create
        </button>
      </div>

      <div className="rounded-xl2 border border-surface-border bg-white shadow-panel">
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            <p className="font-display font-semibold text-ink">Sub-Admins</p>
            <p className="text-xs text-ink-faint">Manage sub-admin records, roles, and access.</p>
          </div>
          <Badge tone="neutral">{users.length} records</Badge>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-ink text-xs font-semibold uppercase tracking-wider text-white">
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Edit</th>
                <th className="px-5 py-3">Remove</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u._id} className="border-b border-surface-border last:border-0">
                  <td className="px-5 py-3 text-ink-faint">{i + 1}</td>
                  <td className="px-5 py-3 font-semibold text-ink">{u.name}</td>
                  <td className="px-5 py-3 text-ink-soft">{u.email}</td>
                  <td className="px-5 py-3">
                    <Badge tone="info">{u.role}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={u.status === "Active" ? "success" : "neutral"}>{u.status}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => setModalUser(u)} className="font-semibold text-vibe-violet hover:underline">
                      Edit
                    </button>
                  </td>
                  <td className="px-5 py-3 pb-5">
                    <button
                      onClick={() => handleRemove(u)}
                      className="inline-flex items-center gap-1 rounded-lg bg-vibe-coral/10 px-2.5 py-1.5 text-xs font-semibold text-vibe-coral hover:bg-vibe-coral/20"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-ink-faint">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-ink-faint">
                    No sub-admins yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalUser && (
        <SubUserModal user={modalUser === "new" ? null : modalUser} onClose={() => setModalUser(null)} onSave={handleSaveUser} />
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function SubUserModal({
  user,
  onClose,
  onSave,
}: {
  user: AdminSubUser | null;
  onClose: () => void;
  onSave: (draft: { name: string; email: string; role: string; password: string; fullAccess: boolean }, existing: AdminSubUser | null) => void;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState(user?.role ?? ROLE_OPTIONS[0]);
  const [password, setPassword] = useState("");
  const [fullAccess, setFullAccess] = useState(user ? Object.values(user.permissions).some((p) => p?.edit) : false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-display font-semibold text-ink">
            <ShieldCheck size={16} className="text-vibe-violet" /> {user ? "Edit Sub-Admin" : "Create Sub-Admin"}
          </p>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!user}
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet disabled:bg-cream-200/60 disabled:text-ink-faint"
            />
          </div>
          {!user && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars, upper+lower+number"
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-vibe-violet">
              {ROLE_OPTIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={fullAccess} onChange={(e) => setFullAccess(e.target.checked)} className="accent-vibe-violet" />
            <span>
              <span className="font-semibold text-ink">Full access</span>
              <span className="ml-1 text-xs text-ink-faint">(create/edit/delete across all modules — otherwise view-only)</span>
            </span>
          </label>
        </div>
        <button
          onClick={() => {
            if (!name.trim() || !email.trim()) return;
            if (!user && password.length < 8) return;
            onSave({ name: name.trim(), email: email.trim(), role, password, fullAccess }, user);
          }}
          className="mt-5 w-full rounded-lg bg-vibe-violet py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft"
        >
          {user ? "Save Changes" : "Create Sub-Admin"}
        </button>
      </div>
    </div>
  );
}
