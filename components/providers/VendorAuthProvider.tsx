"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { vendorLogout as apiVendorLogout, type VendorProfile } from "@/lib/api/auth";

interface VendorAuthContextValue {
  vendor: VendorProfile;
  logout: () => Promise<void>;
}

export const VendorAuthContext = createContext<VendorAuthContextValue | null>(null);

export function VendorAuthProvider({
  vendor,
  onLoggedOut,
  children,
}: {
  vendor: VendorProfile;
  onLoggedOut: () => void;
  children: React.ReactNode;
}) {
  const [current] = useState(vendor);

  const logout = useCallback(async () => {
    await apiVendorLogout();
    onLoggedOut();
  }, [onLoggedOut]);

  const value = useMemo(() => ({ vendor: current, logout }), [current, logout]);

  return <VendorAuthContext.Provider value={value}>{children}</VendorAuthContext.Provider>;
}

export function useVendorAuth() {
  const ctx = useContext(VendorAuthContext);
  if (!ctx) throw new Error("useVendorAuth must be used within a VendorAuthProvider");
  return ctx;
}
