"use client";

import { useState } from "react";
import { Menu, Bell, UserCircle2 } from "lucide-react";

export default function AdminTopbar({
  onMenuClick,
  adminName = "Super Admin",
}: {
  onMenuClick: () => void;
  adminName?: string;
}) {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-border bg-cream-200/80 px-4 backdrop-blur sm:px-6">
      <button onClick={onMenuClick} className="text-ink-soft hover:text-ink lg:hidden" aria-label="Open menu">
        <Menu size={22} />
      </button>
      <span className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-cream-300 hover:text-ink"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-vibe-coral" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-11 w-64 rounded-xl border border-surface-border bg-white p-3 text-xs text-ink-soft shadow-panel">
              <p className="font-semibold text-ink">Notifications</p>
              <p className="mt-2 text-ink-faint">No new notifications.</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-full border border-surface-border px-2.5 py-1.5">
          <UserCircle2 size={20} className="text-ink-faint" />
          <span className="hidden text-sm font-semibold text-ink sm:inline">{adminName}</span>
        </div>
      </div>
    </header>
  );
}
