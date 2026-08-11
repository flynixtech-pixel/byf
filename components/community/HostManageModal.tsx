"use client";

import { useState } from "react";
import { Check, CreditCard, ShieldCheck, UserCheck, UserX, Users, X } from "lucide-react";
import { respondToParticipantRequest } from "@/lib/api/hostedMatches";
import { ApiError } from "@/lib/api/client";
import type { HostedMatch, HostedMatchParticipant } from "@/lib/api/types";

export function HostManageModal({
  match: initialMatch,
  onClose,
  onUpdated,
}: {
  match: HostedMatch;
  onClose: () => void;
  onUpdated: (match: HostedMatch) => void;
}) {
  const [match, setMatch] = useState<HostedMatch>(initialMatch);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const pendingRequests = match.participants.filter((p) => p.status === "Pending Approval");
  const confirmedPlayers = match.participants.filter((p) => p.status === "Confirmed");
  const paymentPendingPlayers = match.participants.filter((p) => p.status === "Payment Pending");
  const rejectedPlayers = match.participants.filter((p) => p.status === "Rejected");

  const totalCollected = match.participants
    .filter((p) => p.paymentStatus === "paid")
    .reduce((sum, p) => sum + p.amountPaid, 0);

  async function handleRespond(participantId: string, action: "accept" | "reject") {
    setProcessingId(participantId);
    setError("");
    try {
      const res = await respondToParticipantRequest(match.matchId, participantId, action);
      setMatch(res.match);
      onUpdated(res.match);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : `Failed to ${action} join request`);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/60 backdrop-blur-md p-0 sm:items-center sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-900 p-5 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-xs">
                <Users className="h-5 w-5 text-white" />
              </span>
              <div>
                <h3 className="text-base font-extrabold tracking-wide uppercase">Manage Host Match</h3>
                <p className="text-[11px] text-slate-300 font-mono font-bold">Reference: {match.matchId}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Financial Breakdown Card */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Match Financials</span>
              <span className="rounded-full bg-brand-100 text-brand-800 px-2.5 py-0.5 text-[10px] font-black uppercase">
                {match.pricingType === "host_pays_all" ? "Host Pays All" : "Split Cost"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-white p-2.5 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Total Turf Cost</p>
                <p className="text-sm font-extrabold text-slate-900">₹{match.totalTurfCost.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-slate-100">
                <p className="text-[10px] text-emerald-600 font-bold uppercase">Host Paid Amount</p>
                <p className="text-sm font-extrabold text-emerald-700">₹{match.hostPaidAmount.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Player Entry Fee</p>
                <p className="text-sm font-extrabold text-slate-900">
                  {match.entryFeePerPlayer > 0 ? `₹${match.entryFeePerPlayer}` : "₹0 (Free)"}
                </p>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-slate-100">
                <p className="text-[10px] text-indigo-600 font-bold uppercase">Total Collected</p>
                <p className="text-sm font-extrabold text-indigo-700">₹{totalCollected.toLocaleString("en-IN")}</p>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Occupancy Capacity</span>
              <span className="text-slate-900 font-extrabold">
                {confirmedPlayers.length} / {match.maxPlayers} Confirmed Players
              </span>
            </div>
          </div>

          {error && <p className="rounded-xl bg-rose-50 p-2.5 text-center font-semibold text-rose-600">{error}</p>}

          {/* Pending Approval Requests */}
          <div>
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>Pending Join Requests</span>
              <span className="rounded-full bg-amber-500 text-white text-[10px] px-2 py-0.2">
                {pendingRequests.length}
              </span>
            </h4>

            {pendingRequests.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-slate-400 font-medium">
                No pending join requests right now.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((p) => (
                  <div key={p.participantId} className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/50 p-3">
                    <div>
                      <p className="font-extrabold text-slate-800 text-xs">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{p.phone || "No phone attached"}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={processingId === p.participantId}
                        onClick={() => handleRespond(p.participantId, "reject")}
                        className="rounded-xl border border-rose-200 bg-white p-2 text-rose-600 hover:bg-rose-50 transition"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={processingId === p.participantId}
                        onClick={() => handleRespond(p.participantId, "accept")}
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 font-bold text-white shadow-xs transition"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>Accept</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirmed / Active Participants */}
          <div>
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-2">
              Confirmed & Pending Payment ({match.participants.length - pendingRequests.length})
            </h4>

            <div className="space-y-2">
              {match.participants
                .filter((p) => p.status !== "Pending Approval" && p.status !== "Rejected")
                .map((p) => (
                  <div key={p.participantId} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3 shadow-2xs">
                    <div>
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.phone || "Joined player"}</p>
                    </div>

                    <div className="text-right">
                      {p.status === "Confirmed" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                          <Check className="h-3 w-3" /> Paid ₹{p.amountPaid}
                        </span>
                      )}
                      {p.status === "Payment Pending" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                          Payment Pending (₹{match.entryFeePerPlayer})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
