"use client";

import { useState } from "react";
import { Building2, Footprints, Sandwich, Eye, EyeOff, type LucideIcon } from "lucide-react";
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
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>("player");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [emailVal, setEmailVal] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // owner / food owner extra fields
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("Udaipur");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleNext = () => {
    if (!role) {
      setError("Please choose a role to continue.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || mobile.replace(/\D/g, "").length !== 10 || !emailVal || !password) {
      setError("Please fill all required fields correctly.");
      return;
    }
    if ((role === "owner" || role === "food") && !businessName) {
      setError("Business / venue name is required for owner accounts.");
      return;
    }
    if (!agree) {
      setError("Please accept the Terms & Privacy Policy to continue.");
      return;
    }
    if (role === "food") {
      setError("Food Owner accounts are coming soon — please check back later.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      if (role === "player") {
        await registerCustomer({ name: fullName, email: emailVal, phone: mobile, password });
      } else {
        await vendorRegister({
          ownerName: fullName,
          businessName,
          email: emailVal,
          phone: mobile,
          state: CITY_STATE[city] ?? city,
          city,
          password,
          verticals: ["turf"],
        });
      }
      onSignedUp(role);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      title={step === 1 ? "Create your account" : "Just a few details"}
      subtitle={
        step === 1
          ? "Choose how you'll use Book Your Vibe."
          : `Signing up as ${ROLE_OPTIONS.find((r) => r.id === role)?.label}.`
      }
    >
      {step === 1 ? (
        <div className="flex flex-col gap-3">
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
                role === r.id
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-100 hover:border-brand-200"
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-500 shadow">
                <r.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{r.label}</p>
                <p className="text-xs text-slate-500">{r.desc}</p>
              </div>
              <span
                className={`ml-auto h-5 w-5 rounded-full border-2 ${
                  role === r.id ? "border-brand-500 bg-brand-500" : "border-slate-300"
                }`}
              />
            </button>
          ))}

          {error && <p className="text-xs font-semibold text-accent-600">{error}</p>}

          <PrimaryButton onClick={handleNext} className="mt-2 w-full">
            Continue
          </PrimaryButton>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <button onClick={onSwitchToLogin} className="font-semibold text-brand-600">
              Log in
            </button>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <FieldLabel>Full Name</FieldLabel>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Yashank Rajawat"
              className={inputClass}
            />
          </div>

          {(role === "owner" || role === "food") && (
            <div>
              <FieldLabel>
                {role === "owner" ? "Venue / Business Name" : "Food Outlet Name"}
              </FieldLabel>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={role === "owner" ? "Cricket Arena" : "Vibe Cafe"}
                className={inputClass}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <FieldLabel>City</FieldLabel>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
              >
                {["Udaipur", "Jaipur", "Ahmedabad", "Delhi", "Mumbai", "Bangalore"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
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
            I agree to the <span className="font-semibold text-brand-600">Terms & Conditions</span>{" "}
            and <span className="font-semibold text-brand-600">Privacy Policy</span>.
          </label>

          {error && <p className="text-xs font-semibold text-accent-600">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <GhostButton onClick={() => setStep(1)} className="flex-1">
              Back
            </GhostButton>
            <PrimaryButton type="submit" className="flex-1" disabled={submitting}>
              {submitting ? "Creating…" : "Create Account"}
            </PrimaryButton>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
