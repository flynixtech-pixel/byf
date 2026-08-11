"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/Sidebar";
import AdminTopbar from "@/components/admin/Topbar";
import { adminLogout, restoreAdminSession, type AdminProfile } from "@/lib/api/auth";
import { AdminAuthProvider } from "@/components/providers/AdminAuthProvider";

const LABELS: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/listings": "Listings",
  "/admin/user-queries": "User Queries",
  "/admin/categories": "Categories",
  "/admin/blog": "Vibe Blog",
  "/admin/banners": "Ad Banners",
  "/admin/users": "Users",
  "/admin/vendor-management": "Vendor Management",
  "/admin/sub-admins": "Manage Sub Admins",
  "/admin/bookings": "Bookings Management",
  "/admin/shared-package-report": "Shared Package Report",
  "/admin/marketing": "Marketing Campaigns",
  "/admin/vendor-payouts": "Vendor Payouts",
  "/admin/refund-payouts": "Refund Payouts",
  "/admin/app-version": "App Version",
  "/admin/system-health": "System Health",
  "/admin/appearance": "Appearance",
};

function currentLabel(pathname: string) {
  const match = Object.keys(LABELS).find((href) => pathname.startsWith(href));
  return match ? LABELS[match] : "Admin";
}

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [session, setSession] = useState<AdminProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    restoreAdminSession().then((admin) => {
      if (cancelled) return;
      if (!admin) {
        router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      setSession(admin);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-200 text-ink-soft">
        Checking admin access...
      </div>
    );
  }

  async function handleLogout() {
    await adminLogout();
    router.replace("/admin/login");
  }

  return (
    <AdminAuthProvider admin={session} onLoggedOut={() => router.replace("/admin/login")}>
      <div className="flex min-h-screen bg-cream-200 text-ink">
        <AdminSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={() => void handleLogout()}
          currentLabel={currentLabel(pathname ?? "")}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar onMenuClick={() => setSidebarOpen(true)} adminName={session.name} />
          <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </AdminAuthProvider>
  );
}
