"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, X } from "lucide-react";
import { checkUpcomingReminders, requestNotificationPermission } from "@/lib/notifications";

interface ToastNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  timestamp: string;
}

export function GameReminderNotifier() {
  const [activeToast, setActiveToast] = useState<ToastNotification | null>(null);

  useEffect(() => {
    // Initial check on mount
    checkUpcomingReminders();

    // Check every 20 seconds for upcoming reminders
    const interval = setInterval(() => {
      checkUpcomingReminders();
    }, 20000);

    // Listen for custom live-reminder-toast events
    const handleToastEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      const newToast: ToastNotification = {
        id: `toast-${Date.now()}`,
        title: detail.title || "Game Reminder",
        body: detail.body || "",
        icon: detail.icon || "🔔",
        timestamp: detail.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setActiveToast(newToast);
    };

    window.addEventListener("live-reminder-toast", handleToastEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("live-reminder-toast", handleToastEvent);
    };
  }, []);

  // Auto-dismiss toast after 7 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  if (!activeToast) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] max-w-sm w-full animate-in fade-in slide-in-from-top-5 duration-300">
      <div className="rounded-2xl bg-slate-900 border border-slate-700/80 p-4 text-white shadow-2xl backdrop-blur-xl flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 text-lg">
          {activeToast.icon || "🔔"}
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-extrabold text-white truncate">{activeToast.title}</h4>
            <span className="text-[10px] font-semibold text-slate-400 shrink-0">{activeToast.timestamp}</span>
          </div>
          <p className="mt-1 text-xs text-slate-300 font-medium leading-relaxed">{activeToast.body}</p>
        </div>
        <button
          type="button"
          onClick={() => setActiveToast(null)}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
