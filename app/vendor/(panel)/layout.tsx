"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import Sidebar from "@/components/vendor/Sidebar";
import BottomNav from "@/components/vendor/BottomNav";
import { VendorPanelSwitcher } from "@/components/vendor/VendorPanelSwitcher";

import { restoreVendorSession, vendorLogout, type VendorProfile } from "@/lib/api/auth";
import { VendorAuthProvider } from "@/components/providers/VendorAuthProvider";

export default function VendorPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState<VendorProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    restoreVendorSession().then((vendor) => {
      if (cancelled) return;
      if (!vendor) {
        router.replace(`/vendor/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      setSession(vendor);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // Deliberately once per panel mount, not on every pathname change: re-validating
    // the session over the network on every navigation (including back/forward) meant
    // a single slow response or transient blip force-logged the vendor out mid-session.
    // The session is trusted for the life of this layout — only explicit logout clears it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await vendorLogout();
    router.replace("/vendor/login");
  }

  if (!ready || !session) {
    return (
      <div className="min-h-screen bg-cream-200 flex items-center justify-center text-ink-soft">
        Checking vendor access...
      </div>
    );
  }

  return (
    <VendorAuthProvider vendor={session} onLoggedOut={() => router.replace("/vendor/login")}>
      <div className="min-h-screen flex bg-cream-200 text-ink relative">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={() => void handleLogout()}
          verticals={session.verticals}
        />
        <div className="flex-1 min-w-0 flex flex-col lg:pl-64">
          {/* Sticky Mobile Header */}
          <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white/95 backdrop-blur-md border-b border-surface-border shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-xl text-ink-soft hover:bg-slate-100 hover:text-ink transition cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu size={22} />
              </button>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-vibe-violet to-vibe-limeDark flex items-center justify-center text-white font-display font-bold text-xs">
                  BV
                </div>
                <span className="font-display font-bold text-ink text-sm">
                  Book Your Vibes
                </span>
              </div>
            </div>
          </div>

          <VendorPanelSwitcher verticals={session.verticals} />
          <main className="flex-1 px-4 sm:px-6 py-6 pb-24 lg:pb-6 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
        <BottomNav verticals={session.verticals} />
      </div>
    </VendorAuthProvider>
  );
}
