"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  customerGoogleAuth,
  customerLogin,
  customerLoginWithOtp,
  customerLogout,
  customerRegister,
  restoreCustomerSession,
  updateMyCustomerProfile,
  type CustomerProfile,
} from "@/lib/api/auth";
import { subscribeToTokenChanges } from "@/lib/api/client";
import { trackEvent, trackLogin, trackLogout, trackSignup } from "@/lib/analytics";

type Status = "loading" | "authenticated" | "guest";

interface CustomerAuthContextValue {
  customer: CustomerProfile | null;
  status: Status;
  login: (identifier: string, password: string) => Promise<CustomerProfile>;
  loginWithGoogle: (idToken: string) => Promise<CustomerProfile>;
  loginWithEmailOtp: (email: string, otp: string) => Promise<CustomerProfile>;
  register: (input: { name: string; email: string; phone: string; password: string }) => Promise<CustomerProfile>;
  logout: () => Promise<void>;
  updateProfile: (input: { name?: string; avatarUrl?: string; phone?: string }) => Promise<CustomerProfile>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    restoreCustomerSession().then((profile) => {
      if (cancelled) return;
      setCustomer(profile);
      setStatus(profile ? "authenticated" : "guest");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeToTokenChanges((audience, token) => {
      if (audience === "customer" && !token) {
        setCustomer(null);
        setStatus("guest");
      }
    });
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const profile = await customerLogin({ identifier, password });
    setCustomer(profile);
    setStatus("authenticated");
    trackLogin(profile.id, "customer");
    return profile;
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const profile = await customerGoogleAuth(idToken);
    setCustomer(profile);
    setStatus("authenticated");
    trackLogin(profile.id, "customer");
    return profile;
  }, []);

  const loginWithEmailOtp = useCallback(async (email: string, otp: string) => {
    const profile = await customerLoginWithOtp({ email, otp });
    setCustomer(profile);
    setStatus("authenticated");
    trackLogin(profile.id, "customer");
    return profile;
  }, []);

  const register = useCallback(
    async (input: { name: string; email: string; phone: string; password: string }) => {
      const profile = await customerRegister(input);
      setCustomer(profile);
      setStatus("authenticated");
      trackSignup(profile.id, profile.phone);
      return profile;
    },
    []
  );

  const logout = useCallback(async () => {
    const cid = customer?.id;
    await customerLogout();
    setCustomer(null);
    setStatus("guest");
    trackLogout(cid);
  }, [customer]);

  const updateProfile = useCallback(async (input: { name?: string; avatarUrl?: string; phone?: string }) => {
    const profile = await updateMyCustomerProfile(input);
    setCustomer(profile);
    trackEvent("profile_updated", { userId: profile.id }, "customer");
    return profile;
  }, []);

  const value = useMemo(
    () => ({ customer, status, login, loginWithGoogle, loginWithEmailOtp, register, logout, updateProfile }),
    [customer, status, login, loginWithGoogle, loginWithEmailOtp, register, logout, updateProfile]
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
  return ctx;
}
