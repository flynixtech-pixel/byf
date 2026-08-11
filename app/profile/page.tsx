"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Camera,
  Clock,
  Download,
  Mail,
  Phone,
  Ticket,
  Trophy,
  UserRoundCog,
  X,
  Edit2,
  Save,
  CheckCircle2,
  Users,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Shield,
  Bell,
  Sparkles,
  PlusCircle,
  LogOut,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/CustomerAuthProvider";
import { getMyBookings } from "@/lib/api/customerBookings";
import { cancelMyCoachSubscription, getMyCoachSubscriptions } from "@/lib/api/coaches";
import { cancelMyRegistration, getMyRegistrations } from "@/lib/api/tournaments";
import { uploadCustomerImage } from "@/lib/api/uploads";
import { ApiError } from "@/lib/api/client";
import type {
  Booking,
  BookingStatus,
  CoachSubscription,
  CoachSubscriptionStatus,
  TournamentRegistration,
  TournamentRegistrationStatus,
} from "@/lib/api/types";
import { downloadBookingTicket } from "@/lib/ticket";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/home/Footer";
import { Toast } from "@/components/admin/Toast";

const STATUS_STYLES: Record<BookingStatus, string> = {
  Confirmed: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  "Part Paid": "bg-amber-100 text-amber-700",
  Cancelled: "bg-accent-100 text-accent-600",
  Completed: "bg-slate-100 text-slate-600",
};

const COACH_STATUS_STYLES: Record<CoachSubscriptionStatus, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-accent-100 text-accent-600",
  Expired: "bg-slate-100 text-slate-600",
};

const REGISTRATION_STATUS_STYLES: Record<TournamentRegistrationStatus, string> = {
  Registered: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-accent-100 text-accent-600",
  Withdrawn: "bg-slate-100 text-slate-600",
};

export default function ProfilePage() {
  const router = useRouter();
  const { customer, status: authStatus, updateProfile, logout } = useCustomerAuth();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [coachSubs, setCoachSubs] = useState<CoachSubscription[]>([]);
  const [coachSubsLoading, setCoachSubsLoading] = useState(true);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(true);
  
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Communities States
  const [joinedClubs, setJoinedClubs] = useState<any[]>([]);
  const [joinedLobbies, setJoinedLobbies] = useState<any[]>([]);
  const [createdClubs, setCreatedClubs] = useState<any[]>([]);
  const [createdLobbies, setCreatedLobbies] = useState<any[]>([]);
  const [communityTab, setCommunityTab] = useState<"joined" | "created">("joined");
  const [expandedClubRequests, setExpandedClubRequests] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setImgError(false);
  }, [customer?.avatarUrl]);

  useEffect(() => {
    if (customer) {
      setEditName(customer.name || "");
      setEditPhone(customer.phone || "");
    }
  }, [customer]);

  const getInitials = () => {
    if (customer?.name) {
      const parts = customer.name.trim().split(/\s+/);
      const firstInitial = parts[0]?.charAt(0) || "";
      const lastInitial = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) : "";
      const initials = (firstInitial + lastInitial).toUpperCase();
      if (initials) return initials;
    }
    if (customer?.email) {
      return customer.email.charAt(0).toUpperCase();
    }
    return "?";
  };

  useEffect(() => {
    if (authStatus === "guest") {
      router.replace("/");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    
    // API data fetches
    getMyBookings({ limit: 50 })
      .then((res) => setBookings(res.items))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
      
    getMyCoachSubscriptions({ limit: 50 })
      .then((res) => setCoachSubs(res.items))
      .catch(() => setCoachSubs([]))
      .finally(() => setCoachSubsLoading(false));
      
    getMyRegistrations({ limit: 50 })
      .then((res) => setRegistrations(res.items))
      .catch(() => setRegistrations([]))
      .finally(() => setRegistrationsLoading(false));

    // Load joined clubs from detailed cache or generate default mock
    try {
      const savedJoinedClubs = localStorage.getItem("byv_joined_clubs_detailed");
      if (savedJoinedClubs) {
        setJoinedClubs(JSON.parse(savedJoinedClubs));
      } else {
        const defaultJoined = [
          {
            clubId: "c-1",
            name: "Udaipur Smashers Badminton Club",
            sport: "Badminton",
            place: "Shobhagpura",
            joinedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            status: "Approved",
          },
        ];
        setJoinedClubs(defaultJoined);
        localStorage.setItem("byv_joined_clubs_detailed", JSON.stringify(defaultJoined));
      }
    } catch (_) {}

    // Load joined match lobbies
    try {
      const savedJoinedLobbies = localStorage.getItem("byv_joined_matches_detailed");
      if (savedJoinedLobbies) {
        setJoinedLobbies(JSON.parse(savedJoinedLobbies));
      } else {
        const defaultLobbies = [
          {
            matchId: "m-1",
            title: "Friday night badminton run",
            place: "Shobhagpura Arena",
            time: "8:00 PM",
            sport: "Badminton",
            joinedAt: new Date(Date.now() - 86400000).toISOString(),
            status: "Pending Approval",
          },
        ];
        setJoinedLobbies(defaultLobbies);
        localStorage.setItem("byv_joined_matches_detailed", JSON.stringify(defaultLobbies));
      }
    } catch (_) {}

    // Load created clubs
    try {
      const savedCreatedClubs = localStorage.getItem("byv_created_clubs");
      if (savedCreatedClubs) {
        setCreatedClubs(JSON.parse(savedCreatedClubs));
      } else {
        setCreatedClubs([]);
      }
    } catch (_) {}

    // Load created lobbies
    try {
      const savedCreatedLobbies = localStorage.getItem("byv_created_lobbies");
      if (savedCreatedLobbies) {
        setCreatedLobbies(JSON.parse(savedCreatedLobbies));
      } else {
        setCreatedLobbies([]);
      }
    } catch (_) {}
  }, [authStatus]);

  async function handleCancelCoachSubscription(orderId: string) {
    try {
      const updated = await cancelMyCoachSubscription(orderId);
      setCoachSubs((prev) => prev.map((b) => (b.orderId === orderId ? updated : b)));
      setToast("Coaching subscription cancelled");
    } catch {
      setToast("Failed to cancel coaching subscription");
    }
  }

  async function handleCancelRegistration(orderId: string) {
    try {
      const updated = await cancelMyRegistration(orderId);
      setRegistrations((prev) => prev.map((r) => (r.orderId === orderId ? updated : r)));
      setToast("Tournament registration cancelled");
    } catch {
      setToast("Failed to cancel tournament registration");
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      // No redirect needed — logout flips authStatus to "guest" and the guard
      // effect above sends us home. The button stays busy until that happens.
    } catch {
      setLoggingOut(false);
      setToast("Could not log out. Please try again.");
    }
  }

  async function handleAvatarUpload(file: File | undefined) {
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const { url } = await uploadCustomerImage(file, "customer-avatars");
      await updateProfile({ avatarUrl: url });
      setToast("Profile photo uploaded!");
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.describe() : "Failed to upload photo");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleUpdateProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);

    // Validate phone number format
    if (editPhone.trim()) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(editPhone.trim())) {
        setEditError("Enter a valid 10-digit Indian mobile number starting with 6-9.");
        return;
      }
    } else {
      setEditError("Phone number is required.");
      return;
    }

    setEditLoading(true);
    try {
      await updateProfile({
        name: editName.trim(),
        phone: editPhone.trim(),
      });
      setIsEditing(false);
      setToast("Profile updated successfully!");
    } catch (err) {
      setEditError(err instanceof ApiError ? err.describe() : "Failed to update profile details");
    } finally {
      setEditLoading(false);
    }
  }

  // Request approval logic
  const handleApproveRequest = (clubId: string, requestId: string) => {
    const updatedClubs = createdClubs.map((club) => {
      if (club.id === clubId) {
        const reqToApprove = club.requests.find((r: any) => r.id === requestId);
        const nextRequests = club.requests.filter((r: any) => r.id !== requestId);
        const nextApproved = [...(club.approvedMembers || []), reqToApprove ? reqToApprove.playerName : "New Member"];
        return {
          ...club,
          members: club.members + 1,
          requests: nextRequests,
          approvedMembers: nextApproved,
        };
      }
      return club;
    });
    setCreatedClubs(updatedClubs);
    localStorage.setItem("byv_created_clubs", JSON.stringify(updatedClubs));
    setToast("Approved player join request!");
  };

  const handleDeclineRequest = (clubId: string, requestId: string) => {
    const updatedClubs = createdClubs.map((club) => {
      if (club.id === clubId) {
        const nextRequests = club.requests.filter((r: any) => r.id !== requestId);
        return {
          ...club,
          requests: nextRequests,
        };
      }
      return club;
    });
    setCreatedClubs(updatedClubs);
    localStorage.setItem("byv_created_clubs", JSON.stringify(updatedClubs));
    setToast("Declined player join request.");
  };

  const toggleRequestsAccordion = (clubId: string) => {
    setExpandedClubRequests((prev) => ({
      ...prev,
      [clubId]: !prev[clubId],
    }));
  };

  if (authStatus !== "authenticated" || !customer) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  const hasPhone = !!customer.phone;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        
        {/* Missing Phone Number Alert Banner */}
        {!hasPhone && !isEditing && (
          <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2 text-amber-800">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">Phone number is missing</p>
                <p className="text-xs text-amber-700">Please add your phone number to complete bookings and receive alerts.</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsEditing(true);
                setTimeout(() => document.getElementById("edit-phone-input")?.focus(), 100);
              }}
              className="w-full shrink-0 rounded-xl bg-amber-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-900 sm:w-auto"
            >
              Add Phone Number
            </button>
          </div>
        )}

        {/* Profile Details Section */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 translate-y-[-24px] rounded-full bg-brand-50 opacity-60 blur-2xl" />
          
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
            {/* Avatar container */}
            <div className="relative shrink-0">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-slate-50 bg-brand-100 text-3xl font-black text-brand-700 shadow-sm sm:h-28 sm:w-28">
                {customer.avatarUrl && !imgError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={customer.avatarUrl}
                    alt={customer.name}
                    className="h-full w-full object-cover"
                    onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
          />
                ) : (
                  getInitials()
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarUpload(e.target.files?.[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                aria-label="Upload profile photo"
                title="Upload profile photo"
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white shadow-md ring-4 ring-white transition hover:scale-105 disabled:opacity-60"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            {/* Profile Info Form / Display */}
            <div className="flex-1 w-full">
              {!isEditing ? (
                <div className="flex flex-col gap-4 text-center sm:text-left">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">{customer.name}</h1>
                    <div className="mt-2 flex flex-col items-center gap-2 text-sm text-slate-500 sm:items-start sm:gap-2.5">
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" /> {customer.email}
                      </span>
                      <span className={`flex items-center gap-2 ${!customer.phone ? "text-amber-600 font-semibold" : ""}`}>
                        <Phone className="h-4 w-4 text-slate-400" /> {customer.phone || "No phone number added"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-brand-600"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-60"
                    >
                      <LogOut className="h-3.5 w-3.5" /> {loggingOut ? "Logging out…" : "Logout"}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateProfileSubmit} className="space-y-4 w-full">
                  <h2 className="text-base font-bold text-slate-900">Update Profile Details</h2>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-brand-500"
                        required
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Phone Number</label>
                      <input
                        id="edit-phone-input"
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-brand-500"
                        placeholder="e.g. 9876543210"
                        required
                      />
                      <p className="mt-1 text-[10px] text-slate-400">Must be a valid 10-digit Indian mobile number.</p>
                    </div>
                  </div>

                  {editError && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 pt-2">
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/20 transition hover:bg-brand-700 disabled:opacity-60"
                    >
                      <Save className="h-3.5 w-3.5" /> {editLoading ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditError(null);
                        setEditName(customer.name || "");
                        setEditPhone(customer.phone || "");
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {avatarUploading && <p className="mt-2.5 text-xs text-slate-400">Uploading photo…</p>}
              {avatarError && <p className="mt-2.5 text-xs text-rose-600 font-medium">{avatarError}</p>}
            </div>
          </div>
        </div>

        {/* My Tickets */}
        <section className="mt-8 sm:mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <Ticket className="h-5 w-5 text-brand-500" /> My Tickets
          </h2>

          {loading ? (
            <p className="text-sm text-slate-500">Loading your bookings…</p>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No bookings yet — once you book a venue, your ticket will show up here.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {bookings.map((b) => {
                const dt = new Date(b.dateTime);
                return (
                  <div
                    key={b._id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-bold text-slate-900">
                          {b.listingTitle || (b.sport ? `${b.sport} Venue` : "Venue")}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            b.status === "Part Paid" || (b.paymentType === "partial" && (b.paidAmount ?? 0) < b.totalAmount)
                              ? "bg-amber-100 text-amber-800"
                              : b.status === "Confirmed"
                              ? "bg-emerald-100 text-emerald-800"
                              : STATUS_STYLES[b.status] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {b.status === "Part Paid"
                            ? "Partially Paid"
                            : b.status === "Confirmed"
                            ? "Fully Paid"
                            : b.status}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span>Order #{b.orderId}</span>
                        {(b.status === "Part Paid" || b.paymentType === "partial") && (b.paidAmount ?? 0) > 0 && (b.paidAmount ?? 0) < b.totalAmount ? (
                          <span className="font-black text-rose-600">
                            ₹{b.totalAmount - (b.paidAmount ?? 0)} remaining <span className="font-normal text-slate-400">of ₹{b.totalAmount}</span>
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-700">₹{b.totalAmount} <span className="text-[11px] font-bold text-emerald-600">(Fully Paid)</span></span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => downloadBookingTicket(b)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/30 transition hover:scale-[1.02] sm:w-auto"
                    >
                      <Download className="h-4 w-4" /> Download Ticket
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* My Coaching */}
        <section className="mt-8 sm:mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <UserRoundCog className="h-5 w-5 text-brand-500" /> My Coaching
          </h2>

          {coachSubsLoading ? (
            <p className="text-sm text-slate-500">Loading your enrolments…</p>
          ) : coachSubs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Not enrolled anywhere yet — join a batch from the Coaches page.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {coachSubs.map((b) => (
                <div
                  key={b._id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-slate-900">{b.batchName}</p>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold capitalize text-brand-600">{b.plan}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COACH_STATUS_STYLES[b.status]}`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(b.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        {b.endDate ? ` – ${new Date(b.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                      </span>
                      <span>Order #{b.orderId}</span>
                      <span className="font-semibold text-slate-700">₹{b.amount}</span>
                    </div>
                  </div>

                  {b.status === "Active" && (
                    <button
                      onClick={() => handleCancelCoachSubscription(b.orderId)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-accent-300 hover:text-accent-600 sm:w-auto"
                    >
                      <X className="h-4 w-4" /> Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* My Tournament Registrations */}
        <section className="mt-8 sm:mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <Trophy className="h-5 w-5 text-brand-500" /> My Tournament Registrations
          </h2>

          {registrationsLoading ? (
            <p className="text-sm text-slate-500">Loading your registrations…</p>
          ) : registrations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No tournament registrations yet — register your team from the Tournaments page.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {registrations.map((r) => (
                <div
                  key={r._id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-slate-900">{r.teamName}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${REGISTRATION_STATUS_STYLES[r.status]}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{r.players.length} player(s)</span>
                      <span>Order #{r.orderId}</span>
                      <span className="font-semibold text-slate-700">₹{r.amount}</span>
                    </div>
                  </div>

                  {r.status === "Registered" && (
                    <button
                      onClick={() => handleCancelRegistration(r.orderId)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-accent-300 hover:text-accent-600 sm:w-auto"
                    >
                      <X className="h-4 w-4" /> Cancel Registration
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* My Communities & Match Lobbies */}
        <section className="mt-8 sm:mt-10 border-t border-slate-150 pt-8 sm:pt-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                <Users className="h-5 w-5 text-brand-500" /> My Communities & Match Lobbies
              </h2>
              <p className="text-xs text-slate-500">Manage clubs you have joined or hosted lobbies</p>
            </div>
            
            {/* Toggle Tab Buttons */}
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setCommunityTab("joined")}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                  communityTab === "joined"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Joined ({joinedClubs.length + joinedLobbies.length})
              </button>
              <button
                onClick={() => setCommunityTab("created")}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                  communityTab === "created"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Created ({createdClubs.length + createdLobbies.length})
              </button>
            </div>
          </div>

          {/* TAB 1: JOINED COMMUNITIES */}
          {communityTab === "joined" ? (
            <div className="space-y-6">
              
              {/* Joined Clubs */}
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Joined Sports Clubs</h3>
                {joinedClubs.length === 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-xs text-slate-500">
                    You haven&apos;t joined any sports clubs yet. Go to the{" "}
                    <button onClick={() => router.push("/community")} className="font-bold text-brand-600 underline">
                      Community
                    </button>{" "}
                    page to discover clubs.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {joinedClubs.map((club) => {
                      const dateStr = club.joinedAt
                        ? new Date(club.joinedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "N/A";
                      return (
                        <div key={club.clubId} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-extrabold uppercase text-sky-700">
                                {club.sport} Club
                              </span>
                              <h4 className="mt-2 text-base font-extrabold text-slate-900">{club.name}</h4>
                              <p className="mt-1 text-xs text-slate-500">Locality: {club.place}</p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                club.status === "Approved"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {club.status === "Approved" ? "Joined ✓" : "Pending Approval"}
                            </span>
                          </div>
                          <div className="mt-4 border-t border-slate-50 pt-3 flex items-center justify-between text-[11px] text-slate-400">
                            <span>Joined on: {dateStr}</span>
                            {club.status === "Pending Approval" && (
                              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                                <Sparkles className="h-3 w-3 animate-pulse" /> Awaiting approval
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Joined Match Lobbies */}
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Joined Match Lobbies</h3>
                {joinedLobbies.length === 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-xs text-slate-500">
                    You haven&apos;t joined any match lobbies yet.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {joinedLobbies.map((lobby) => {
                      const dateStr = lobby.joinedAt
                        ? new Date(lobby.joinedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "N/A";
                      return (
                        <div key={lobby.matchId} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[9px] font-extrabold uppercase text-brand-700">
                                {lobby.sport} Lobby
                              </span>
                              <h4 className="mt-2 text-base font-extrabold text-slate-900">{lobby.title}</h4>
                              <p className="mt-1 text-xs text-slate-500">Venue: {lobby.place} at {lobby.time}</p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                lobby.status === "Approved"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {lobby.status === "Approved" ? "Confirmed ✓" : "Pending Host"}
                            </span>
                          </div>
                          <div className="mt-4 border-t border-slate-50 pt-3 text-[11px] text-slate-400">
                            Joined on: {dateStr}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* TAB 2: CREATED COMMUNITIES (WITH JOIN REQUESTS MANAGEMENT) */
            <div className="space-y-6">
              
              {/* Created Clubs & Groups */}
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">My Created Sports Clubs</h3>
                {createdClubs.length === 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-xs text-slate-500">
                    You haven&apos;t created any clubs. Go to the{" "}
                    <button onClick={() => router.push("/community")} className="font-bold text-brand-600 underline">
                      Community
                    </button>{" "}
                    page to launch a club!
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {createdClubs.map((club) => {
                      const showRequests = !!expandedClubRequests[club.id];
                      const requestsCount = club.requests?.length || 0;
                      return (
                        <div key={club.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                          
                          {/* Club header info */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-extrabold uppercase text-brand-700">
                                  {club.sport}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    club.adminStatus === "Approved"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-150 text-amber-800"
                                  }`}
                                >
                                  {club.adminStatus}
                                </span>
                              </div>
                              <h4 className="mt-1.5 text-base font-extrabold text-slate-900">{club.name}</h4>
                              <p className="mt-0.5 text-xs text-slate-500">Locality: {club.place} | Members: {club.members}</p>
                            </div>
                            
                            {/* Toggle Requests button */}
                            <button
                              onClick={() => toggleRequestsAccordion(club.id)}
                              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                                requestsCount > 0
                                  ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <Bell className="h-3.5 w-3.5" />
                              <span>Requests ({requestsCount})</span>
                              {showRequests ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          </div>

                          {/* Info warning for pending club admin status */}
                          {club.adminStatus !== "Approved" && (
                            <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50/60 p-3 text-xs text-amber-800 border border-amber-100">
                              <Shield className="h-4 w-4 shrink-0 text-amber-600" />
                              <span>This club is pending guideline compliance review by the BookYourVibe admin panel. It is visible to you only.</span>
                            </div>
                          )}

                          {/* Member requests accordion content */}
                          {showRequests && (
                            <div className="mt-4 border-t border-slate-100 pt-4">
                              <h5 className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Join Requests</h5>
                              {requestsCount === 0 ? (
                                <p className="text-xs text-slate-400 italic">No pending requests for this club.</p>
                              ) : (
                                <div className="space-y-2.5">
                                  {club.requests.map((req: any) => {
                                    const reqTime = req.joinedAt
                                      ? new Date(req.joinedAt).toLocaleTimeString("en-IN", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "";
                                    return (
                                      <div
                                        key={req.id}
                                        className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs"
                                      >
                                        <div>
                                          <p className="font-bold text-slate-800">{req.playerName}</p>
                                          <p className="text-[10px] text-slate-400">Requested at {reqTime}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleApproveRequest(club.id, req.id)}
                                            className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white shadow-sm hover:bg-emerald-700"
                                          >
                                            Approve
                                          </button>
                                          <button
                                            onClick={() => handleDeclineRequest(club.id, req.id)}
                                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-500 hover:bg-slate-100"
                                          >
                                            Decline
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              
                              {/* Display Approved Members List */}
                              {club.approvedMembers && club.approvedMembers.length > 1 && (
                                <div className="mt-4 pt-3 border-t border-slate-50">
                                  <h5 className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Members List</h5>
                                  <div className="flex flex-wrap gap-1.5">
                                    {club.approvedMembers.map((member: string, i: number) => (
                                      <span key={i} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                        {member}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Hosted Match Lobbies */}
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">My Hosted Match Lobbies</h3>
                {createdLobbies.length === 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-xs text-slate-500">
                    You haven&apos;t hosted any match lobbies.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {createdLobbies.map((lobby) => (
                      <div key={lobby.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-extrabold uppercase text-sky-700">
                          {lobby.sport} Lobby
                        </span>
                        <h4 className="mt-2 text-base font-extrabold text-slate-900">{lobby.title}</h4>
                        <p className="mt-1 text-xs text-slate-500">Venue: {lobby.place} | Time: {lobby.time}</p>
                        <div className="mt-4 border-t border-slate-50 pt-3 flex items-center justify-between text-xs text-slate-400">
                          <span>Spots left: {lobby.spotsLeft}</span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                            Active Lobbies
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </section>
      </main>

      <Footer />
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
