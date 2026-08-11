"use client";

import { useEffect, useState } from "react";
import { Bell, Calendar, CheckCircle2, Clock, MapPin, Trophy, User, X, XCircle } from "lucide-react";
import { getCustomerNotifications } from "@/lib/api/notifications";
import { respondToParticipantRequest, getOpenHostedMatches } from "@/lib/api/hostedMatches";
import type { CustomerNotification, HostedMatch } from "@/lib/api/types";
import { ReviewRequestModal } from "./ReviewRequestModal";

export function RequestsDrawer({
  onClose,
  onUpdated,
}: {
  onClose: () => void;
  onUpdated?: (match: HostedMatch) => void;
}) {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [selectedNotif, setSelectedNotif] = useState<CustomerNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerPhone, setPlayerPhone] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const phone = localStorage.getItem("byv_player_phone") || "";
      setPlayerPhone(phone);
    } catch (_) {}
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await getCustomerNotifications(playerPhone || undefined);
      const joinReqs = data.filter((n) => n.type === "join_request");
      setNotifications(joinReqs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [playerPhone]);

  const handleQuickAction = async (notif: CustomerNotification, action: "accept" | "reject") => {
    if (!notif.matchId || !notif.participantId) return;
    setProcessingId(notif._id);
    try {
      const res = await respondToParticipantRequest(notif.matchId, notif.participantId, action);
      if (onUpdated) onUpdated(res.match);
      setNotifications((prev) => prev.filter((n) => n._id !== notif._id));
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-md p-0 sm:items-center sm:p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-900 p-5 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-xs">
                  <Bell className="h-5 w-5 text-amber-400" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold tracking-wide uppercase">Pending Join Requests</h3>
                  <p className="text-[11px] text-slate-300 font-medium">Review and approve player requests for your hosted matches</p>
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

          {/* Requests Feed Body */}
          <div className="p-5 overflow-y-auto space-y-3 text-xs">
            {loading && notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium">Loading requests...</div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Bell className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="font-extrabold text-slate-700 text-sm">No Pending Requests</p>
                <p className="text-[11px] text-slate-400">Join requests sent by players will appear here automatically.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs hover:border-brand-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-black text-brand-700 uppercase tracking-wider">
                        {n.sport || "Match"}
                      </span>
                      <h4 className="mt-1.5 font-extrabold text-slate-900 text-sm">{n.playerName || "Player"}</h4>
                      <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400" /> {n.turfName || "Venue"}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-emerald-700 text-sm block">
                        {n.entryFee && n.entryFee > 0 ? `₹${n.entryFee}` : "Free"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                        {n.date} · {n.timeSlot}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedNotif(n)}
                      className="text-[11px] font-extrabold text-brand-600 hover:underline uppercase tracking-wider"
                    >
                      REVIEW REQUEST →
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={processingId === n._id}
                        onClick={() => handleQuickAction(n, "reject")}
                        className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 font-bold text-rose-700 hover:bg-rose-100 transition"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                      <button
                        type="button"
                        disabled={processingId === n._id}
                        onClick={() => handleQuickAction(n, "accept")}
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-bold text-white shadow-xs transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detailed Review Request Popup */}
      {selectedNotif && (
        <ReviewRequestModal
          notification={selectedNotif}
          matchId={selectedNotif.matchId || ""}
          participantId={selectedNotif.participantId || ""}
          playerName={selectedNotif.playerName || "Player"}
          playerAvatar={selectedNotif.playerAvatar}
          sport={selectedNotif.sport || "Sport"}
          turfName={selectedNotif.turfName || "Venue"}
          date={selectedNotif.date || ""}
          timeSlot={selectedNotif.timeSlot || ""}
          entryFee={selectedNotif.entryFee || 0}
          onClose={() => setSelectedNotif(null)}
          onUpdated={(updatedMatch) => {
            if (onUpdated) onUpdated(updatedMatch);
            setNotifications((prev) => prev.filter((n) => n._id !== selectedNotif._id));
            setSelectedNotif(null);
          }}
        />
      )}
    </>
  );
}
