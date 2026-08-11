"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { adminLogout as apiAdminLogout, type AdminProfile } from "@/lib/api/auth";

interface AdminAuthContextValue {
  admin: AdminProfile;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({
  admin,
  onLoggedOut,
  children,
}: {
  admin: AdminProfile;
  onLoggedOut: () => void;
  children: React.ReactNode;
}) {
  const [current] = useState(admin);

  const logout = useCallback(async () => {
    await apiAdminLogout();
    onLoggedOut();
  }, [onLoggedOut]);

  const value = useMemo(() => ({ admin: current, logout }), [current, logout]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  return ctx;
}
