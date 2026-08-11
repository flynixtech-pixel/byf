"use client";

import { useState, useEffect } from "react";
import { Lock, Bell, Info, Cloud, ArrowUpRight, ArrowDownRight, UserPlus, FileText, Plus, Ban, Trophy, Megaphone, MoreVertical, Calendar, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMpinStatus, setMpin, verifyMpin, getVendorDashboardStats, exportVendorBookings, updateVendorProfile, getVendorListings, getVendorProfile, type VendorDashboardStats } from "@/lib/api/vendor";
import type { Listing } from "@/lib/api/types";
import { useVendorAuth } from "@/components/providers/VendorAuthProvider";
import { isVendorOwner } from "@/lib/api/auth";
import { EarningsAndExpenses } from "@/components/vendor/dashboard/EarningsAndExpenses";
import { LastMinuteBoostCard } from "@/components/vendor/dashboard/LastMinuteBoostCard";

export default function DashboardPage() {
  const { vendor } = useVendorAuth();
  const router = useRouter();

  useEffect(() => {
    if (vendor && !vendor.verticals.includes("turf")) {
      const landingByVertical: Record<string, string> = {
        food: "/vendor/food/dashboard",
        events: "/vendor/events/dashboard",
        coaches: "/vendor/coaches/dashboard",
      };
      const path = landingByVertical[vendor.verticals[0]];
      if (path) {
        router.replace(path);
      }
    }
  }, [vendor, router]);

  const vendorName = isVendorOwner(vendor) ? vendor.businessName : vendor.holderName;
  const [stats, setStats] = useState<VendorDashboardStats | null>(null);
  const [pinMode, setPinMode] = useState<"loading" | "create" | "create_confirm" | "enter" | "unlocked">(() =>
    typeof window !== "undefined" && sessionStorage.getItem("byv_vendor_mpin_ok") === "1" ? "unlocked" : "loading"
  );
  const [inputPin, setInputPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function unlock() {
    if (typeof window !== "undefined") sessionStorage.setItem("byv_vendor_mpin_ok", "1");
    setPinMode("unlocked");
  }

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("byv_vendor_mpin_ok") === "1") return;
    getMpinStatus()
      .then(({ hasPin }) => setPinMode(hasPin ? "enter" : "create"))
      .catch(() => setPinMode("create")); // fallback — treat as first-time if API fails
  }, []);

  const [dateRange, setDateRange] = useState("Last 7 Days");
  const [compareWith, setCompareWith] = useState("yesterday");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCompareDropdown, setShowCompareDropdown] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showMatchSummary, setShowMatchSummary] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showByvAlerts, setShowByvAlerts] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<"overview" | "settled">("overview");
  
  // Quick Action Modals
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [showBlockSlot, setShowBlockSlot] = useState(false);
  const [showAddTournament, setShowAddTournament] = useState(false);
  const [showSendOffer, setShowSendOffer] = useState(false);
  const [showSportsModal, setShowSportsModal] = useState(false);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [savingSports, setSavingSports] = useState(false);
  // savedSports — fetched fresh from DB on mount (not from stale session)
  const [savedSports, setSavedSports] = useState<string[]>([]);
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  // Court/sport filter for the Financial Reports table — sent to the API as listingId/sport.
  const [financialFilter, setFinancialFilter] = useState<{ label: string; listingId?: string; sport?: string }>({ label: "All" });
  const [showFinancialFilter, setShowFinancialFilter] = useState(false);

  const DEFAULT_SPORTS = [
    "Box Cricket", "Football", "Badminton", "Tennis", "Basketball", 
    "Volleyball", "Table Tennis", "Swimming", "Squash", "Pickleball", 
    "Snooker / Billiards", "Skating", "Hockey", "Archery", "Shooting", 
    "Gym / Fitness", "Yoga / Zumba", "Padel", "Martial Arts", "Boxing", 
    "Bowling", "Golf / Mini Golf", "Athletics", "Kabaddi"
  ];

  useEffect(() => {
    if (!vendor) return;
    // Always fetch fresh profile from DB to get current sports (session can be stale)
    getVendorProfile()
      .then((profile) => {
        const sports = profile.sports ?? [];
        setSavedSports(sports);
        setSelectedSports(sports);
        if (sports.length === 0) setShowSportsModal(true);
      })
      .catch(() => {
        // Fallback to session data
        const sports = vendor?.sports ?? [];
        setSavedSports(sports);
        setSelectedSports(sports);
        if (sports.length === 0) setShowSportsModal(true);
      });
    getVendorListings().then(setListings).catch(console.error);
  }, [vendor]);

  const handleSaveSports = async () => {
    if (selectedSports.length === 0) {
      alert("Please select at least one sport");
      return;
    }
    setSavingSports(true);
    try {
      await updateVendorProfile({ sports: selectedSports });
      // Update local state to reflect what's now in DB — no localStorage needed
      setSavedSports(selectedSports);
      setShowSportsModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save sports");
    } finally {
      setSavingSports(false);
    }
  };

  const handleCreateBookingClick = () => {
    if (savedSports.length === 0) {
      setShowSportsModal(true);
      return;
    }
    setShowCreateBooking(true);
  };

  const handleBlockSlotClick = () => {
    if (savedSports.length === 0) {
      setShowSportsModal(true);
      return;
    }
    setShowBlockSlot(true);
  };

  const fetchStats = () => {
    let start = "";
    let end = "";
    const today = new Date();
    
    if (dateRange === "Last 7 Days") {
      const d = new Date(); d.setDate(d.getDate() - 7);
      start = d.toISOString().split("T")[0];
      end = today.toISOString().split("T")[0];
    } else if (dateRange === "Last 30 Days") {
      const d = new Date(); d.setDate(d.getDate() - 30);
      start = d.toISOString().split("T")[0];
      end = today.toISOString().split("T")[0];
    } else if (dateRange === "This Month") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      start = d.toISOString().split("T")[0];
      end = today.toISOString().split("T")[0];
    } else if (dateRange === "Prev Month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      start = firstDay.toISOString().split("T")[0];
      end = lastDay.toISOString().split("T")[0];
    } else if (dateRange === "Custom" && startDate && endDate) {
      start = startDate;
      end = endDate;
    }

    if (dateRange !== "Custom" || (startDate && endDate)) {
      getVendorDashboardStats({ startDate: start, endDate: end, compareWith, listingId: financialFilter.listingId, sport: financialFilter.sport })
        .then(setStats)
        .catch(console.error);
    }
  };

  useEffect(() => {
    if (pinMode === "unlocked") {
      fetchStats();
    }
  }, [pinMode, dateRange, compareWith, startDate, endDate, financialFilter]);

  function handleDigit(d: string) {
    if (inputPin.length < 4) {
      const newPin = inputPin + d;
      setInputPin(newPin);
      if (newPin.length === 4) {
        processPin(newPin);
      }
    }
  }

  function handleBackspace() {
    setInputPin((prev) => prev.slice(0, -1));
    setPinError("");
  }

  async function processPin(pin: string) {
    if (submitting) return;
    setSubmitting(true);
    setPinError("");
    try {
      if (pinMode === "create") {
        setFirstPin(pin);
        setInputPin("");
        setPinMode("create_confirm");
      } else if (pinMode === "create_confirm") {
        if (pin !== firstPin) {
          setPinError("PINs do not match. Try again.");
          setInputPin("");
          setPinMode("create");
        } else {
          await setMpin(pin);
          unlock();
        }
      } else if (pinMode === "enter") {
        await verifyMpin(pin);
        unlock();
      }
    } catch (error: any) {
      const msg = typeof error?.describe === "function" ? error.describe() : error?.message || "Something went wrong. Try again.";
      setPinError(pinMode === "enter" ? "Incorrect MPIN. Please try again." : msg);
      setInputPin("");
    } finally {
      setSubmitting(false);
    }
  }

  if (pinMode === "loading") return null;

  if (pinMode !== "unlocked") {
    // Escapes the panel layout's padding so keypad + PIN fit one viewport with no scrolling.
    return (
      <div
        className="-mx-4 -mt-6 -mb-24 flex h-[calc(100dvh-64px)] flex-col items-center justify-center overflow-hidden p-5 text-white sm:-mx-6 lg:-mb-6 lg:h-dvh"
        style={{ background: "linear-gradient(to bottom, #006050, #003020)" }}
      >
        <div className="bg-white/10 p-2.5 rounded-2xl mb-4">
          <Lock size={24} className="text-emerald-400" />
        </div>
        <h1 className="text-xl font-extrabold mb-1.5">Partner Dashboard</h1>
        <p className="text-emerald-100/80 text-xs text-center max-w-xs mb-5">
          {pinMode === "create" ? "Create a 4-digit PIN to secure your business analytics and reports." :
           pinMode === "create_confirm" ? "Confirm your 4-digit PIN." :
           "Enter your 4-digit PIN to securely access business analytics and reports."}
        </p>

        {pinError && <p className="text-rose-400 text-sm mb-3">{pinError}</p>}

        <div className="flex gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${inputPin.length > i ? "bg-emerald-400 border-emerald-400" : "border-emerald-600/50"}`} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-x-6 gap-y-3 max-w-[260px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} onClick={() => handleDigit(n.toString())} className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-xl font-bold hover:bg-white/10 transition active:scale-95">
              {n}
            </button>
          ))}
          <div />
          <button onClick={() => handleDigit("0")} className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-xl font-bold hover:bg-white/10 transition active:scale-95">
            0
          </button>
          <button onClick={handleBackspace} className="w-14 h-14 rounded-full flex items-center justify-center text-emerald-200/50 hover:bg-white/5 transition active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] pb-24 font-sans text-slate-800">
      {/* ── HEADER ── */}
      <div className="bg-[#005e4b] rounded-3xl p-5 mx-4 mt-6 text-white shadow-lg relative z-50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl p-1 overflow-hidden shrink-0 shadow-sm">
              <img src="/apple-icon.png" alt="Logo" className="w-full h-full object-contain"
            loading="lazy"
            decoding="async"
          />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-300 flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> Pitch Report
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight">{vendorName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* BYV Alert — messages the BYV team pushes to venue owners. */}
            <button
              onClick={() => setShowByvAlerts(true)}
              aria-label="BYV Alert"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 text-emerald-100 hover:bg-white/20 transition active:scale-95"
            >
              <Bell size={18} />
            </button>
            <div className="w-10 h-10 rounded-full bg-amber-400 text-amber-900 flex items-center justify-center font-black text-lg border-[3px] border-white shadow-md uppercase">
              {vendorName.charAt(0)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          <div className="flex-1 relative">
            <button 
              onClick={() => { setShowDateDropdown(!showDateDropdown); setShowCompareDropdown(false); }}
              className="w-full bg-white rounded-xl py-3 px-4 flex items-center justify-between text-slate-800 font-bold text-sm shadow-md active:scale-[0.98] transition-transform"
            >
              <span className="flex items-center gap-2"><Calendar size={16} className="text-emerald-600"/> {dateRange === "Custom" ? "Custom Range" : dateRange}</span>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${showDateDropdown ? "rotate-180" : ""}`} />
            </button>
            
            {showDateDropdown && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-4 text-slate-800 z-50 origin-top animate-in fade-in zoom-in duration-200">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {["Last 7 Days", "Last 30 Days", "This Month", "Prev Month", "Last Quarter", "Total"].map((range) => (
                    <button 
                      key={range}
                      onClick={() => { setDateRange(range); setShowDateDropdown(false); }}
                      className={`py-2 px-3 text-xs font-bold rounded-lg transition-colors ${dateRange === range ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-50"}`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
                
                {/* Custom range stays collapsed so the presets read as a simple picker. */}
                <div className="pt-3 border-t border-slate-100">
                  {!showCustomRange ? (
                    <button
                      onClick={() => setShowCustomRange(true)}
                      className={`w-full py-2 px-3 text-xs font-bold rounded-lg transition-colors ${dateRange === "Custom" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-50"}`}
                    >
                      Custom Range…
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Start</label>
                          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">End</label>
                          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                      </div>
                      <button
                        onClick={() => { setDateRange("Custom"); setShowDateDropdown(false); setShowCustomRange(false); }}
                        disabled={!startDate || !endDate}
                        className="w-full bg-slate-900 text-white rounded-xl py-2.5 text-xs font-bold shadow-md hover:bg-slate-800 transition disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => { setShowCompareDropdown(!showCompareDropdown); setShowDateDropdown(false); }}
              className="bg-white/10 rounded-xl px-4 py-3 text-xs font-bold border border-white/20 hover:bg-white/20 transition backdrop-blur-md whitespace-nowrap flex items-center gap-1.5 shadow-inner"
            >
              Vs {compareWith === "yesterday" ? "Yesterday" : "Last Week"}
              <ChevronDown size={14} className={`opacity-70 transition-transform ${showCompareDropdown ? "rotate-180" : ""}`} />
            </button>

            {showCompareDropdown && (
              <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-2 text-slate-800 z-50 origin-top-right animate-in fade-in zoom-in duration-200">
                <button 
                  onClick={() => { setCompareWith("yesterday"); setShowCompareDropdown(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-slate-50 transition ${compareWith === "yesterday" ? "bg-emerald-50/50 text-emerald-600" : ""}`}
                >
                  Vs Yesterday
                </button>
                <button 
                  onClick={() => { setCompareWith("last_week"); setShowCompareDropdown(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-slate-50 transition ${compareWith === "last_week" ? "bg-emerald-50/50 text-emerald-600" : ""}`}
                >
                  Vs Last Week
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 mb-6 flex gap-3 relative z-10">
        <button 
          onClick={() => setShowMatchSummary(true)}
          className="flex-1 bg-white border border-emerald-100 rounded-2xl py-3.5 flex items-center justify-center gap-2 text-emerald-600 font-black text-sm shadow-sm hover:shadow-md hover:bg-emerald-50 transition active:scale-[0.98]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          Match Summary
        </button>
        <button 
          onClick={() => setShowInfoModal(true)}
          className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-100 transition active:scale-[0.98]"
        >
          <Info size={22} />
        </button>
        <button 
          onClick={async () => {
            if (isExporting) return;
            setIsExporting(true);
            try {
              await exportVendorBookings();
            } catch (err) {
              console.error(err);
              alert("Failed to export bookings");
            } finally {
              setIsExporting(false);
            }
          }}
          className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-100 transition active:scale-[0.98]"
        >
          {isExporting ? <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> : <Cloud size={22} />}
        </button>
      </div>

      <div className="px-5 space-y-5">
        {/* Dashboard Navigation Tabs */}
        <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setDashboardTab("overview")}
            className={`flex-1 rounded-xl py-2.5 text-xs font-extrabold transition ${
              dashboardTab === "overview" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Dashboard Overview
          </button>
          <button
            onClick={() => setDashboardTab("settled")}
            className={`flex-1 rounded-xl py-2.5 text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
              dashboardTab === "settled" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Payment Settled
          </button>
        </div>

        {dashboardTab === "settled" ? (
          /* Payment Settled Panel inside Dashboard */
          <div className="space-y-4 rounded-3xl bg-white p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">BYV Bank Payouts</p>
                <h3 className="text-lg font-extrabold text-slate-900">Settled Payments Summary</h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700">
                Verified Bank A/c
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-emerald-50/70 p-4 border border-emerald-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Settled</p>
                <p className="mt-1 text-2xl font-black text-emerald-800">
                  ₹{(stats?.totalEarnings ?? 0).toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-[9px] font-medium text-emerald-600">Transferred directly to bank</p>
              </div>
              <div className="rounded-2xl bg-blue-50/70 p-4 border border-blue-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Settled Orders</p>
                <p className="mt-1 text-2xl font-black text-blue-800">
                  {stats?.settledBookingsCount || 0}
                </p>
                <p className="mt-1 text-[9px] font-medium text-blue-600">100% payout completed</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-extrabold text-slate-900 mb-2">Recent Settled Transactions</h4>
              <div className="space-y-2">
                {((stats as any)?.recentTransactions || []).length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-2xl">
                    No recent transactions.
                  </div>
                ) : (
                  ((stats as any)?.recentTransactions || []).map((tx: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{tx.customerName || "Online Player"}</p>
                        <p className="text-[10px] text-slate-500">{tx.date} · {tx.paymentMethod}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-emerald-600">₹{tx.amount}</p>
                        <span className="text-[8px] font-extrabold text-emerald-700 uppercase bg-emerald-100 px-1.5 py-0.5 rounded">
                          Settled
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Link
              href="/vendor/payments"
              className="flex items-center justify-center gap-1.5 w-full rounded-2xl bg-slate-950 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition"
            >
              View Full Bank Statement &amp; Reports →
            </Link>
          </div>
        ) : (
          <>
        {/* ── METRICS GRID ── */}
        {/* Each metric links to the page where the vendor can act on it. */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/vendor/payments" className="block bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden transition hover:shadow-md active:scale-[0.98]">
            <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-emerald-50 to-transparent" />
            <div className="flex justify-between items-start mb-2 relative">
              <p className="text-[10px] font-extrabold text-emerald-500 tracking-wider uppercase">Revenue</p>
              <ArrowUpRight size={16} className="text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mb-2">₹{stats?.totalEarnings?.toLocaleString("en-IN") || 0}</p>
            <div className={`rounded-lg px-2 py-1 inline-flex items-center gap-1 ${(stats?.earningsTrend ?? 0) >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              {(stats?.earningsTrend ?? 0) >= 0 ? <ArrowUpRight size={12} className="text-emerald-600" /> : <ArrowDownRight size={12} className="text-rose-600" />}
              <span className={`text-[10px] font-bold ${(stats?.earningsTrend ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {(stats?.earningsTrend ?? 0) >= 0 ? '+' : ''}{stats?.earningsTrend || 0}% 
                <span className={`font-medium opacity-70 ml-1`}>vs prev</span>
              </span>
            </div>
          </Link>

          <Link href="/vendor/bookings" className="block bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden transition hover:shadow-md active:scale-[0.98]">
            <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-blue-50 to-transparent" />
            <div className="flex justify-between items-start mb-2 relative">
              <p className="text-[10px] font-extrabold text-blue-500 tracking-wider uppercase">Bookings</p>
              <ArrowUpRight size={16} className="text-blue-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mb-2">{stats?.settledBookingsCount || 0}</p>
            <div className={`rounded-lg px-2 py-1 inline-flex items-center gap-1 ${(stats?.bookingsTrend ?? 0) >= 0 ? 'bg-blue-50' : 'bg-rose-50'}`}>
              {(stats?.bookingsTrend ?? 0) >= 0 ? <ArrowUpRight size={12} className="text-blue-600" /> : <ArrowDownRight size={12} className="text-rose-600" />}
              <span className={`text-[10px] font-bold ${(stats?.bookingsTrend ?? 0) >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                {(stats?.bookingsTrend ?? 0) >= 0 ? '+' : ''}{stats?.bookingsTrend || 0}% 
                <span className={`font-medium opacity-70 ml-1`}>vs prev</span>
              </span>
            </div>
          </Link>

          <Link href="/vendor/bookings" className="block bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden transition hover:shadow-md active:scale-[0.98]">
            <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-amber-50 to-transparent" />
            <div className="flex justify-between items-start mb-2 relative">
              <p className="text-[10px] font-extrabold text-amber-500 tracking-wider uppercase">Occupancy</p>
              <ArrowDownRight size={16} className="text-amber-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mb-2">{stats?.occupancyRate || 0}%</p>
            <div className={`rounded-lg px-2 py-1 inline-flex items-center gap-1 ${(stats?.occupancyTrend ?? 0) >= 0 ? 'bg-amber-50' : 'bg-rose-50'}`}>
              {(stats?.occupancyTrend ?? 0) >= 0 ? <ArrowUpRight size={12} className="text-amber-600" /> : <ArrowDownRight size={12} className="text-rose-600" />}
              <span className={`text-[10px] font-bold ${(stats?.occupancyTrend ?? 0) >= 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                {(stats?.occupancyTrend ?? 0) >= 0 ? '+' : ''}{stats?.occupancyTrend || 0}% 
                <span className={`font-medium opacity-70 ml-1`}>vs prev</span>
              </span>
            </div>
          </Link>

          <Link href="/vendor/statistics" className="block bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden transition hover:shadow-md active:scale-[0.98]">
            <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-purple-50 to-transparent" />
            <div className="flex justify-between items-start mb-2 relative">
              <p className="text-[10px] font-extrabold text-purple-500 tracking-wider uppercase">Customers</p>
              <ArrowUpRight size={16} className="text-purple-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mb-2">{stats?.customersCount || 0}</p>
            <div className={`rounded-lg px-2 py-1 inline-flex items-center gap-1 ${(stats?.customersTrend ?? 0) >= 0 ? 'bg-purple-50' : 'bg-rose-50'}`}>
              <UserPlus size={12} className={(stats?.customersTrend ?? 0) >= 0 ? "text-purple-600" : "text-rose-600"} />
              <span className={`text-[10px] font-bold ${(stats?.customersTrend ?? 0) >= 0 ? 'text-purple-700' : 'text-rose-700'}`}>
                {(stats?.customersTrend ?? 0) >= 0 ? '+' : ''}{stats?.customersTrend || 0}% 
                <span className={`font-medium opacity-70 ml-1`}>vs prev</span>
              </span>
            </div>
          </Link>
        </div>

        {/* ── BYV EARNINGS + EXPENSES ── */}
        <EarningsAndExpenses byvEarnings={stats?.totalEarnings ?? 0} />

        {/* ── LAST MINUTE BOOST CARD ── */}
        <LastMinuteBoostCard
          listings={listings}
          onListingUpdated={(updated) =>
            setListings((prev) => prev.map((l) => (l._id === updated._id ? updated : l)))
          }
        />

        {/* ── LIVE COURT STATUS ── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="text-[11px] font-extrabold text-slate-700 tracking-widest uppercase flex items-center gap-1.5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Court Status
          </p>
          <div className="space-y-4 mb-6">
            {stats && stats.courtStatus.length > 0 ? (
              stats.courtStatus.map((court, idx) => {
                const colors = [
                  { text: "text-emerald-500", bg: "bg-emerald-500" },
                  { text: "text-blue-500", bg: "bg-blue-500" },
                  { text: "text-amber-500", bg: "bg-amber-500" }
                ];
                const c = colors[idx % colors.length];
                const maxBookings = Math.max(...stats.courtStatus.map((s) => s.bookings), 1);
                const share = Math.round((court.bookings / maxBookings) * 100);
                return (
                  <div key={court.listingId}>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-600 truncate pr-2">{court.title}</span>
                      <span className={`${c.text} shrink-0`}>{court.bookings} booking{court.bookings === 1 ? "" : "s"}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${c.bg} rounded-full`} style={{ width: `${share}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No paid bookings in this period yet.</p>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Peak Hour Today</p>
              <p className="text-sm font-bold text-slate-800">{stats?.peakHourToday ?? "—"}</p>
            </div>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Bookings Today</p>
              <p className="text-sm font-bold text-slate-800">{stats?.bookingsToday ?? 0}</p>
            </div>
          </div>
        </div>
        </>
        )}

        {/* ── MATCH SUMMARY MODAL ── */}
        {showMatchSummary && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowMatchSummary(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full p-1 transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              
              <div className="flex items-center gap-2 mb-1">
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                 <h2 className="text-lg font-black text-slate-900">Performance Summary</h2>
              </div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-6">{dateRange === "Custom" ? "Custom Range" : dateRange}</p>
              
              <div className="flex justify-end gap-4 mb-6">
                <span className="flex items-center gap-1.5 text-[9px] font-extrabold text-slate-500 uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-slate-200" /> Previous</span>
                <span className="flex items-center gap-1.5 text-[9px] font-extrabold text-slate-500 uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Current</span>
              </div>

              <div className="flex justify-around h-32 mb-6 px-2 border-b border-slate-50 pb-2">
                {[
                  { label: "Revenue", curr: stats?.totalEarnings || 0, trend: stats?.earningsTrend || 0 },
                  { label: "Bookings", curr: stats?.settledBookingsCount || 0, trend: stats?.bookingsTrend || 0 },
                  { label: "Customers", curr: stats?.customersCount || 0, trend: stats?.customersTrend || 0 },
                ].map((item, idx) => {
                  let prev = item.curr / (1 + (item.trend / 100));
                  if (!isFinite(prev) || isNaN(prev)) prev = 0;
                  const max = Math.max(item.curr, prev, 1);
                  const currH = Math.max(10, (item.curr / max) * 100);
                  const prevH = Math.max(10, (prev / max) * 100);
                  
                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full w-14">
                       <div className="flex gap-1.5 items-end h-full w-full justify-center mb-3">
                         <div className="w-3.5 sm:w-4 bg-slate-200 rounded-t-md transition-all duration-700 ease-out" style={{ height: `${prevH}%` }} />
                         <div className="w-3.5 sm:w-4 bg-indigo-500 rounded-t-md transition-all duration-700 ease-out delay-100" style={{ height: `${currH}%` }} />
                       </div>
                       <p className="text-[9px] font-bold text-slate-400">{item.label}</p>
                    </div>
                  );
                })}
              </div>
              
              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                <div>
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Revenue</p>
                  <p className="text-[13px] font-black text-slate-800">₹{stats?.totalEarnings?.toLocaleString("en-IN") || 0}</p>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Bookings</p>
                  <p className="text-[13px] font-black text-slate-800">{stats?.settledBookingsCount || 0}</p>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Occupancy</p>
                  <p className="text-[13px] font-black text-slate-800">{stats?.occupancyRate || 0}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── INFO MODAL ── */}
        {showInfoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowInfoModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full p-1 transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              
              <h2 className="text-lg font-black text-slate-900 mb-4">Instructions / Info</h2>
              
              <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
                Select any custom start and end date combination using the date picker. The dashboard will automatically recalculate the metrics for the chosen range.
              </p>

              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                    <Calendar size={18} className="text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Date Range</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Filter dashboard data by specific dates to view your performance accurately.</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                    <Cloud size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Export Excel</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Download a detailed XLSX sheet of all your historical bookings data easily.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BYV ALERT — messages from the BYV team to the venue owner ── */}
        {showByvAlerts && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowByvAlerts(false)}>
            <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowByvAlerts(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full p-1 transition" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Bell size={17} />
                </span>
                <h2 className="text-lg font-black text-slate-900">BYV Alert</h2>
              </div>

              <p className="text-xs font-medium text-slate-500 mb-5 leading-relaxed">
                Alerts and messages from the BYV team about your venue — payouts, policy updates, and demand tips — will appear here.
              </p>

              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
                <p className="text-sm font-bold text-slate-600">No alerts right now</p>
                <p className="mt-1 text-[11px] font-medium text-slate-400">You&apos;re all caught up. New messages from BYV will show up here.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── LAST MIN BOOST ── */}
        <LastMinuteBoostCard listings={listings} onListingUpdated={(updated) => setListings((ls) => ls.map((x) => (x._id === updated._id ? updated : x)))} />

        {/* ── FINANCIAL REPORTS ── */}
        <div>
          <div className="flex justify-between items-center mb-3 relative">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <FileText size={16} className="text-emerald-600" /> Financial Reports
            </h2>
            <div className="relative">
              <button
                onClick={() => setShowFinancialFilter(!showFinancialFilter)}
                className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all ${
                  financialFilter.label !== "All"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "text-slate-500 border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
                {financialFilter.label === "All" ? "Filter" : `Filter: ${financialFilter.label}`}
              </button>

              {showFinancialFilter && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto pr-1">
                  <div className="px-3 py-1 text-[8px] font-black uppercase text-slate-400 tracking-wider">Filter By Court/Sport</div>
                  <button
                    onClick={() => { setFinancialFilter({ label: "All" }); setShowFinancialFilter(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 transition ${financialFilter.label === "All" ? "text-emerald-600 bg-emerald-50/50" : "text-slate-700"}`}
                  >
                    All Courts & Sports
                  </button>
                  {listings.map(l => (
                    <button
                      key={l._id}
                      onClick={() => { setFinancialFilter({ label: l.title, listingId: l._id }); setShowFinancialFilter(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 transition truncate ${financialFilter.listingId === l._id ? "text-emerald-600 bg-emerald-50/50" : "text-slate-700"}`}
                    >
                      Court: {l.title}
                    </button>
                  ))}
                  {savedSports.map(sport => (
                    <button
                      key={sport}
                      onClick={() => { setFinancialFilter({ label: sport, sport }); setShowFinancialFilter(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 transition truncate ${financialFilter.sport === sport ? "text-emerald-600 bg-emerald-50/50" : "text-slate-700"}`}
                    >
                      Sport: {sport}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 text-left">Period</th>
                  <th className="py-3 px-4 text-right">Bookings</th>
                  <th className="py-3 px-4 text-right">Avg Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {[
                  { label: "Today", row: stats?.financialReport?.today },
                  { label: "Weekdays (Mon-Thu)", row: stats?.financialReport?.weekdays },
                  { label: "Weekend (FSS)", row: stats?.financialReport?.weekend },
                  { label: "This Month", row: stats?.financialReport?.thisMonth },
                ].map(({ label, row }) => (
                  <tr key={label}>
                    <td className="py-4 px-4 font-extrabold">{label}</td>
                    <td className="py-4 px-4 text-right">{row?.bookings ?? 0}</td>
                    <td className="py-4 px-4 text-right">₹{(row?.avgRate ?? 0).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                <tr className="bg-emerald-50/50">
                  <td className="py-4 px-4 font-black text-slate-900">Total YTD</td>
                  <td className="py-4 px-4 text-right font-black text-slate-900">{(stats?.financialReport?.totalYtd?.bookings ?? 0).toLocaleString()}</td>
                  <td className="py-4 px-4 text-right font-black text-slate-900">₹{(stats?.financialReport?.totalYtd?.avgRate ?? 0).toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-2">
            <button onClick={handleCreateBookingClick} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-50 transition">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-100">
                <Plus size={18} />
              </div>
              <span className="text-[9px] font-extrabold text-slate-600 text-center leading-tight">Create<br/>Booking</span>
            </button>
            <button onClick={handleBlockSlotClick} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-50 transition">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
                <Ban size={18} />
              </div>
              <span className="text-[9px] font-extrabold text-rose-600 text-center leading-tight">Block<br/>Slot</span>
            </button>
            <button onClick={() => setShowAddTournament(true)} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-50 transition">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
                <Trophy size={18} />
              </div>
              <span className="text-[9px] font-extrabold text-amber-600 text-center leading-tight">Add<br/>Tournament</span>
            </button>
            <button onClick={() => setShowSendOffer(true)} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-50 transition">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100">
                <Megaphone size={18} />
              </div>
              <span className="text-[9px] font-extrabold text-emerald-600 text-center leading-tight">Send<br/>Offer</span>
            </button>
          </div>
        </div>

        {/* ── REVENUE TREND ── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Revenue Trend</h2>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Last 7 Days</p>
            </div>
            <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={16} /></button>
          </div>
          
          {(() => {
            const trend = stats?.revenueTrend ?? [];
            const maxEarnings = Math.max(...trend.map((t) => t.earnings), 1);
            const points = trend.map((t, i) => {
              const x = trend.length > 1 ? (i / (trend.length - 1)) * 100 : 0;
              const y = 38 - (t.earnings / maxEarnings) * 34;
              return { x, y };
            });
            const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
            const area = points.length ? `${line} L100,40 L0,40 Z` : "";
            const dayLabel = (dateStr: string) => ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][new Date(`${dateStr}T00:00:00`).getDay()];
            const hasEarnings = trend.some((t) => t.earnings > 0);

            return (
              <div className="h-32 relative flex items-end justify-between border-b border-slate-100 pb-2">
                {hasEarnings ? (
                  <div className="absolute inset-0 pb-6">
                    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                      <defs>
                        <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="rgb(16 185 129 / 0.2)" />
                          <stop offset="100%" stopColor="rgb(16 185 129 / 0)" />
                        </linearGradient>
                      </defs>
                      <path d={area} fill="url(#gradient)" />
                      <path d={line} fill="none" stroke="rgb(16 185 129)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ) : (
                  <p className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-400 pb-6">No earnings in the last 7 days yet.</p>
                )}

                {trend.map((t) => (
                  <span key={t.date} className="text-[9px] font-bold text-slate-400 z-10 pt-28 w-6 text-center">{dayLabel(t.date)}</span>
                ))}
              </div>
            );
          })()}
        </div>

      </div>
      {/* ── QUICK ACTION MODALS ── */}
      {/* 1. Create Booking Modal */}
      {showCreateBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowCreateBooking(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full p-1.5 transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2 className="text-[17px] font-black text-slate-900 mb-5">Create Booking</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Customer Name</label>
                <input type="text" placeholder="Enter customer name" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Phone Number</label>
                <input type="text" placeholder="Enter phone number" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Date</label>
                  <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600" />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Court / Sport</label>
                  <select 
                    value={selectedListingId}
                    onChange={(e) => {
                      setSelectedListingId(e.target.value);
                      setSelectedSlots([]);
                    }}
                    className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600 appearance-none bg-white"
                  >
                    <option value="">Select a court</option>
                    {listings.length > 0 
                      ? listings.map(l => <option key={l._id} value={l._id}>{l.title}</option>)
                      : vendor?.sports?.map(s => <option key={s} value={s}>{s}</option>)
                    }
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Select Time</label>
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                  {(() => {
                    let slots: { startTime: string, blocked?: boolean }[] = [];
                    const activeListing = listings.find(l => l._id === selectedListingId);
                    
                    if (activeListing) {
                      slots = activeListing.slotsList || [];
                    } else if (selectedListingId) {
                      slots = Array.from({ length: 18 }).map((_, i) => ({
                        startTime: `${(i + 6).toString().padStart(2, "0")}:00`,
                        blocked: false
                      }));
                    }
                    
                    if (slots.length === 0) {
                      return <div className="col-span-4 text-xs text-slate-400 py-4 text-center border border-dashed rounded-xl border-slate-200">No slots available</div>;
                    }

                    return slots.map((slot, i) => {
                      const isSelected = selectedSlots.includes(slot.startTime);
                      const isBooked = slot.blocked;
                      return (
                        <button 
                          key={i}
                          onClick={() => {
                            if (isBooked) return;
                            if (isSelected) {
                              setSelectedSlots(selectedSlots.filter(s => s !== slot.startTime));
                            } else {
                              setSelectedSlots([...selectedSlots, slot.startTime]);
                            }
                          }}
                          className={`border rounded-xl py-2 text-xs font-bold transition ${
                            isSelected ? 'border-2 border-emerald-500 text-emerald-600' :
                            isBooked ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed' :
                            'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
              <button className="w-full bg-[#00a86b] hover:bg-[#00965f] text-white rounded-xl py-3.5 text-[13px] font-black mt-2 shadow-sm transition active:scale-[0.98]">
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Block Slot Modal */}
      {showBlockSlot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowBlockSlot(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full p-1.5 transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2 className="text-[17px] font-black text-slate-900 mb-5">Block Slot</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Reason for Blocking</label>
                <select className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-600 appearance-none bg-white">
                  <option>Maintenance</option>
                  <option>Private Event</option>
                  <option>Tournament</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">From Date</label>
                  <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-600" />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">To Date</label>
                  <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">From Time</label>
                  <input type="time" className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-600" />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">To Time</label>
                  <input type="time" className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-600" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Court / Sport</label>
                <select 
                  value={selectedListingId}
                  onChange={(e) => {
                    setSelectedListingId(e.target.value);
                    setSelectedSlots([]);
                  }}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-600 appearance-none bg-white"
                >
                  <option value="">Select a court</option>
                  {listings.length > 0 
                    ? listings.map(l => <option key={l._id} value={l._id}>{l.title}</option>)
                    : vendor?.sports?.map(s => <option key={s} value={s}>{s}</option>)
                  }
                </select>
              </div>
              <button className="w-full bg-[#f41b44] hover:bg-[#e0163b] text-white rounded-xl py-3.5 text-[13px] font-black mt-2 shadow-sm transition active:scale-[0.98]">
                Block Slots
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add Tournament Modal */}
      {showAddTournament && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowAddTournament(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full p-1.5 transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2 className="text-[17px] font-black text-slate-900 mb-5">Add Tournament</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Tournament Name</label>
                <input type="text" placeholder="e.g. Summer Smash Cup" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Sport</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-600 appearance-none bg-white">
                    {savedSports.length > 0 ? (
                      savedSports.map(s => <option key={s} value={s}>{s}</option>)
                    ) : (
                      <option value="">No sports configured</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Entry Fee (₹)</label>
                  <input type="number" placeholder="500" className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Start Date</label>
                  <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-600" />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">End Date</label>
                  <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-600" />
                </div>
              </div>
              <button className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl py-3.5 text-[13px] font-black mt-2 shadow-sm transition active:scale-[0.98]">
                Publish Tournament
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Send Offer Modal */}
      {showSendOffer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowSendOffer(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full p-1.5 transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h2 className="text-[17px] font-black text-slate-900 mb-5">Send Offer</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Offer Title</label>
                <input type="text" placeholder="e.g. Weekend Special 20% Off" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Discount Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button className="border-2 border-[#00a86b] text-[#00a86b] rounded-xl py-2.5 text-xs font-black flex items-center justify-center gap-1">
                    <span>%</span> Percentage
                  </button>
                  <button className="border border-slate-200 text-slate-500 rounded-xl py-2.5 text-xs font-bold hover:border-slate-300 flex items-center justify-center gap-1">
                    <span>₹</span> Flat Amount
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Discount Value</label>
                <input type="number" placeholder="20" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Valid From</label>
                  <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600" />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Valid Until</label>
                  <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-600" />
                </div>
              </div>
              
              <p className="text-[9px] font-medium text-slate-400 leading-relaxed mt-2">
                This offer will be sent to <strong className="text-slate-600">450+</strong> registered customers via push notification.
              </p>

              <button className="w-full bg-[#00a86b] hover:bg-[#00965f] text-white rounded-xl py-3.5 text-[13px] font-black mt-2 shadow-sm transition active:scale-[0.98]">
                Send Offer to Customers
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 5. Sports Selection Modal */}
      {showSportsModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h2 className="text-[17px] font-black text-slate-900 mb-2">Select Your Sports</h2>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Please choose the sports or games you provide at your facility. This helps us configure your booking slots.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {DEFAULT_SPORTS.map(sport => {
                const isSelected = selectedSports.includes(sport);
                return (
                  <button
                    key={sport}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedSports(selectedSports.filter(s => s !== sport));
                      } else {
                        setSelectedSports([...selectedSports, sport]);
                      }
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      isSelected 
                        ? 'bg-indigo-500 text-white shadow-sm border border-indigo-600' 
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {sport}
                  </button>
                )
              })}
            </div>
            
            <button 
              onClick={handleSaveSports}
              disabled={savingSports || selectedSports.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl py-3.5 text-[13px] font-black shadow-sm transition active:scale-[0.98] flex items-center justify-center"
            >
              {savingSports ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Save Selected Sports"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
