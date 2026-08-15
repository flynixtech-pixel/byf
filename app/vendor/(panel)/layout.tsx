"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, Menu } from "lucide-react";
import Image from "next/image";
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
  const [desktopSidebarClosed, setDesktopSidebarClosed] = useState(false);
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

  useEffect(() => {
    // Automatically close sidebar on listing detail/edit pages to maximize workspace
    if (pathname.match(/^\/vendor\/listings\/.+/)) {
      setDesktopSidebarClosed(true);
    } else {
      setDesktopSidebarClosed(false);
    }
  }, [pathname]);

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
          desktopClosed={desktopSidebarClosed}
        />
        <div className={`flex-1 min-w-0 flex flex-col transition-[padding] duration-300 ease-in-out ${desktopSidebarClosed ? "lg:pl-0" : "lg:pl-64"}`}>
          {/* Unified Top Header */}
          <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-[#fbf7f1]/90 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-xl text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-900 transition cursor-pointer lg:hidden"
                aria-label="Toggle navigation menu"
              >
                <Menu size={20} />
              </button>
              <button
                type="button"
                onClick={() => setDesktopSidebarClosed(!desktopSidebarClosed)}
                className="hidden lg:flex p-2 rounded-xl text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-900 transition cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                <Menu size={20} />
              </button>
            </div>
            
            <div className="flex items-center gap-5">
              <button className="relative p-2 rounded-full text-slate-500 hover:bg-white hover:shadow-sm transition">
                <Bell size={20} />
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white shadow-sm ring-2 ring-[#fbf7f1]">
                  3
                </span>
              </button>
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-white shadow-sm">
                  <div className="h-full w-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-bold text-xs">
                    {(session.role === "vendor" ? session.ownerName : session.holderName)?.[0] || "?"}
                  </div>
                </div>
                <div className="hidden sm:block">
                  <p className="text-[13px] font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                    {session.role === "vendor" ? session.ownerName : session.holderName}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500">Vendor</p>
                </div>
                <ChevronDown size={14} className="text-slate-400 hidden sm:block group-hover:text-indigo-600 transition-colors" />
              </div>
            </div>
          </header>

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
