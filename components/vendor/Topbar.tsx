"use client";

import { LogOut } from "lucide-react";

export default function Topbar({
  onLogout,
  vendorName = "Book Your Vibes",
}: {
  onLogout?: () => void;
  vendorName?: string;
}) {
  return (
    <header className="h-16 flex items-center justify-end px-4 sm:px-6 border-b border-surface-border bg-cream-200/80 backdrop-blur sticky top-0 z-30">
      <div className="flex items-center gap-1 sm:gap-3">
        <p className="text-sm text-ink-soft hidden sm:block">
          Welcome, <span className="font-semibold text-ink">{vendorName}</span>
        </p>
        {onLogout && (
          <button
            onClick={onLogout}
            aria-label="Logout"
            title="Logout"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-vibe-coral/10 hover:text-vibe-coral transition">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
