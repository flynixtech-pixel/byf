"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  LayoutGrid,
  BookOpen,
  Image as ImageIcon,
  Users,
  Building2,
  ShieldCheck,
  CalendarCheck2,
  Wallet,
  Smartphone,
  Activity,
  LogOut,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  comingSoon?: boolean;
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Navigation",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/listings", label: "Listings", icon: Compass },
      { href: "/admin/categories", label: "Categories", icon: LayoutGrid, comingSoon: true },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/blog", label: "Vibe Blog", icon: BookOpen },
      { href: "/admin/banners", label: "Ad Banners", icon: ImageIcon },
    ],
  },
  {
    title: "Management",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/vendor-management", label: "Vendor Management", icon: Building2 },
      { href: "/admin/sub-admins", label: "Manage Sub Admins", icon: ShieldCheck, comingSoon: true },
      { href: "/admin/bookings", label: "Bookings Management", icon: CalendarCheck2 },
    ],
  },
  {
    title: "Payments",
    items: [{ href: "/admin/vendor-payouts", label: "Vendor Payouts", icon: Wallet }],
  },
  {
    title: "Design",
    items: [{ href: "/admin/appearance", label: "Appearance", icon: Palette }],
  },
  {
    title: "System",
    items: [
      { href: "/admin/app-version", label: "App Version", icon: Smartphone },
      { href: "/admin/system-health", label: "System Health", icon: Activity },
    ],
  },
];

export default function AdminSidebar({
  open,
  onClose,
  onLogout,
  currentLabel,
  collapsed,
  onToggleCollapse,
}: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  currentLabel: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <button
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-surface-border bg-white transition-transform duration-200 lg:static ${
          collapsed ? "lg:w-[76px]" : "lg:w-64"
        } w-64 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-surface-border px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-surface-border bg-white">
              <Image src="/logo.jpg" alt="Book Your Vibe" fill sizes="36px" className="object-contain p-1" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-vibe-violet">Admin Studio</p>
                <p className="truncate text-sm font-semibold leading-tight text-ink">Book Your Vibe</p>
                <p className="truncate text-[11px] text-ink-faint">{currentLabel}</p>
              </div>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            className="hidden shrink-0 rounded-lg p-1.5 text-ink-faint hover:bg-cream-300 hover:text-ink lg:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          <button onClick={onClose} className="text-ink-faint hover:text-ink lg:hidden" aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  {group.title}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map(({ href, label, icon: Icon, comingSoon }) => {
                  const active = pathname?.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      title={collapsed ? label : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        active ? "bg-vibe-violet/10 text-vibe-violet" : "text-ink-soft hover:bg-cream-300"
                      }`}
                    >
                      <Icon size={18} strokeWidth={2} />
                      {!collapsed && (
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="truncate">{label}</span>
                          {comingSoon && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-vibe-amber">
                              Soon
                            </span>
                          )}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-surface-border p-3">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-vibe-coral transition-colors hover:bg-vibe-coral/10"
          >
            <LogOut size={18} />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}
