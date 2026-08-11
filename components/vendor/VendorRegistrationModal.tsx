"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Hash,
  KeyRound,
  Landmark,
  Lock,
  Mail,
  MapPin,
  MapPinned,
  RotateCw,
  Smartphone,
  Trophy,
  Type,
  User,
  UserRoundCog,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { BusinessVertical, RegistrationFormData, VenueType, emptyFormData, PHASES } from "./types";
import { vendorRequestRegisterOtp, vendorVerifyRegisterOtp } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { INDIA_STATES, INDIA_STATES_CITIES } from "@/lib/indiaLocations";

const ROLE_LABELS: Record<BusinessVertical, string> = {
  turf: "Turf Owner",
  events: "Events Organizer",
  food: "Food & Beverages",
  coaches: "Coaches",
};

const VENUE_TYPES: VenueType[] = [
  "Turf / Sports Ground",
  "Box Cricket Arena",
  "Futsal Court",
  "Badminton / Pickleball Court",
  "Gaming Zone / PS5 Lounge",
  "Bowling Alley",
  "Skating Rink",
  "Escape Room",
  "Individual",
  "Company",
];

const CHECKLISTS: Record<number, string[]> = {
  1: ["Business Type (Turf, Food, or Both)", "Business Name", "Your Full Name", "Business Email (Verified via OTP)", "Contact Phone Number"],
  2: ["Strong Password (min 8 characters)", "Confirm Password", "Passwords must match"],
  3: ["Bank Account Number (optional)", "IFSC Code (optional)", "Account Holder Name (optional)"],
  4: ["State", "City", "Postal Code (Pincode)"],
  5: ["Verify all details", "Solve security puzzle", "Accept terms & conditions"],
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RegistrationFormData) => Promise<void> | void;
}

export default function VendorRegistrationModal({ open, onClose, onSubmit }: Props) {
  const [phase, setPhase] = useState(1);
  const [data, setData] = useState<RegistrationFormData>(emptyFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  /** API failure from Finish Setup — must render inside the modal, or the user sees nothing happen. */
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [captcha, setCaptcha] = useState(() => makeCaptcha());
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaSolved, setCaptchaSolved] = useState(false);

  // Dynamically get states of India ("IN") and sort them alphabetically
  const indiaStates = useMemo(() => INDIA_STATES, []);

  // Dynamically get cities of the selected state and sort/de-duplicate them
  const stateCities = useMemo(() => {
    if (!data.state) return [];
    return Array.from(new Set(INDIA_STATES_CITIES[data.state] ?? [])).sort((a, b) => a.localeCompare(b));
  }, [data.state]);

  // Trap the phone's back button: while this modal is open, "back" steps to the
  // previous phase instead of closing the whole thing. Only Finish or the ×
  // button (via handleClose) should actually close it.
  const isClosingRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    isClosingRef.current = false;
    window.history.pushState({ vendorRegistration: true }, "");
    const onPopState = () => {
      if (isClosingRef.current) return;
      setPhase((p) => {
        window.history.pushState({ vendorRegistration: true }, "");
        return p > 1 ? p - 1 : p;
      });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [open]);

  function handleClose() {
    isClosingRef.current = true;
    window.history.back();
    onClose();
  }

  function makeCaptcha() {
    const a = Math.floor(Math.random() * 20) + 5;
    const b = Math.floor(Math.random() * 20) + 5;
    return { a, b, result: a + b };
  }

  function update<K extends keyof RegistrationFormData>(key: K, value: RegistrationFormData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validatePhase(p: number): boolean {
    const e: Record<string, string> = {};
    if (p === 1) {
      if (data.verticals.length === 0) e.verticals = "Select at least one role.";
      if (!/^[6-9]\d{9}$/.test(data.phone)) e.phone = "Enter a valid 10-digit phone number.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = "Enter a valid email address.";
      if (!data.otpVerified) e.otp = "Please verify your email with the OTP.";
      if (!data.businessName.trim()) e.businessName = "Venue / business name is required.";
      if (!data.ownerName.trim()) e.ownerName = "Owner name is required.";
    }
    if (p === 2) {
      if (data.password.length < 8) {
        e.password = "Password must be at least 8 characters.";
      } else if (!/[a-z]/.test(data.password)) {
        e.password = "Password must contain a lowercase letter.";
      } else if (!/[A-Z]/.test(data.password)) {
        e.password = "Password must contain an uppercase letter.";
      } else if (!/[0-9]/.test(data.password)) {
        e.password = "Password must contain a number.";
      }
      if (data.password !== data.confirmPassword) {
        e.confirmPassword = "Passwords do not match.";
      }
    }
    if (p === 3) {
      // Bank details are optional at registration — only validate format if the vendor chose to fill them in.
      if (data.accountNumber.trim() && !/^\d{9,18}$/.test(data.accountNumber)) e.accountNumber = "Enter a valid account number.";
      if (data.ifscCode.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifscCode.toUpperCase())) e.ifscCode = "Enter a valid IFSC code.";
    }
    if (p === 4) {
      if (!data.state) e.state = "Select a state.";
      if (!data.city.trim()) e.city = "City is required.";
      if (!/^\d{6}$/.test(data.pincode)) e.pincode = "Enter a valid 6-digit pincode.";
    }
    if (p === 5) {
      if (!captchaSolved) e.captcha = "Please solve the security puzzle.";
      if (!data.acceptedTerms) e.acceptedTerms = "You must accept the Vendor Terms & Conditions.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validatePhase(phase)) return;
    if (phase < 5) setPhase(phase + 1);
  }
  function back() {
    if (phase > 1) setPhase(phase - 1);
  }

  async function sendOtp() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setErrors((e) => ({ ...e, email: "Enter a valid email address first." }));
      return;
    }
    setSendingOtp(true);
    setErrors((e) => ({ ...e, email: "", otp: "" }));
    try {
      await vendorRequestRegisterOtp(data.email);
      setOtpSent(true);
    } catch (err) {
      setErrors((e) => ({
        ...e,
        email: err instanceof ApiError ? err.describe() : "Couldn't send the code. Please try again.",
      }));
    } finally {
      setSendingOtp(false);
    }
  }

  async function verifyOtp() {
    if (data.otp.trim().length !== 6) {
      setErrors((e) => ({ ...e, otp: "Enter the 6-digit code sent to your email." }));
      return;
    }
    setVerifyingOtp(true);
    try {
      await vendorVerifyRegisterOtp({ email: data.email, otp: data.otp.trim() });
      update("otpVerified", true);
    } catch (err) {
      setErrors((e) => ({
        ...e,
        otp: err instanceof ApiError ? err.describe() : "Invalid or expired code.",
      }));
    } finally {
      setVerifyingOtp(false);
    }
  }

  function checkCaptcha(value: string) {
    setCaptchaAnswer(value);
    setCaptchaSolved(Number(value) === captcha.result);
    setErrors((e) => ({ ...e, captcha: "" }));
  }

  function refreshCaptcha() {
    setCaptcha(makeCaptcha());
    setCaptchaAnswer("");
    setCaptchaSolved(false);
  }

  async function finishSetup() {
    if (!validatePhase(5)) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(data);
      isClosingRef.current = true;
      window.history.back();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.describe() : err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const progress = useMemo(() => phase * 20, [phase]);
  const current = PHASES[phase - 1];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1912]/70 backdrop-blur-sm p-4">
      <div className="relative flex w-full max-w-3xl overflow-hidden rounded-2xl bg-[#f6f3ea] shadow-2xl">
        <button
          onClick={handleClose}
          aria-label="Close registration"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#10241a] hover:bg-white"
        >
          <X className="h-4 w-4" />
        </button>

        <aside className="hidden w-72 shrink-0 flex-col justify-between bg-[#0c1912] p-8 text-[#f6f3ea] sm:flex">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#a6ff3c] px-3 py-1 font-mono text-xs font-bold uppercase tracking-wide text-[#0c1912]">
              Phase {phase}/5
            </span>
            <h2 className="mt-5 font-[600] text-2xl leading-tight" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
              {current.title}
            </h2>
            <p className="mt-2 text-sm text-[#c9d6cd]">{current.desc}</p>

            <p className="mt-8 text-xs font-bold uppercase tracking-widest text-[#a6ff3c]">Checklist</p>
            <ul className="mt-3 space-y-2 text-sm text-[#c9d6cd]">
              {CHECKLISTS[phase].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#a6ff3c]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#c9d6cd]">
              Progress <span className="float-right text-[#ffb020]">{progress}%</span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#a6ff3c] to-[#ffb020] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </aside>

        <div className="flex max-h-[90vh] w-full flex-col overflow-y-auto p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[#ffb020]">Registration Phase</p>
          <div className="mt-2 h-px w-10 bg-[#ffb020]" />

          <div className="mt-6 flex-1 space-y-4">
            {phase === 1 && (
              <>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#3f5449]">
                    What are you registering as? (select all that apply)
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {(
                      [
                        { value: "turf", label: "Turf Owner", icon: Building2 },
                        { value: "events", label: "Events Organizer", icon: Trophy },
                        { value: "food", label: "Food & Beverages", icon: UtensilsCrossed },
                        { value: "coaches", label: "Coaches", icon: UserRoundCog },
                      ] as { value: BusinessVertical; label: string; icon: LucideIcon }[]
                    ).map((option) => {
                      const selected = data.verticals.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            update(
                              "verticals",
                              selected
                                ? data.verticals.filter((v) => v !== option.value)
                                : [...data.verticals, option.value]
                            )
                          }
                          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                            selected
                              ? "border-[#0c1912] bg-[#0c1912] text-[#a6ff3c]"
                              : "border-[#e4ded0] bg-white text-[#10241a] hover:border-[#0c1912]/40"
                          }`}
                        >
                          <option.icon className="h-4 w-4 shrink-0" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.verticals && <p className="mt-1 text-xs text-red-600">{errors.verticals}</p>}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    icon={Building2}
                    placeholder="Venue / Business Display Name"
                    value={data.businessName}
                    onChange={(v) => update("businessName", v)}
                    error={errors.businessName}
                  />
                  <Field
                    icon={User}
                    placeholder="Owner Name"
                    value={data.ownerName}
                    onChange={(v) => update("ownerName", v)}
                    error={errors.ownerName}
                  />
                </div>

                <div className="flex gap-2">
                  <Field
                    icon={Mail}
                    placeholder="Business / Personal Email"
                    value={data.email}
                    onChange={(v) => {
                      update("email", v);
                      update("otpVerified", false);
                      setOtpSent(false);
                    }}
                    error={errors.email}
                  />
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={sendingOtp || data.otpVerified}
                    className="h-[52px] shrink-0 rounded-xl bg-[#0c1912] px-5 text-sm font-bold text-[#a6ff3c] disabled:opacity-50"
                  >
                    {data.otpVerified ? "Sent" : sendingOtp ? "…" : otpSent ? "Resend" : "Send OTP"}
                  </button>
                </div>

                {!data.otpVerified && otpSent && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-2.5">
                    <div className="flex-1 w-full">
                      <OtpInput
                        value={data.otp}
                        onChange={(v) => update("otp", v)}
                        length={6}
                        error={errors.otp}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={verifyOtp}
                      disabled={verifyingOtp}
                      className="h-[52px] w-full sm:w-auto shrink-0 rounded-xl border border-[#0c1912] px-5 text-sm font-bold text-[#0c1912] disabled:opacity-50"
                    >
                      {verifyingOtp ? "…" : "Verify"}
                    </button>
                  </div>
                )}
                {!data.otpVerified && !otpSent && errors.otp && (
                  <p className="text-xs text-red-600">{errors.otp}</p>
                )}
                {data.otpVerified && (
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-[#3f7d3f]">
                    <Check className="h-4 w-4" /> Email verified
                  </p>
                )}

                <Field
                  icon={Smartphone}
                  placeholder="Phone Number"
                  value={data.phone}
                  onChange={(v) => update("phone", v.replace(/\D/g, "").slice(0, 10))}
                  error={errors.phone}
                />

                {data.verticals.includes("turf") && (
                  <Dropdown
                    icon={Building}
                    placeholder="Select Venue Type"
                    value={data.venueType}
                    options={VENUE_TYPES}
                    onChange={(v) => update("venueType", v as VenueType)}
                  />
                )}
              </>
            )}

            {phase === 2 && (
              <>
                <PasswordField
                  placeholder="Create Strong Password"
                  value={data.password}
                  onChange={(v) => update("password", v)}
                  show={showPassword}
                  toggle={() => setShowPassword((s) => !s)}
                  error={errors.password}
                />
                <PasswordField
                  placeholder="Confirm Password"
                  value={data.confirmPassword}
                  onChange={(v) => update("confirmPassword", v)}
                  show={showConfirm}
                  toggle={() => setShowConfirm((s) => !s)}
                  error={errors.confirmPassword}
                />
                <p className="text-xs text-[#3f5449]">
                  Use at least 8 characters with a mix of letters, numbers, and symbols.
                </p>
              </>
            )}

            {phase === 3 && (
              <>
                <p className="text-xs text-[#3f5449]">
                  Optional — you can add these now or later from your vendor dashboard before your first payout.
                </p>
                <Field
                  icon={Landmark}
                  placeholder="Bank Account Number (optional)"
                  value={data.accountNumber}
                  onChange={(v) => update("accountNumber", v.replace(/\D/g, "").slice(0, 18))}
                  error={errors.accountNumber}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    icon={Type}
                    placeholder="IFSC Code (optional)"
                    value={data.ifscCode}
                    onChange={(v) => update("ifscCode", v.toUpperCase().slice(0, 11))}
                    error={errors.ifscCode}
                    mono
                  />
                  <Field
                    icon={User}
                    placeholder="Account Holder Name (optional)"
                    value={data.accountHolderName}
                    onChange={(v) => update("accountHolderName", v)}
                    error={errors.accountHolderName}
                  />
                </div>
              </>
            )}

            {phase === 4 && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Dropdown
                    icon={MapPin}
                    placeholder="Select State"
                    value={data.state}
                    options={indiaStates}
                    onChange={(v) => {
                      update("state", v);
                      update("city", "");
                    }}
                    error={errors.state}
                  />
                  <Dropdown
                    icon={MapPinned}
                    placeholder={data.state ? "Select City" : "Select a state first"}
                    value={data.city}
                    options={stateCities}
                    onChange={(v) => update("city", v)}
                    error={errors.city}
                    disabled={!data.state}
                  />
                </div>
                <Field
                  icon={Hash}
                  placeholder="Pincode"
                  value={data.pincode}
                  onChange={(v) => update("pincode", v.replace(/\D/g, "").slice(0, 6))}
                  error={errors.pincode}
                  mono
                />
              </>
            )}

            {phase === 5 && (
              <>
                <div className="rounded-xl border border-[#e4ded0] bg-white p-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ReviewItem
                      label="Registering As"
                      value={data.verticals.map((v) => ROLE_LABELS[v]).join(", ")}
                    />
                    <ReviewItem label="Business Name" value={data.businessName} />
                    <ReviewItem label="Owner Name" value={data.ownerName} />
                    <ReviewItem label="Email Address" value={data.email} />
                    <ReviewItem label="Phone Number" value={data.phone} />
                    {data.verticals.includes("turf") && <ReviewItem label="Venue Type" value={data.venueType} />}
                    <ReviewItem label="City / State" value={`${data.city}, ${data.state}`} />
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-[#e4ded0] p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#3f5449]">Security Challenge</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="rounded-lg bg-[#f1f5e8] px-4 py-2 font-mono text-lg font-bold text-[#0c1912]">
                      {captcha.a} + {captcha.b}
                    </span>
                    <span className="text-lg">=</span>
                    <input
                      value={captchaAnswer}
                      onChange={(e) => checkCaptcha(e.target.value.replace(/\D/g, ""))}
                      className="h-12 w-20 rounded-lg border border-[#e4ded0] text-center font-mono text-lg outline-none focus:border-[#a6ff3c]"
                      placeholder="?"
                    />
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      className="rounded-lg border border-[#e4ded0] px-3 py-2 text-sm"
                      aria-label="Refresh puzzle"
                    >
                      <RotateCw className="h-4 w-4" />
                    </button>
                    {captchaSolved && (
                      <span className="flex items-center gap-1 text-sm font-semibold text-[#3f7d3f]">
                        <Check className="h-4 w-4" /> Verified
                      </span>
                    )}
                  </div>
                  {errors.captcha && <p className="mt-2 text-xs text-red-600">{errors.captcha}</p>}
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-[#e4ded0] p-4 text-sm text-[#10241a]">
                  <input
                    type="checkbox"
                    checked={data.acceptedTerms}
                    onChange={(e) => update("acceptedTerms", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#a6ff3c]"
                  />
                  <span>
                    I accept the{" "}
                    <a className="font-semibold text-[#0c1912] underline" href="/vendor-terms">
                      Vendor Terms &amp; Conditions
                    </a>
                    . I certify all venue data provided is accurate.
                  </span>
                </label>
                {errors.acceptedTerms && <p className="text-xs text-red-600">{errors.acceptedTerms}</p>}

                {submitError && (
                  <p className="mt-4 text-xs font-semibold text-red-600 rounded-xl bg-red-500/10 px-4 py-3">
                    {submitError}
                  </p>
                )}
              </>
            )}
          </div>

          {submitError && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              {submitError}
              {/already exists/i.test(submitError) && (
                <>
                  {" "}
                  <a href="/vendor/login" className="font-bold underline">
                    Log in to that account
                  </a>{" "}
                  instead, or register with a different email and phone number.
                </>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-[#e4ded0] pt-6">
            {phase > 1 ? (
              <button onClick={back} className="flex items-center gap-1 text-sm font-bold text-[#10241a]">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <span />
            )}

            {phase < 5 ? (
              <button
                onClick={next}
                className="flex items-center gap-1 rounded-full bg-[#0c1912] px-6 py-3 text-sm font-bold text-[#a6ff3c] transition hover:opacity-90"
              >
                Next Phase <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={finishSetup}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-full bg-[#a6ff3c] px-6 py-3 text-sm font-bold text-[#0c1912] transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : (
                  <>
                    <Check className="h-4 w-4" /> Finish Setup
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  placeholder,
  value,
  onChange,
  error,
  mono,
}: {
  icon: LucideIcon;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  mono?: boolean;
}) {
  return (
    <div className="w-full">
      <div
        className={`flex items-center gap-2 rounded-xl border bg-white px-4 py-3 ${
          error ? "border-red-400" : "border-[#e4ded0]"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0 text-[#3f5449]" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-transparent text-sm text-[#10241a] outline-none placeholder:text-[#9aa79e] ${
            mono ? "font-mono" : ""
          }`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  error?: string;
}

function OtpInput({ value, onChange, length = 6, error }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.split("").slice(0, length);
  while (digits.length < length) {
    digits.push("");
  }

  const handleChange = (val: string, index: number) => {
    const cleanVal = val.replace(/\D/g, "");
    if (!cleanVal) {
      const newDigits = [...digits];
      newDigits[index] = "";
      onChange(newDigits.join(""));
      return;
    }

    const newDigits = [...digits];
    if (cleanVal.length > 1) {
      const pasted = cleanVal.slice(0, length - index);
      for (let i = 0; i < pasted.length; i++) {
        newDigits[index + i] = pasted[i];
      }
      onChange(newDigits.join(""));
      const nextIdx = Math.min(index + pasted.length, length - 1);
      inputsRef.current[nextIdx]?.focus();
      return;
    }

    newDigits[index] = cleanVal;
    onChange(newDigits.join(""));

    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      const targetIndex = Math.min(pastedData.length, length - 1);
      inputsRef.current[targetIndex]?.focus();
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-1.5 justify-between">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digits[i]}
            onFocus={(e) => e.target.select()}
            onChange={(e) => handleChange(e.target.value, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            className={`h-[52px] w-full min-w-0 max-w-[46px] text-center font-bold text-lg rounded-xl border bg-white outline-none transition ${
              error ? "border-red-400 focus:border-red-500" : "border-[#e4ded0] focus:border-[#0c1912]"
            } text-[#10241a]`}
          />
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function PasswordField({
  placeholder,
  value,
  onChange,
  show,
  toggle,
  error,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggle: () => void;
  error?: string;
}) {
  return (
    <div className="w-full">
      <div className={`flex items-center gap-2 rounded-xl border bg-white px-4 py-3 ${error ? "border-red-400" : "border-[#e4ded0]"}`}>
        <Lock className="h-4 w-4 shrink-0 text-[#3f5449]" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-[#10241a] outline-none placeholder:text-[#9aa79e]"
        />
        <button type="button" onClick={toggle} className="text-xs font-bold uppercase text-[#3f5449]">
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-widest text-[#9aa79e]">{label}</p>
      {/* break-all keeps long unbroken values (emails, IDs) inside the card. */}
      <p className="mt-1 break-all text-sm font-semibold text-[#10241a]">{value || "—"}</p>
    </div>
  );
}

/** Custom dropdown — replaces the native <select> so it looks and behaves
 * consistently across mobile browsers instead of falling back to each OS's
 * own picker UI. */
function Dropdown({
  icon: Icon,
  placeholder,
  value,
  options,
  onChange,
  error,
  disabled,
}: {
  icon: LucideIcon;
  placeholder: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="w-full">
      <div className="relative" ref={ref}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={`flex w-full items-center gap-2 rounded-xl border bg-white px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
            error ? "border-red-400" : "border-[#e4ded0]"
          }`}
        >
          <Icon className="h-4 w-4 shrink-0 text-[#3f5449]" />
          <span className={`flex-1 truncate text-sm ${value ? "text-[#10241a]" : "text-[#9aa79e]"}`}>{value || placeholder}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-[#3f5449] transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#e4ded0] bg-white py-1 shadow-xl">
            {options.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[#9aa79e]">No options available</p>
            ) : (
              options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-[#f6f3ea] ${
                    opt === value ? "font-bold text-[#0c1912]" : "text-[#10241a]"
                  }`}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
