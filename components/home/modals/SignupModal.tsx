"use client";

import { useState } from "react";
import { Footprints, Eye, EyeOff, type LucideIcon } from "lucide-react";
import type { Role } from "../types";
import { GhostButton, PrimaryButton } from "../ui";
import { FieldLabel, inputClass, ModalShell } from "./ModalShell";
import { useCustomerAuth } from "@/components/providers/CustomerAuthProvider";
import { vendorRegister } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

const ROLE_OPTIONS: { id: Role; label: string; icon: LucideIcon; desc: string }[] = [
  { id: "player", label: "Player", icon: Footprints, desc: "Book venues, join matches & events" },
  // { id: "owner", label: "Venue Owner", icon: Building2, desc: "List your venue, manage bookings" },
  // { id: "food", label: "Food Owner", icon: Sandwich, desc: "Manage menu, orders & billing" },
];

const CITY_STATE: Record<string, string> = {
  Udaipur: "Rajasthan",
  Jaipur: "Rajasthan",
  Ahmedabad: "Gujarat",
  Delhi: "Delhi",
  Mumbai: "Maharashtra",
  Bangalore: "Karnataka",
};

export function SignupModal({
  onClose,
  onSignedUp,
  onSwitchToLogin,
}: {
  onClose: () => void;
  onSignedUp: (role: Role) => void;
  onSwitchToLogin: () => void;
}) {
  const { register: registerCustomer } = useCustomerAuth();
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [emailVal, setEmailVal] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || mobile.replace(/\D/g, "").length !== 10 || !emailVal || !password) {
      setError("Please fill all required fields correctly.");
      return;
    }
    if (!agree) {
      setError("Please accept the Terms & Privacy Policy to continue.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await registerCustomer({ name: fullName, email: emailVal, phone: mobile, password });
      onSignedUp("player");
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      title={
        <>
          Ready to <span className="text-brand-600">Vibe?</span> 👋
        </>
      }
      subtitle={
        <span className="relative inline-block">
          Let's get you back in the game.
          <svg className="animate-draw-line absolute -bottom-2.5 left-0 w-20 h-3" preserveAspectRatio="none" viewBox="0 0 100 20">
            <defs>
              <linearGradient id="swoosh-gradient-signup" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
            <path d="M0,15 Q50,20 100,5" fill="none" stroke="url(#swoosh-gradient-signup)" strokeWidth="8" strokeLinecap="round"/>
          </svg>
        </span>
      }
      imagePanel={{ src: "/images/loginimage.png", alt: "Play. Book. Vibe." }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
        <div>
          <FieldLabel>Full Name</FieldLabel>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your name"
            className={inputClass}
          />
        </div>

        <div>
          <FieldLabel>Mobile Number</FieldLabel>
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            maxLength={10}
            placeholder="98765 43210"
            className={inputClass}
          />
        </div>

        <div>
          <FieldLabel>Email</FieldLabel>
          <input
            value={emailVal}
            onChange={(e) => setEmailVal(e.target.value)}
            type="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <FieldLabel>Password</FieldLabel>
          <div className="relative">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <label className="flex items-start gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I agree to the <button type="button" className="font-semibold text-brand-600">Terms & Conditions</button>{" "}
            and <button type="button" className="font-semibold text-brand-600">Privacy Policy</button>.
          </span>
        </label>

        {error && <p className="text-xs font-semibold text-accent-600">{error}</p>}

        <PrimaryButton type="submit" className="w-full mt-2" disabled={submitting}>
          {submitting ? "Creating…" : "Create Account"}
        </PrimaryButton>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <button type="button" onClick={onSwitchToLogin} className="font-semibold text-brand-600">
            Log in
          </button>
        </p>
      </form>
    </ModalShell>
  );
}
