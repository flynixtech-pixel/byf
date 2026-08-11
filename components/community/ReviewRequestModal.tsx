"use client";

import { useState } from "react";
import { Calendar, CheckCircle2, Clock, MapPin, ShieldCheck, Trophy, User, X, XCircle } from "lucide-react";
import { respondToParticipantRequest } from "@/lib/api/hostedMatches";
import { ApiError } from "@/lib/api/client";
import type { CustomerNotification, HostedMatch } from "@/lib/api/types";

export interface ReviewRequestModalProps {
  notification?: CustomerNotification | null;
  matchId: string;
  participantId: string;
  playerName: string;
  playerAvatar?: string;
  sport: string;
  turfName: string;
  date: string;
  timeSlot: string;
  entryFee: number;
  requestTime?: string;
  onClose: () => void;
  onUpdated?: (updatedMatch: HostedMatch) => void;
}

export function ReviewRequestModal({
  notification,
  matchId,
  participantId,
  playerName,
  playerAvatar,
  sport,
  turfName,
  date,
  timeSlot,
  entryFee,
  requestTime,
  onClose,
  onUpdated,
}: ReviewRequestModalProps) {
  const [submitting, setSubmitting] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string>("");

  const handleAction = async (action: "accept" | "reject") => {
    setSubmitting(action);
    setError("");
    try {
      const res = await respondToParticipantRequest(matchId, participantId, action);
      if (onUpdated) onUpdated(res.match);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : `Failed to ${action} join request.`);
    } finally {
      setSubmitting(null);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 backdrop-blur-xs">
                <Trophy className="h-4 w-4 text-emerald-400" />
              </span>
              <h3 className="text-sm font-extrabold uppercase tracking-wider">Review Join Request</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/10 p-1.5 text-white transition hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300 font-medium mt-1">Review player details before approving or rejecting</p>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Player Profile Card */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-100 font-extrabold text-brand-700 text-sm shadow-xs">
              {playerAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={playerAvatar} alt={playerName} className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
              ) : (
                getInitials(playerName || "Player")
              )}
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">{playerName}</h4>
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                <User className="h-3 w-3 text-brand-500" /> Community Player
              </p>
            </div>
          </div>

          {/* Request Details Grid */}
          <div className="rounded-2xl border border-slate-100 bg-white p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Requested Sport</span>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-black text-brand-700 text-[11px] uppercase">
                {sport}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Venue / Turf</span>
              <span className="font-extrabold text-slate-900 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {turfName}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Match Date</span>
              <span className="font-extrabold text-slate-900 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-brand-500" /> {date}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Time Slot</span>
              <span className="font-extrabold text-slate-900 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-brand-500" /> {timeSlot}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Entry Fee</span>
              <span className="font-black text-emerald-700 text-sm">
                {entryFee > 0 ? `₹${entryFee}` : "Free (₹0)"}
              </span>
            </div>
          </div>

          {error && <p className="rounded-xl bg-rose-50 p-2.5 text-center font-semibold text-rose-600 text-xs">{error}</p>}

          {/* Action Buttons: Approve & Reject */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => handleAction("reject")}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 py-3.5 font-extrabold text-rose-700 transition active:scale-95 disabled:opacity-50"
            >
              <XCircle className="h-4.5 w-4.5 text-rose-600" />
              <span>{submitting === "reject" ? "Rejecting..." : "❌ Reject"}</span>
            </button>

            <button
              type="button"
              disabled={submitting !== null}
              onClick={() => handleAction("accept")}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 font-extrabold uppercase text-white shadow-md shadow-emerald-600/30 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4.5 w-4.5 text-white" />
              <span>{submitting === "accept" ? "Approving..." : "✅ Approve"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
