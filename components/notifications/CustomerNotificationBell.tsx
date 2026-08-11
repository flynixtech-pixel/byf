"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, Check, CheckCheck, Clock, ShieldCheck, UserCheck, UserX, X } from "lucide-react";
import { getCustomerNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api/notifications";
import type { CustomerNotification } from "@/lib/api/types";

/**
 * The bell is mounted twice per page (desktop header + mobile header, both always
 * in the DOM, only CSS-hidden). This module-level singleton keeps exactly one 8s
 * poll running regardless of how many instances are mounted, and broadcasts the
 * result to every subscriber via useSyncExternalStore.
 */
interface NotifState {
  notifications: CustomerNotification[];
  loading: boolean;
}

let sharedState: NotifState = { notifications: [], loading: false };
let currentPhone = "";
let hasFetchedOnce = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<() => void>();

function emit() {
  subscribers.forEach((fn) => fn());
}

function setSharedState(next: Partial<NotifState>) {
  sharedState = { ...sharedState, ...next };
  emit();
}

async function fetchShared() {
  try {
    setSharedState({ loading: true });
    const data = await getCustomerNotifications(currentPhone || undefined);
    setSharedState({ notifications: data, loading: false });
  } catch (_) {
    // Quietly ignore background network/offline errors
    setSharedState({ loading: false });
  }
}

function ensurePolling(phone: string) {
  if (!hasFetchedOnce || phone !== currentPhone) {
    hasFetchedOnce = true;
    currentPhone = phone;
    fetchShared();
  }
  if (!intervalId) {
    intervalId = setInterval(fetchShared, 8_000); // Fast 8s real-time polling
  }
}

function subscribe(cb: () => void) {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
    if (subscribers.size === 0 && intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getSnapshot() {
  return sharedState;
}

export function CustomerNotificationBell({
  onSelectNotification,
}: {
  onSelectNotification?: (notif: CustomerNotification) => void;
}) {
  const [open, setOpen] = useState(false);
  const [playerPhone, setPlayerPhone] = useState<string>("");
  const { notifications, loading } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    try {
      const phone = localStorage.getItem("byv_player_phone") || "";
      setPlayerPhone(phone);
    } catch (_) {}
  }, []);

  useEffect(() => {
    ensurePolling(playerPhone);
  }, [playerPhone]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleItemClick = async (notif: CustomerNotification) => {
    if (!notif.read) {
      try {
        await markNotificationRead(notif._id, playerPhone || undefined);
        setSharedState({
          notifications: sharedState.notifications.map((n) => (n._id === notif._id ? { ...n, read: true } : n)),
        });
      } catch (_) {}
    }
    setOpen(false);
    if (onSelectNotification) {
      onSelectNotification(notif);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(playerPhone || undefined);
      setSharedState({ notifications: sharedState.notifications.map((n) => ({ ...n, read: true })) });
    } catch (_) {}
  };

  function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchShared();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-brand-300 active:scale-95"
      >
        <Bell className="h-4.5 w-4.5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-xs animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />

          <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-3xl border border-slate-100 bg-white p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand-600" />
                <h4 className="text-sm font-extrabold text-slate-900">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-extrabold text-brand-700">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-bold text-brand-600 hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-slate-100 p-1 text-slate-500 hover:bg-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-3 max-h-80 overflow-y-auto space-y-2 text-xs pr-1">
              {loading && notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-medium">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-medium">
                  <Bell className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    onClick={() => handleItemClick(n)}
                    className={`flex items-start gap-3 rounded-2xl p-3 border transition cursor-pointer ${
                      !n.read
                        ? "bg-brand-50/40 border-brand-200 shadow-2xs"
                        : "bg-white border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {n.type === "join_request" && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                          <UserCheck className="h-4 w-4" />
                        </span>
                      )}
                      {n.type === "request_accepted" && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                      {n.type === "request_rejected" && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                          <UserX className="h-4 w-4" />
                        </span>
                      )}
                      {n.type === "payment_confirmed" && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                          <ShieldCheck className="h-4 w-4" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-extrabold text-slate-900 truncate">{n.title}</p>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-600 leading-snug font-medium line-clamp-2">
                        {n.message}
                      </p>
                      {n.type === "request_accepted" && (
                        <span className="mt-1.5 inline-block rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black text-white uppercase tracking-wider shadow-xs hover:bg-emerald-700">
                          PAY NOW →
                        </span>
                      )}
                      {n.type === "join_request" && (
                        <span className="mt-1.5 inline-block rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1 text-[10px] font-black text-white uppercase tracking-wider shadow-xs hover:from-amber-600 hover:to-amber-700">
                          REVIEW REQUEST →
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
