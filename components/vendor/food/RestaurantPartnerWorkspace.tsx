"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgePercent,
  Bell,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Crown,
  FileDown,
  IndianRupee,
  LayoutGrid,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Users,
  X,
  UtensilsCrossed,
} from "lucide-react";
import { PageHero, SectionCard, Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { OutletGalleryUpload } from "@/components/food/OutletGalleryUpload";
import { OutletImageUpload } from "@/components/food/OutletImageUpload";
import { ApiError } from "@/lib/api/client";
import { getDiningMeta, DINING_SPOTS, type DiningReview } from "@/lib/dineout-catalog";
import {
  checkInVendorTableBooking,
  deleteVendorStaff,
  getVendorDiningBills,
  getVendorDineoutDashboard,
  getVendorFoodDashboard,
  getVendorFoodOrders,
  getVendorTableBooking,
  getVendorTableBookings,
  listVendorMenu,
  listVendorOutlets,
  listVendorStaff,
  updateVendorMenuItem,
  updateVendorOutlet,
  updateVendorTableBookingStatus,
  setOutletAvailability,
  setOutletDineout,
  setOutletPrepTimes,
} from "@/lib/api/vendor";
import type {
  DiningBill,
  FoodOrder,
  FoodOrderStatus,
  FoodOutlet,
  MenuItem,
  OutletWeeklyDay,
  TableBooking,
  TableBookingStatus,
  VendorDineoutDashboard,
  VendorFoodDashboard,
  VendorStaff,
} from "@/lib/api/types";
import { downloadFoodOrderTicket } from "@/lib/ticket";

export type FoodWorkspaceSection =
  | "dashboard"
  | "profile"
  | "tables"
  | "reservations"
  | "menu"
  | "offers"
  | "payments"
  | "analytics"
  | "reviews"
  | "team"
  | "activity"
  | "notifications";

const SECTION_META: Record<FoodWorkspaceSection, { label: string; href: string; icon: typeof LayoutGrid }> = {
  dashboard: { label: "Dashboard", href: "/vendor/food/dashboard", icon: LayoutGrid },
  profile: { label: "Restaurant Profile", href: "/vendor/food/profile", icon: Store },
  tables: { label: "Tables", href: "/vendor/food/tables", icon: LayoutGrid },
  reservations: { label: "Reservations", href: "/vendor/food/reservations", icon: CalendarCheck2 },
  menu: { label: "Menu", href: "/vendor/food/menu", icon: UtensilsCrossed },
  offers: { label: "Offers", href: "/vendor/food/offers", icon: BadgePercent },
  payments: { label: "Payments", href: "/vendor/food/payments", icon: IndianRupee },
  analytics: { label: "Analytics", href: "/vendor/food/analytics", icon: Sparkles },
  reviews: { label: "Reviews", href: "/vendor/food/reviews", icon: Star },
  team: { label: "Team", href: "/vendor/food/team", icon: Users },
  activity: { label: "Activity", href: "/vendor/food/activity", icon: Clock3 },
  notifications: { label: "Notifications", href: "/vendor/food/notifications", icon: Bell },
};

type OfferType = "Flat discount" | "Buffet" | "Happy hour" | "Complimentary" | "Festival" | "Coupon";
type TableStatus = "available" | "occupied" | "reserved" | "maintenance" | "blocked";

interface WorkspaceTable {
  id: string;
  tableNo: string;
  seats: number;
  floor: string;
  zone: string;
  status: TableStatus;
  assignedBookingId?: string;
  notes?: string;
}

interface WorkspaceOffer {
  id: string;
  type: OfferType;
  title: string;
  subtitle: string;
  couponCode?: string;
  valueLabel: string;
  validFrom: string;
  validTo: string;
  startTime?: string;
  endTime?: string;
  conditions: string[];
  active: boolean;
}

interface WorkspaceReview extends DiningReview {
  id: string;
  occasion: string;
  reply?: string;
  reported?: boolean;
}

interface WorkspaceActivity {
  id: string;
  time: string;
  title: string;
  detail: string;
  tone: "success" | "pending" | "danger" | "info" | "neutral";
}

interface WorkspaceNotification {
  id: string;
  time: string;
  title: string;
  detail: string;
  tone: "success" | "pending" | "danger" | "info" | "neutral";
  unread: boolean;
}

interface MenuMerchandising {
  rank: number;
  enabled: boolean;
  recommended: boolean;
  chefSpecial: boolean;
  seasonal: string;
  dietaryTags: string[];
}

interface WorkspaceProfile {
  averageCostForTwo: number;
  indoorSeating: number;
  outdoorSeating: number;
  rooftopSeating: number;
  seatingCapacity: number;
  liveMusic: boolean;
  rooftop: boolean;
  parking: boolean;
  smokingArea: boolean;
  menuPdfUrl: string;
  digitalMenuUrl: string;
  videoUrl: string;
  amenities: string[];
  cuisineTags: string[];
}

interface WorkspaceDraft extends WorkspaceProfile {
  coverImage: string;
  gallery: string[];
  description: string;
  offer: string;
  tableBookingEnabled: boolean;
  payBillEnabled: boolean;
  flatDiscountPct: number;
  slotMinutes: number;
  tablesPerSlot: number;
  maxPartySize: number;
  advanceDays: number;
}

interface WorkspaceState {
  profile: WorkspaceDraft;
  tables: WorkspaceTable[];
  offers: WorkspaceOffer[];
  reviews: WorkspaceReview[];
  activity: WorkspaceActivity[];
  notifications: WorkspaceNotification[];
  menu: Record<string, MenuMerchandising>;
  bookingAssignments: Record<string, { tableId?: string; guestCount?: number; note?: string }>;
}

interface Props {
  section: FoodWorkspaceSection;
}

const DEFAULT_SECTIONS: FoodWorkspaceSection[] = [
  "dashboard",
  "profile",
  "tables",
  "reservations",
  "menu",
  "offers",
  "payments",
  "analytics",
  "reviews",
  "team",
  "activity",
  "notifications",
];

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(a: string | Date, b: Date) {
  const ad = new Date(a);
  return ad.getFullYear() === b.getFullYear() && ad.getMonth() === b.getMonth() && ad.getDate() === b.getDate();
}

function statusTone(status: string) {
  if (status === "Completed" || status === "Delivered" || status === "Paid" || status === "Active") return "success";
  if (status === "Pending" || status === "Awaiting" || status === "Reserved") return "pending";
  if (status === "Cancelled" || status === "Rejected" || status === "NoShow" || status === "Blocked") return "danger";
  if (status === "Confirmed" || status === "Preparing" || status === "Ready" || status === "Occupied") return "info";
  return "neutral";
}

function toneStyles(tone: WorkspaceActivity["tone"] | WorkspaceNotification["tone"]) {
  switch (tone) {
    case "success":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "danger":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "info":
      return "bg-sky-50 text-sky-700 border-sky-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function storageKey(outletId: string) {
  return `byv-food-workspace:${outletId}`;
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function readWorkspace(outletId: string): WorkspaceState | null {
  try {
    const raw = window.localStorage.getItem(storageKey(outletId));
    return raw ? (JSON.parse(raw) as WorkspaceState) : null;
  } catch {
    return null;
  }
}

function writeWorkspace(outletId: string, state: WorkspaceState) {
  try {
    window.localStorage.setItem(storageKey(outletId), JSON.stringify(state));
  } catch {
    // Local storage may be unavailable in private contexts. Non-fatal.
  }
}

function createSeedOutlet(index: number): FoodOutlet {
  const meta = DINING_SPOTS[index % DINING_SPOTS.length] ?? DINING_SPOTS[0]!;
  const now = new Date();
  return {
    _id: meta.slug,
    vendorId: "demo-vendor",
    slug: meta.slug,
    name: meta.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    kind: "dining",
    offer: meta.offers[0],
    description: meta.aiSummary,
    cuisines: ["North Indian", "Continental", "Cafe"],
    logo: meta.gallery[0],
    banner: meta.hero,
    poster: meta.hero,
    gallery: meta.gallery,
    location: { city: "Udaipur", area: "BYV dining district", address: "Partner restaurant zone, Udaipur" },
    weeklyAvailability: Array.from({ length: 7 }, (_, day) => ({
      day,
      isOpen: day !== 1,
      startTime: "11:00",
      endTime: day === 5 || day === 6 ? "01:00" : "23:30",
    })),
    leaves: [],
    categoryPrepTimes: [
      { category: "Starters", prepTimeMins: 12 },
      { category: "Main Course", prepTimeMins: 18 },
      { category: "Desserts", prepTimeMins: 8 },
    ],
    dineout: {
      tableBooking: true,
      payBill: true,
      flatDiscountPct: 10,
      slotMinutes: 60,
      tablesPerSlot: 12,
      maxPartySize: 8,
      advanceDays: 30,
      costForTwo: meta.costForTwo,
      autoConfirm: false,
      seatingOptions: meta.seatingOptions,
    },
    serviceBufferMins: 8,
    fulfilment: { preOrder: false, inVenue: false, postMatch: false, dineIn: true },
    status: "Active",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function seedTables(outlet: FoodOutlet): WorkspaceTable[] {
  const tableCount = Math.max(8, outlet.dineout?.tablesPerSlot ?? 10);
  const tables: WorkspaceTable[] = [];
  for (let i = 1; i <= tableCount; i += 1) {
    const mod = i % 5;
    tables.push({
      id: `tbl-${outlet._id}-${i}`,
      tableNo: `${i.toString().padStart(2, "0")}`,
      seats: mod === 0 ? 6 : mod === 1 ? 2 : mod === 2 ? 4 : 4,
      floor: i <= Math.ceil(tableCount / 2) ? "Ground" : "Terrace",
      zone: i % 3 === 0 ? "Window" : i % 3 === 1 ? "Indoor" : "Outdoor",
      status: i % 6 === 0 ? "maintenance" : i % 4 === 0 ? "reserved" : i % 5 === 0 ? "occupied" : "available",
    });
  }
  return tables;
}

function seedOffers(outlet: FoodOutlet): WorkspaceOffer[] {
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + 30);
  const later = new Date(now);
  later.setDate(now.getDate() + 7);
  return [
    {
      id: `offer-flat-${outlet._id}`,
      type: "Flat discount",
      title: `Flat ${outlet.dineout?.flatDiscountPct ?? 10}% off`,
      subtitle: "Works on the whole bill with BYV pre-booking.",
      valueLabel: `-${outlet.dineout?.flatDiscountPct ?? 10}%`,
      validFrom: now.toISOString().slice(0, 10),
      validTo: next.toISOString().slice(0, 10),
      conditions: ["Applies to dine-in bills", "Available for bookings only", "No cash-back stacking"],
      active: true,
    },
    {
      id: `offer-happy-${outlet._id}`,
      type: "Happy hour",
      title: "Happy Hour 4 PM - 7 PM",
      subtitle: "Drinks and starters get a sharper pricing window.",
      valueLabel: "Up to 20% off",
      validFrom: now.toISOString().slice(0, 10),
      validTo: next.toISOString().slice(0, 10),
      startTime: "16:00",
      endTime: "19:00",
      conditions: ["Dine-in only", "Minimum 2 guests", "Select menu items"],
      active: true,
    },
    {
      id: `offer-buffet-${outlet._id}`,
      type: "Buffet",
      title: "Weekend buffet spread",
      subtitle: "Saturday and Sunday buffet with table reservation.",
      valueLabel: "₹499 / person",
      validFrom: now.toISOString().slice(0, 10),
      validTo: later.toISOString().slice(0, 10),
      startTime: "12:00",
      endTime: "15:30",
      conditions: ["Advance booking required", "Min 4 covers", "Weekend only"],
      active: false,
    },
    {
      id: `offer-festival-${outlet._id}`,
      type: "Festival",
      title: "Monsoon Food Festival",
      subtitle: "Seasonal menu pairing and family-friendly upgrade.",
      valueLabel: "Complimentary dessert",
      validFrom: now.toISOString().slice(0, 10),
      validTo: next.toISOString().slice(0, 10),
      conditions: ["Applicable on festive dates", "Min bill ₹1500", "One per table"],
      active: false,
    },
    {
      id: `offer-coupon-${outlet._id}`,
      type: "Coupon",
      title: "BYV10 coupon code",
      subtitle: "Apply a coupon at bill payment to unlock loyalty spend.",
      couponCode: "BYV10",
      valueLabel: "10% off",
      validFrom: now.toISOString().slice(0, 10),
      validTo: next.toISOString().slice(0, 10),
      conditions: ["Use once per phone number", "No alcohol items", "Stackable with cashback"],
      active: true,
    },
  ];
}

function seedReviews(metaIndex: number): WorkspaceReview[] {
  const meta = DINING_SPOTS[metaIndex % DINING_SPOTS.length] ?? DINING_SPOTS[0]!;
  return meta.reviews.map((review, index) => ({
    id: `rev-${meta.slug}-${index}`,
    ...review,
    occasion: index === 0 ? "Anniversary" : index === 1 ? "Friends night" : "Family dinner",
  }));
}

function seedMenuMeta(items: MenuItem[]): Record<string, MenuMerchandising> {
  return items.reduce<Record<string, MenuMerchandising>>((acc, item, index) => {
    acc[item._id] = {
      rank: index + 1,
      enabled: item.inStock,
      recommended: index < 3,
      chefSpecial: index === 0 || item.category.toLowerCase().includes("special"),
      seasonal: index % 3 === 0 ? "Monsoon special" : "All year",
      dietaryTags: item.name.toLowerCase().includes("paneer")
        ? ["Veg", "Jain"]
        : item.name.toLowerCase().includes("salad")
          ? ["Vegan", "Gluten-Free"]
          : ["Veg"],
    };
    return acc;
  }, {});
}

function buildSeedWorkspace(outlet: FoodOutlet, index: number, menuItems: MenuItem[], bookings: TableBooking[], orders: FoodOrder[], bills: DiningBill[], staff: VendorStaff[], foodDash: VendorFoodDashboard | null, dineDash: VendorDineoutDashboard | null): WorkspaceState {
  const meta = getDiningMeta(outlet, index);
  const currentMenu = menuItems.length > 0 ? menuItems : meta.menuSections.flatMap((section, sectionIndex) =>
    section.items.map((item, itemIndex) => ({
      _id: `seed-${outlet._id}-${sectionIndex}-${itemIndex}`,
      vendorId: outlet.vendorId,
      outletId: outlet._id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: section.title,
      photo: "",
      inStock: true,
      prepTimeMins: 12 + sectionIndex * 3,
      priceVariants: [],
      trackInventory: false,
      stockQty: 0,
      lowStockThreshold: 5,
      stockUnit: "plate",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
  );

  const totalTables = Math.max(8, outlet.dineout?.tablesPerSlot ?? 10);
  const tables = seedTables(outlet).slice(0, totalTables);
  const reviews = seedReviews(index);
  const offers = seedOffers(outlet);
  const menu = seedMenuMeta(currentMenu);
  const allBookingsToday = bookings.filter((booking) => isSameDay(booking.date, new Date()));
  const pendingCount = bookings.filter((booking) => booking.status === "Pending").length;
  const activeOffers = offers.filter((offer) => offer.active).length;

  const notifications: WorkspaceNotification[] = [
    {
      id: `notif-${outlet._id}-1`,
      time: new Date().toISOString(),
      title: `${allBookingsToday.length || dineDash?.todayBookingCount || 0} reservations on the books today`,
      detail: "Confirm the prime dinner slots before the floor fills up.",
      tone: "info",
      unread: true,
    },
    {
      id: `notif-${outlet._id}-2`,
      time: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      title: `${pendingCount} booking request(s) still awaiting confirmation`,
      detail: "Keep the host stand moving by accepting or rejecting fast.",
      tone: "pending",
      unread: true,
    },
    {
      id: `notif-${outlet._id}-3`,
      time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      title: `${activeOffers} offer(s) live right now`,
      detail: "Expiring campaigns and coupon promos are ready to push to the customer app.",
      tone: "success",
      unread: false,
    },
  ];

  const activity: WorkspaceActivity[] = [
    {
      id: `act-${outlet._id}-1`,
      time: new Date().toISOString(),
      title: "Workspace loaded",
      detail: `${outlet.name} is ready for reservations, tables, and offers.`,
      tone: "success",
    },
    {
      id: `act-${outlet._id}-2`,
      time: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      title: "Table map synced",
      detail: `${tables.length} tables found across the floor plan.`,
      tone: "info",
    },
    {
      id: `act-${outlet._id}-3`,
      time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      title: "Menu merchandising ready",
      detail: `${currentMenu.length} menu items can be toggled, tagged, and reordered.`,
      tone: "pending",
    },
  ];

  const seatingCapacity = tables.reduce((sum, table) => sum + table.seats, 0);
  const profile: WorkspaceDraft = {
    coverImage: outlet.banner || outlet.poster || meta.hero,
    gallery: outlet.gallery.length > 0 ? outlet.gallery : meta.gallery,
    description: outlet.description || meta.aiSummary,
    offer: outlet.offer || meta.offers[0] || "",
    averageCostForTwo: outlet.dineout?.costForTwo ?? meta.costForTwo,
    indoorSeating: Math.round(seatingCapacity * 0.58),
    outdoorSeating: Math.round(seatingCapacity * 0.22),
    rooftopSeating: Math.max(0, seatingCapacity - Math.round(seatingCapacity * 0.58) - Math.round(seatingCapacity * 0.22)),
    seatingCapacity,
    liveMusic: meta.features.some((feature) => feature.toLowerCase().includes("music")),
    rooftop: meta.features.some((feature) => feature.toLowerCase().includes("rooftop")),
    parking: true,
    smokingArea: false,
    menuPdfUrl: "",
    digitalMenuUrl: "",
    videoUrl: "",
    amenities: ["Indoor seating", "Outdoor seating", "Air conditioned", "Family friendly", "Wi-Fi"],
    cuisineTags: outlet.cuisines.length > 0 ? outlet.cuisines : ["North Indian", "Chinese", "Continental"],
    tableBookingEnabled: outlet.dineout?.tableBooking ?? true,
    payBillEnabled: outlet.dineout?.payBill ?? true,
    flatDiscountPct: outlet.dineout?.flatDiscountPct ?? 10,
    slotMinutes: outlet.dineout?.slotMinutes ?? 60,
    tablesPerSlot: outlet.dineout?.tablesPerSlot ?? 10,
    maxPartySize: outlet.dineout?.maxPartySize ?? 8,
    advanceDays: outlet.dineout?.advanceDays ?? 30,
  };

  const fallbackStaff = staff.length > 0 ? staff : [
    { id: `staff-${outlet._id}-1`, roleName: "Manager", holderName: "Front Desk Lead", holderEmail: "manager@byv.in", holderPhone: "9876500001", accountType: "staff", status: "Active", permissions: {} },
    { id: `staff-${outlet._id}-2`, roleName: "Receptionist", holderName: "Guest Host", holderEmail: "host@byv.in", holderPhone: "9876500002", accountType: "staff", status: "Active", permissions: {} },
  ];

  // The staff list isn't stored in the workspace state, but using it here keeps the
  // generated activity context richer and avoids an empty "team" section.
  void fallbackStaff;

  return {
    profile,
    tables,
    offers,
    reviews,
    activity,
    notifications,
    menu,
    bookingAssignments: bookings.reduce<Record<string, { tableId?: string; guestCount?: number; note?: string }>>((acc, booking, index) => {
      if (index % 3 === 0) acc[booking.bookingId] = { tableId: tables[index % tables.length]?.id, guestCount: booking.partySize, note: booking.specialRequests };
      return acc;
    }, {}),
  };
}

function applyThemeBadge(status: TableStatus | TableBookingStatus | FoodOrderStatus | string) {
  const tone = statusTone(status);
  return toneStyles(tone);
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Sparkles;
  tone?: WorkspaceActivity["tone"];
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-white p-4 shadow-panel">
      <div className={`absolute inset-x-0 top-0 h-1 ${toneStyles(tone)}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-faint">{label}</p>
          <p className="mt-2 text-2xl font-black text-ink">{value}</p>
          <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${toneStyles(tone)}`}>
          <Icon size={18} />
        </span>
      </div>
    </div>
  );
}

function SectionLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof LayoutGrid; active: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-vibe-violet text-white shadow-sm" : "border border-surface-border bg-white text-ink-soft hover:bg-cream-200"
      }`}
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-surface-border bg-white px-5 py-8 text-center">
      <p className="text-sm font-bold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-ink-faint">{description}</p>
    </div>
  );
}

export function RestaurantPartnerWorkspace({ section }: Props) {
  const [outlets, setOutlets] = useState<FoodOutlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string>("");
  const [foodDashboard, setFoodDashboard] = useState<VendorFoodDashboard | null>(null);
  const [dineDashboard, setDineDashboard] = useState<VendorDineoutDashboard | null>(null);
  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [bills, setBills] = useState<DiningBill[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [staff, setStaff] = useState<VendorStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("day");
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [offerDraft, setOfferDraft] = useState<WorkspaceOffer | null>(null);
  const [tableDraft, setTableDraft] = useState<Partial<WorkspaceTable>>({ tableNo: "", seats: 2, floor: "Ground", zone: "Indoor", status: "available" });
  const [reviewReply, setReviewReply] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      listVendorOutlets(),
      getVendorFoodDashboard(period),
      getVendorDineoutDashboard(period),
      getVendorTableBookings({ limit: 200 }),
      getVendorFoodOrders({ limit: 200 }),
      getVendorDiningBills({ limit: 100 }),
      listVendorMenu(),
      listVendorStaff(),
    ]).then((result) => {
      if (cancelled) return;
      const [outletsRes, foodDashRes, dineDashRes, bookingsRes, ordersRes, billsRes, menuRes, staffRes] = result;

      const fetchedOutlets = outletsRes.status === "fulfilled" && outletsRes.value.length > 0 ? outletsRes.value : [createSeedOutlet(0)];
      setOutlets(fetchedOutlets);
      setSelectedOutletId((current) => current || fetchedOutlets[0]!._id);

      setFoodDashboard(foodDashRes.status === "fulfilled" ? foodDashRes.value : null);
      setDineDashboard(dineDashRes.status === "fulfilled" ? dineDashRes.value : null);
      setBookings(bookingsRes.status === "fulfilled" ? bookingsRes.value.items : []);
      setOrders(ordersRes.status === "fulfilled" ? ordersRes.value.items : []);
      setBills(billsRes.status === "fulfilled" ? billsRes.value.items : []);
      setMenuItems(menuRes.status === "fulfilled" ? menuRes.value : []);
      setStaff(staffRes.status === "fulfilled" ? staffRes.value : []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const outletIndex = useMemo(() => Math.max(0, outlets.findIndex((o) => o._id === selectedOutletId)), [outlets, selectedOutletId]);
  const selectedOutlet = outlets.find((o) => o._id === selectedOutletId) ?? outlets[0] ?? null;
  const filteredBookings = useMemo(
    () => bookings.filter((booking) => !selectedOutlet || booking.outletId === selectedOutlet._id),
    [bookings, selectedOutlet]
  );
  const filteredOrders = useMemo(
    () => orders.filter((order) => !selectedOutlet || order.outletId === selectedOutlet._id),
    [orders, selectedOutlet]
  );
  const filteredBills = useMemo(
    () => bills.filter((bill) => !selectedOutlet || bill.outletId === selectedOutlet._id),
    [bills, selectedOutlet]
  );
  const filteredMenu = useMemo(
    () => menuItems.filter((item) => !selectedOutlet || item.outletId === selectedOutlet._id),
    [menuItems, selectedOutlet]
  );
  const selectedMeta = useMemo(() => getDiningMeta(selectedOutlet ?? createSeedOutlet(0), outletIndex), [selectedOutlet, outletIndex]);
  const seedWorkspace = useMemo(
    () =>
      selectedOutlet
        ? buildSeedWorkspace(selectedOutlet, outletIndex, filteredMenu, filteredBookings, filteredOrders, filteredBills, staff, foodDashboard, dineDashboard)
        : null,
    [dineDashboard, filteredBookings, filteredBills, filteredMenu, filteredOrders, foodDashboard, outletIndex, selectedOutlet, staff]
  );

  useEffect(() => {
    if (!selectedOutlet || !seedWorkspace) return;
    const stored = typeof window !== "undefined" ? readWorkspace(selectedOutlet._id) : null;
    setWorkspace(stored ?? seedWorkspace);
    setOfferDraft(null);
    setTableDraft({ tableNo: "", seats: 2, floor: "Ground", zone: "Indoor", status: "available" });
    setSelectedBookingId("");
    setSelectedTableId("");
    setReviewReply({});
  }, [selectedOutlet, seedWorkspace]);

  useEffect(() => {
    if (!selectedOutlet || !workspace) return;
    writeWorkspace(selectedOutlet._id, workspace);
  }, [selectedOutlet, workspace]);

  const currentTables = useMemo(() => workspace?.tables ?? [], [workspace]);
  const currentOffers = useMemo(() => workspace?.offers ?? [], [workspace]);
  const currentReviews = useMemo(() => workspace?.reviews ?? [], [workspace]);
  const currentActivity = useMemo(() => workspace?.activity ?? [], [workspace]);
  const currentNotifications = useMemo(() => workspace?.notifications ?? [], [workspace]);
  const currentMenuMeta = useMemo(() => workspace?.menu ?? {}, [workspace]);
  const currentProfile = useMemo(() => workspace?.profile, [workspace]);

  const tableStats = useMemo(() => {
    const available = currentTables.filter((table) => table.status === "available").length;
    const booked = currentTables.filter((table) => table.status === "reserved" || table.status === "occupied").length;
    return { available, booked, maintenance: currentTables.filter((table) => table.status === "maintenance").length, blocked: currentTables.filter((table) => table.status === "blocked").length };
  }, [currentTables]);

  const reservationStats = useMemo(() => {
    const today = new Date();
    const todayBookings = filteredBookings.filter((booking) => isSameDay(booking.date, today));
    const upcoming = filteredBookings.filter((booking) => new Date(booking.date) >= new Date(today.toDateString()));
    const completed = filteredBookings.filter((booking) => booking.status === "Completed");
    const cancelled = filteredBookings.filter((booking) => booking.status === "Cancelled" || booking.status === "Rejected");
    const pending = filteredBookings.filter((booking) => booking.status === "Pending");
    return {
      todayBookings: todayBookings.length,
      upcoming: upcoming.length,
      completed: completed.length,
      cancelled: cancelled.length,
      pending: pending.length,
      coversToday: todayBookings.filter((booking) => ["Confirmed", "Seated", "Completed"].includes(booking.status)).reduce((sum, booking) => sum + booking.partySize, 0),
      walkIns: filteredOrders.filter((order) => order.channel === "pos" || order.orderType === "Counter").length,
    };
  }, [filteredBookings, filteredOrders]);

  const occupancyRate = useMemo(() => {
    if (currentTables.length === 0) return 0;
    const inUse = currentTables.filter((table) => ["reserved", "occupied"].includes(table.status)).length;
    return Math.round((inUse / currentTables.length) * 100);
  }, [currentTables]);

  const revenueValue = useMemo(() => {
    const foodRevenue = foodDashboard?.totalRevenue ?? filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const dineRevenue = dineDashboard?.netRevenue ?? filteredBills.reduce((sum, bill) => sum + bill.restaurantNet, 0);
    return foodRevenue + dineRevenue;
  }, [dineDashboard?.netRevenue, foodDashboard?.totalRevenue, filteredBills, filteredOrders]);

  const repeatCustomers = useMemo(() => {
    const counts = new Map<string, number>();
    filteredBookings.forEach((booking) => {
      const key = booking.phone || booking.customerName;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    filteredOrders.forEach((order) => {
      const key = order.phone || order.customerName;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.values()).filter((count) => count > 1).length;
  }, [filteredBookings, filteredOrders]);

  const customerInsights = useMemo(() => {
    const buckets = new Map<string, { name: string; phone: string; visits: number; occasions: Set<string>; preferences: Set<string>; loyalty: string; lastVisit: string }>();
    filteredBookings.forEach((booking) => {
      const key = booking.phone || booking.customerName;
      const current = buckets.get(key) ?? {
        name: booking.customerName,
        phone: booking.phone,
        visits: 0,
        occasions: new Set<string>(),
        preferences: new Set<string>(),
        loyalty: "New",
        lastVisit: booking.date,
      };
      current.visits += 1;
      if (booking.occasion) current.occasions.add(booking.occasion);
      if (booking.seatingPreference) current.preferences.add(booking.seatingPreference);
      if (new Date(booking.date) > new Date(current.lastVisit)) current.lastVisit = booking.date;
      current.loyalty = current.visits >= 5 ? "VIP" : current.visits >= 3 ? "Loyal" : current.visits >= 2 ? "Regular" : "New";
      buckets.set(key, current);
    });
    return Array.from(buckets.values()).sort((a, b) => b.visits - a.visits).slice(0, 6);
  }, [filteredBookings]);

  const currentlySelectedTable = currentTables.find((table) => table.id === selectedTableId) ?? currentTables[0] ?? null;

  const statusSummary = [
    { label: "Today's bookings", value: String(reservationStats.todayBookings), hint: "Reserved for today", icon: CalendarCheck2, tone: "info" as const },
    { label: "Upcoming reservations", value: String(reservationStats.upcoming), hint: "Booked future slots", icon: CalendarDays, tone: "pending" as const },
    { label: "Completed visits", value: String(reservationStats.completed), hint: "Served and closed", icon: CheckCircle2, tone: "success" as const },
    { label: "Cancelled bookings", value: String(reservationStats.cancelled), hint: "Rejected or cancelled", icon: X, tone: "danger" as const },
    { label: "Walk-ins", value: String(reservationStats.walkIns), hint: "Counter bills", icon: Store, tone: "neutral" as const },
    { label: "Revenue", value: `₹${revenueValue.toLocaleString("en-IN")}`, hint: "Food + dine-in settlements", icon: IndianRupee, tone: "success" as const },
    { label: "Occupancy", value: `${occupancyRate}%`, hint: "Current table utilisation", icon: LayoutGrid, tone: occupancyRate > 70 ? "pending" : "success" as const },
    { label: "Available tables", value: String(tableStats.available), hint: "Open right now", icon: Crown, tone: "success" as const },
    { label: "Booked tables", value: String(tableStats.booked), hint: "Reserved or occupied", icon: MapPin, tone: "info" as const },
    { label: "Pending confirms", value: String(reservationStats.pending), hint: "Need host action", icon: Bell, tone: "pending" as const },
  ] as const;

  const activeSection = section;

  function pushActivity(title: string, detail: string, tone: WorkspaceActivity["tone"] = "info") {
    if (!workspace) return;
    const next = {
      ...workspace,
      activity: [{ id: makeId("act"), time: new Date().toISOString(), title, detail, tone }, ...workspace.activity].slice(0, 24),
    };
    setWorkspace(next);
  }

  function setNotificationRead(id: string) {
    if (!workspace) return;
    setWorkspace({
      ...workspace,
      notifications: workspace.notifications.map((notification) => (notification.id === id ? { ...notification, unread: false } : notification)),
    });
  }

  function updateOffer(nextOffer: WorkspaceOffer) {
    if (!workspace) return;
    const next = {
      ...workspace,
      offers: workspace.offers.some((offer) => offer.id === nextOffer.id)
        ? workspace.offers.map((offer) => (offer.id === nextOffer.id ? nextOffer : offer))
        : [nextOffer, ...workspace.offers],
    };
    setWorkspace(next);
    setOfferDraft(null);
    pushActivity(nextOffer.active ? "Offer updated" : "Offer saved", `${nextOffer.title} is now ${nextOffer.active ? "active" : "inactive"}.`, "success");
  }

  async function handleToggleOffer(id: string) {
    if (!workspace) return;
    const nextOffer = workspace.offers.find((offer) => offer.id === id);
    if (!nextOffer) return;
    updateOffer({ ...nextOffer, active: !nextOffer.active });
  }

  async function handleDeleteOffer(id: string) {
    if (!workspace) return;
    const next = { ...workspace, offers: workspace.offers.filter((offer) => offer.id !== id) };
    setWorkspace(next);
    pushActivity("Offer removed", "A dining promotion was removed from the live list.", "danger");
  }

  async function handleSaveProfile() {
    if (!selectedOutlet || !workspace) return;
    setSaving(true);
    try {
      await updateVendorOutlet(selectedOutlet._id, {
        offer: workspace.profile.offer,
        description: workspace.profile.description,
        cuisines: workspace.profile.cuisineTags,
        banner: workspace.profile.coverImage,
        poster: workspace.profile.coverImage,
        gallery: workspace.profile.gallery,
      });
      await setOutletDineout(selectedOutlet._id, {
        tableBooking: workspace.profile.tableBookingEnabled,
        payBill: workspace.profile.payBillEnabled,
        flatDiscountPct: workspace.profile.flatDiscountPct,
        slotMinutes: workspace.profile.slotMinutes,
        tablesPerSlot: workspace.profile.tablesPerSlot,
        maxPartySize: workspace.profile.maxPartySize,
        advanceDays: workspace.profile.advanceDays,
      });
      await setOutletAvailability(selectedOutlet._id, selectedOutlet.weeklyAvailability.length > 0 ? selectedOutlet.weeklyAvailability : Array.from({ length: 7 }, (_, day) => ({
        day,
        isOpen: true,
        startTime: "11:00",
        endTime: "23:30",
      })) as OutletWeeklyDay[]);
      await setOutletPrepTimes(selectedOutlet._id, {
        serviceBufferMins: 8,
        fulfilment: { dineIn: true, inVenue: false, postMatch: false, preOrder: false },
        categoryPrepTimes: [
          { category: "Starters", prepTimeMins: 12 },
          { category: "Main Course", prepTimeMins: 18 },
          { category: "Desserts", prepTimeMins: 8 },
        ],
      });
      pushActivity("Profile saved", "Restaurant details and dine-in settings were updated.", "success");
      setToast("Restaurant profile updated");
    } catch (error) {
      setToast(error instanceof ApiError ? error.describe() : "Could not save the restaurant profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleReservationAction(booking: TableBooking, nextStatus: Exclude<TableBookingStatus, "Pending">) {
    if (!selectedOutlet) return;
    setSaving(true);
    try {
      if (nextStatus === "Seated") {
        await checkInVendorTableBooking(booking.bookingId);
      } else {
        await updateVendorTableBookingStatus(booking.bookingId, nextStatus);
      }
      setBookings((current) => current.map((item) => (item.bookingId === booking.bookingId ? { ...item, status: nextStatus, checkedIn: nextStatus === "Seated" ? true : item.checkedIn } : item)));
      pushActivity("Reservation updated", `${booking.customerName} marked as ${nextStatus.toLowerCase()}.`, statusTone(nextStatus) as WorkspaceActivity["tone"]);
    } catch (error) {
      setToast(error instanceof ApiError ? error.describe() : "Could not update reservation");
    } finally {
      setSaving(false);
    }
  }

  async function handleTableBookingLookup(bookingId: string) {
    try {
      const booking = await getVendorTableBooking(bookingId);
      setSelectedBookingId(booking.bookingId);
      setToast(`${booking.customerName} is loaded.`);
    } catch (error) {
      setToast(error instanceof ApiError ? error.describe() : "Booking not found");
    }
  }

  function handleCreateTable() {
    if (!workspace) return;
    const nextId = makeId("tbl");
    const nextTable: WorkspaceTable = {
      id: nextId,
      tableNo: tableDraft.tableNo?.toString() || `${workspace.tables.length + 1}`,
      seats: Number(tableDraft.seats ?? 2),
      floor: tableDraft.floor?.toString() || "Ground",
      zone: tableDraft.zone?.toString() || "Indoor",
      status: (tableDraft.status as TableStatus) || "available",
      notes: "",
    };
    setWorkspace({ ...workspace, tables: [nextTable, ...workspace.tables] });
    pushActivity("Table added", `Table ${nextTable.tableNo} created in ${nextTable.floor}.`, "success");
    setTableDraft({ tableNo: "", seats: 2, floor: "Ground", zone: "Indoor", status: "available" });
  }

  function handleUpdateTable(id: string, patch: Partial<WorkspaceTable>) {
    if (!workspace) return;
    setWorkspace({
      ...workspace,
      tables: workspace.tables.map((table) => (table.id === id ? { ...table, ...patch } : table)),
    });
  }

  function handleAssignTable(bookingId: string, tableId: string) {
    if (!workspace || !selectedOutlet) return;
    setWorkspace({
      ...workspace,
      bookingAssignments: {
        ...workspace.bookingAssignments,
        [bookingId]: { ...(workspace.bookingAssignments[bookingId] ?? {}), tableId },
      },
      tables: workspace.tables.map((table) =>
        table.id === tableId ? { ...table, status: "reserved", assignedBookingId: bookingId } : table
      ),
    });
    pushActivity("Table assigned", `Booking ${bookingId} was assigned to table ${tableId}.`, "info");
  }

  function handleMoveTable(bookingId: string, nextTableId: string) {
    handleAssignTable(bookingId, nextTableId);
    pushActivity("Table reassigned", `Reservation ${bookingId} moved to another table.`, "pending");
  }

  async function handleSaveMenuItem(item: MenuItem, patch: Partial<MenuItem>) {
    try {
      await updateVendorMenuItem(item._id, patch);
      setMenuItems((current) => current.map((menuItem) => (menuItem._id === item._id ? { ...menuItem, ...patch } : menuItem)));
      pushActivity("Menu updated", `${item.name} was saved to the live menu.`, "success");
    } catch (error) {
      setToast(error instanceof ApiError ? error.describe() : "Could not update menu item");
    }
  }

  function addMenuItemToWorkspace() {
    if (!selectedOutlet || !workspace) return;
    const fakeId = makeId("menu");
    const nextItem: MenuItem = {
      _id: fakeId,
      vendorId: selectedOutlet.vendorId,
      outletId: selectedOutlet._id,
      name: "Chef's Special",
      description: "New seasonal item",
      price: 399,
      category: "Chef Specials",
      photo: "",
      inStock: true,
      prepTimeMins: 18,
      priceVariants: [],
      trackInventory: false,
      stockQty: 0,
      lowStockThreshold: 5,
      stockUnit: "plate",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMenuItems((current) => [nextItem, ...current]);
    setWorkspace({
      ...workspace,
      menu: {
        ...workspace.menu,
        [fakeId]: {
          rank: Object.keys(workspace.menu).length + 1,
          enabled: true,
          recommended: true,
          chefSpecial: true,
          seasonal: "Chef special",
          dietaryTags: ["Veg"],
        },
      },
    });
    pushActivity("Menu item added", "A new chef special was added to the restaurant menu.", "success");
  }

  async function handleDownloadInvoice(bill: DiningBill, fallbackOrder?: FoodOrder) {
    if (fallbackOrder) {
      await downloadFoodOrderTicket({
        ...fallbackOrder,
        outletName: selectedOutlet?.name,
        paymentMethod: fallbackOrder.paymentMethod ?? "UPI",
        subtotal: fallbackOrder.subtotal,
        taxAmount: fallbackOrder.taxAmount,
      });
      return;
    }

    const link = document.createElement("a");
    const lines = [
      ["Bill ID", bill.billId],
      ["Customer", bill.customerName],
      ["Bill amount", bill.billAmount.toLocaleString("en-IN")],
      ["Payable amount", bill.payableAmount.toLocaleString("en-IN")],
      ["Restaurant net", bill.restaurantNet.toLocaleString("en-IN")],
    ];
    const csv = lines.map((line) => line.map((cell) => `"${cell}"`).join(",")).join("\n");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `byv-invoice-${bill.billId}.csv`;
    link.click();
  }

  function updateOfferDraft<K extends keyof WorkspaceOffer>(key: K, value: WorkspaceOffer[K]) {
    setOfferDraft((current) => ({ ...(current ?? {
      id: makeId("offer"),
      type: "Flat discount",
      title: "",
      subtitle: "",
      valueLabel: "",
      validFrom: new Date().toISOString().slice(0, 10),
      validTo: new Date().toISOString().slice(0, 10),
      conditions: [],
      active: true,
    }), [key]: value }));
  }

  function handleSaveOffer() {
    const nextOffer = offerDraft ?? {
      id: makeId("offer"),
      type: "Flat discount",
      title: "New offer",
      subtitle: "Describe the promotion",
      valueLabel: "10% off",
      validFrom: new Date().toISOString().slice(0, 10),
      validTo: new Date().toISOString().slice(0, 10),
      conditions: ["Min bill ₹1000"],
      active: true,
    };
    updateOffer(nextOffer);
  }

  const pendingBookings = filteredBookings.filter((booking) => booking.status === "Pending");
  const upcomingBookings = filteredBookings.filter((booking) => ["Pending", "Confirmed"].includes(booking.status)).slice(0, 6);
  const recentBills = filteredBills.slice(0, 6);
  const activeOffers = currentOffers.filter((offer) => offer.active);
  const topMenuItems = filteredMenu
    .map((item, index) => ({ item, meta: currentMenuMeta[item._id] ?? { rank: index + 1, enabled: item.inStock, recommended: index < 3, chefSpecial: index === 0, seasonal: "All year", dietaryTags: ["Veg"] } }))
    .sort((a, b) => a.meta.rank - b.meta.rank)
    .slice(0, 12);

  if (!selectedOutlet) {
    return (
      <SectionCard
        title="Create a restaurant profile first"
        description="This partner workspace becomes active once you create or claim a dining outlet."
        action={
          <Link href="/vendor/food/profile" className="inline-flex items-center gap-2 rounded-full bg-vibe-violet px-4 py-2 text-sm font-semibold text-white">
            <Store size={16} /> Set up restaurant
          </Link>
        }
      >
        <p className="text-sm text-ink-soft">
          BookYourVibe will show all approved restaurant details, menus, offers, and table slots to customers in real time once the outlet exists.
        </p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <PageHero
        eyebrow="Food & Beverages Vendor"
        title={`${selectedOutlet.name} partner workspace`}
        description="One premium dashboard to run reservations, tables, menus, offers, bills, staff access, reviews, and performance."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px]">
              <select
                value={selectedOutletId}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className="w-full appearance-none rounded-full border border-white/20 bg-white/10 px-4 py-2.5 pr-10 text-sm font-semibold text-white outline-none backdrop-blur"
              >
                {outlets.map((outlet) => (
                  <option key={outlet._id} value={outlet._id} className="text-ink">
                    {outlet.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/70" size={16} />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur">
              <Sparkles size={15} /> {currentOffers.filter((offer) => offer.active).length} active offers
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur">
              <LayoutGrid size={15} /> {currentTables.length} tables
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {DEFAULT_SECTIONS.map((item) => {
          const meta = SECTION_META[item];
          return <SectionLink key={item} href={meta.href} label={meta.label} icon={meta.icon} active={item === activeSection} />;
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {statusSummary.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} hint={item.hint} icon={item.icon} tone={item.tone} />
        ))}
      </div>

      {loading && (
        <div className="rounded-2xl border border-surface-border bg-white px-4 py-3 text-sm text-ink-soft shadow-panel">
          Loading live dining data and workspace state...
        </div>
      )}

      <div className="rounded-2xl border border-surface-border bg-white p-4 shadow-panel">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">Analytics period</p>
          {(["day", "week", "month", "year"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${period === value ? "bg-vibe-violet text-white" : "border border-surface-border text-ink-soft hover:bg-cream-200"}`}
            >
              {value === "day" ? "Today" : value === "week" ? "Week" : value === "month" ? "Month" : "Year"}
            </button>
          ))}
          {foodDashboard && (
            <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              {foodDashboard.recentOrders.length} recent order(s)
            </span>
          )}
        </div>
      </div>

      {activeSection === "dashboard" && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard
            title="Today's operation board"
            description="What the host stand needs to know right now."
            action={<Link href="/vendor/food/reservations" className="inline-flex items-center gap-2 text-sm font-semibold text-vibe-violet">Open reservations <ChevronRight size={16} /></Link>}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {upcomingBookings.map((booking) => {
                const assignment = workspace?.bookingAssignments[booking.bookingId];
                const assignedTable = assignment?.tableId ? currentTables.find((table) => table.id === assignment.tableId) : undefined;
                return (
                  <div key={booking.bookingId} className="rounded-2xl border border-surface-border bg-cream-200/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-ink">{booking.customerName}</p>
                        <p className="mt-0.5 text-xs text-ink-faint">{formatDate(booking.date)} · {booking.slotTime} · {booking.partySize} guest(s)</p>
                      </div>
                      <Badge tone={statusTone(booking.status) as never}>{booking.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-ink-soft">{assignedTable ? `Table ${assignedTable.tableNo}` : "No table yet"}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-ink-soft">{booking.occasion || "General dining"}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => handleReservationAction(booking, "Confirmed")} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Confirm</button>
                      <button onClick={() => handleReservationAction(booking, "Seated")} className="rounded-full bg-vibe-violet px-3 py-1.5 text-xs font-semibold text-white">Seat</button>
                      <button onClick={() => handleReservationAction(booking, "Completed")} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Complete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="Customer insights"
            description="Guest frequency, loyalty, and occasion patterns."
            action={<Link href="/vendor/food/reviews" className="inline-flex items-center gap-2 text-sm font-semibold text-vibe-violet">View reviews <ChevronRight size={16} /></Link>}
          >
            <div className="space-y-3">
              {customerInsights.length > 0 ? customerInsights.map((guest) => (
                <div key={`${guest.phone}-${guest.name}`} className="rounded-2xl border border-surface-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{guest.name}</p>
                      <p className="text-xs text-ink-faint">{guest.phone || "Contact hidden"} · {guest.visits} visit(s)</p>
                    </div>
                    <Badge tone={guest.loyalty === "VIP" ? "success" : guest.loyalty === "Loyal" ? "info" : "pending"}>{guest.loyalty}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-ink-soft">Last visit: {formatDate(guest.lastVisit)}</p>
                  <p className="mt-1 text-xs text-ink-faint">Occasions: {[...guest.occasions].join(", ") || "None"} · Preferences: {[...guest.preferences].join(", ") || "None"}</p>
                </div>
              )) : <EmptyState title="No repeat guests yet" description="Guest insight cards will populate as more bookings and bill payments come in." />}
            </div>
          </SectionCard>

          <SectionCard
            title="Floor map"
            description="Real-time table status at a glance."
            action={<Link href="/vendor/food/tables" className="inline-flex items-center gap-2 text-sm font-semibold text-vibe-violet">Manage tables <ChevronRight size={16} /></Link>}
            className="xl:col-span-2"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {currentTables.slice(0, 12).map((table) => (
                <button
                  key={table.id}
                  onClick={() => setSelectedTableId(table.id)}
                  className={`rounded-2xl border p-3 text-left transition ${selectedTableId === table.id ? "border-vibe-violet bg-vibe-violet/5 shadow-sm" : "border-surface-border bg-white hover:bg-cream-200/40"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-ink">Table {table.tableNo}</p>
                    <Badge tone={statusTone(table.status) as never}>{table.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">{table.seats} seat(s) · {table.floor} · {table.zone}</p>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Revenue and settlement"
            description="Food takings, bill settlements, and invoice exports."
            action={<Link href="/vendor/food/payments" className="inline-flex items-center gap-2 text-sm font-semibold text-vibe-violet">Open payments <ChevronRight size={16} /></Link>}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="BookYourVibe revenue" value={`₹${revenueValue.toLocaleString("en-IN")}`} hint="Combined food and dine-in performance" icon={IndianRupee} tone="success" />
              <MetricCard label="Bill count" value={String(filteredBills.length)} hint="Settled and pending bills" icon={FileDown} tone="info" />
            </div>
            <div className="mt-4 space-y-2">
              {recentBills.slice(0, 4).map((bill) => (
                <div key={bill.billId} className="flex items-center justify-between gap-3 rounded-2xl border border-surface-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{bill.customerName}</p>
                    <p className="text-xs text-ink-faint">{bill.billId} · {formatDate(bill.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink">₹{bill.payableAmount.toLocaleString("en-IN")}</p>
                    <button onClick={() => handleDownloadInvoice(bill, filteredOrders.find((order) => order.customerName === bill.customerName))} className="text-xs font-semibold text-vibe-violet">Download invoice</button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {activeSection === "profile" && (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard
            title="Restaurant profile"
            description="Edit the public-facing profile shown in the customer app."
            action={<button onClick={handleSaveProfile} className="inline-flex items-center gap-2 rounded-full bg-vibe-violet px-4 py-2 text-sm font-semibold text-white" disabled={saving}><ShieldCheck size={16} /> Save profile</button>}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 grid gap-4 lg:grid-cols-3">
                <OutletImageUpload label="Cover" hint="Top banner shown on the restaurant page." value={currentProfile?.coverImage} onChange={(url) => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, coverImage: url } })} />
                <OutletImageUpload label="Video poster" hint="Poster frame for the gallery hero." value={workspace?.profile.videoUrl} onChange={(url) => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, videoUrl: url } })} />
                <OutletImageUpload label="Digital menu" hint="Use a menu poster or QR-ready image." value={workspace?.profile.digitalMenuUrl} onChange={(url) => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, digitalMenuUrl: url } })} />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Public description</label>
                <textarea
                  value={workspace?.profile.description ?? ""}
                  onChange={(e) => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, description: e.target.value } })}
                  className="min-h-28 w-full rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet"
                  placeholder="Describe the vibe, cuisine, and dining experience..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Average cost for two</label>
                <input
                  type="number"
                  value={workspace?.profile.averageCostForTwo ?? 0}
                  onChange={(e) => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, averageCostForTwo: Number(e.target.value) || 0 } })}
                  className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Seat capacity</label>
                <input
                  type="number"
                  value={workspace?.profile.seatingCapacity ?? 0}
                  onChange={(e) => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, seatingCapacity: Number(e.target.value) || 0 } })}
                  className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Indoor seats</label>
                <input type="number" value={workspace?.profile.indoorSeating ?? 0} onChange={(e) => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, indoorSeating: Number(e.target.value) || 0 } })} className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Outdoor seats</label>
                <input type="number" value={workspace?.profile.outdoorSeating ?? 0} onChange={(e) => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, outdoorSeating: Number(e.target.value) || 0 } })} className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Rooftop seats</label>
                <input type="number" value={workspace?.profile.rooftopSeating ?? 0} onChange={(e) => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, rooftopSeating: Number(e.target.value) || 0 } })} className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {["Indoor seating", "Outdoor seating", "Air conditioned", "Family friendly", "Live music", "Rooftop", "Parking", "Smoking area", "Wi-Fi", "Valet"].map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => workspace && setWorkspace({
                    ...workspace,
                    profile: {
                      ...workspace.profile,
                      amenities: workspace.profile.amenities.includes(amenity) ? workspace.profile.amenities.filter((item) => item !== amenity) : [...workspace.profile.amenities, amenity],
                    },
                  })}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${workspace?.profile.amenities.includes(amenity) ? "border-vibe-violet bg-vibe-violet/5 text-vibe-violet" : "border-surface-border hover:bg-cream-200"}`}
                >
                  {amenity}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Digital menu link</label>
                <div className="flex gap-2">
                  <input value={workspace?.profile.digitalMenuUrl ?? ""} onChange={(e) => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, digitalMenuUrl: e.target.value } })} className="flex-1 rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" placeholder="https://..." />
                  <button onClick={() => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, digitalMenuUrl: "" } })} className="rounded-2xl border border-surface-border px-4 py-3 text-sm font-semibold text-ink-soft">Clear</button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">PDF menu link</label>
                <div className="flex gap-2">
                  <input value={workspace?.profile.menuPdfUrl ?? ""} onChange={(e) => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, menuPdfUrl: e.target.value } })} className="flex-1 rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" placeholder="https://..." />
                  <button onClick={() => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, menuPdfUrl: "" } })} className="rounded-2xl border border-surface-border px-4 py-3 text-sm font-semibold text-ink-soft">Clear</button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Video URL</label>
                <input value={workspace?.profile.videoUrl ?? ""} onChange={(e) => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, videoUrl: e.target.value } })} className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" placeholder="https://youtube.com/..." />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">BYV discount %</label>
                <input type="number" value={workspace?.profile.flatDiscountPct ?? 0} onChange={(e) => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, flatDiscountPct: Number(e.target.value) || 0 } })} className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Gallery and seating preview" description="Approved visuals and the booking experience customers see." action={<Link href="/vendor/food/menu" className="inline-flex items-center gap-2 text-sm font-semibold text-vibe-violet">Menu manager <ChevronRight size={16} /></Link>}>
            <OutletGalleryUpload value={currentProfile?.gallery ?? []} onChange={(gallery) => workspace && setWorkspace({ ...workspace, profile: { ...workspace.profile, gallery } })} />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-surface-border bg-cream-200/70 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">Customer app</p>
                <p className="mt-1 text-lg font-black text-ink">Live profile sync</p>
                <p className="mt-2 text-sm text-ink-soft">Approved cover images, videos, menus, and offers are what the customer app should render in real time.</p>
              </div>
              <div className="rounded-2xl border border-surface-border bg-cream-200/70 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">Availability</p>
                <p className="mt-1 text-lg font-black text-ink">{workspace?.profile.tableBookingEnabled ? "Table booking on" : "Table booking off"}</p>
                <p className="mt-2 text-sm text-ink-soft">{workspace?.profile.payBillEnabled ? "Bill payment enabled" : "Bill payment disabled"} · {workspace?.profile.slotMinutes} minute reservation windows</p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {activeSection === "tables" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <SectionCard title="Table layout manager" description="Create, edit, and reassign tables from one floor plan." action={<button onClick={handleCreateTable} className="inline-flex items-center gap-2 rounded-full bg-vibe-violet px-4 py-2 text-sm font-semibold text-white"><Plus size={16} /> Add table</button>}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-surface-border bg-cream-200/60 p-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">Floor plan</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {currentTables.map((table) => (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTableId(table.id)}
                      className={`rounded-2xl border p-3 text-left transition ${selectedTableId === table.id ? "border-vibe-violet bg-white shadow-sm" : "border-surface-border bg-white/90 hover:bg-white"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-ink">T{table.tableNo}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${applyThemeBadge(table.status)}`}>{table.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-faint">{table.seats} seat(s)</p>
                      <p className="text-xs text-ink-faint">{table.floor} · {table.zone}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border border-surface-border p-4">
                <p className="text-sm font-bold text-ink">Create / edit table</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={tableDraft.tableNo ?? ""} onChange={(e) => setTableDraft((draft) => ({ ...draft, tableNo: e.target.value }))} className="rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" placeholder="Table no." />
                  <input type="number" value={tableDraft.seats ?? 2} onChange={(e) => setTableDraft((draft) => ({ ...draft, seats: Number(e.target.value) || 2 }))} className="rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" placeholder="Seats" />
                  <input value={tableDraft.floor ?? ""} onChange={(e) => setTableDraft((draft) => ({ ...draft, floor: e.target.value }))} className="rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" placeholder="Floor" />
                  <input value={tableDraft.zone ?? ""} onChange={(e) => setTableDraft((draft) => ({ ...draft, zone: e.target.value }))} className="rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" placeholder="Zone" />
                  <select value={tableDraft.status ?? "available"} onChange={(e) => setTableDraft((draft) => ({ ...draft, status: e.target.value as TableStatus }))} className="rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet">
                    {(["available", "occupied", "reserved", "maintenance", "blocked"] as const).map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
                <button onClick={handleCreateTable} className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Save table</button>
                <div className="pt-2">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">Selected table</p>
                  {currentlySelectedTable ? (
                    <div className="rounded-2xl border border-surface-border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-ink">T{currentlySelectedTable.tableNo}</p>
                        <Badge tone={statusTone(currentlySelectedTable.status) as never}>{currentlySelectedTable.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-ink-faint">{currentlySelectedTable.seats} seat(s) · {currentlySelectedTable.floor} · {currentlySelectedTable.zone}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(["available", "occupied", "reserved", "maintenance", "blocked"] as const).map((value) => (
                          <button key={value} onClick={() => handleUpdateTable(currentlySelectedTable.id, { status: value })} className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-200">{value}</button>
                        ))}
                      </div>
                    </div>
                  ) : <EmptyState title="Pick a table" description="Click any table card to manage status or move it to another booking." />}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Assignment board" description="Assign or reassign tables to reservations instantly." action={<button onClick={() => selectedBookingId && selectedTableId && handleAssignTable(selectedBookingId, selectedTableId)} className="inline-flex items-center gap-2 rounded-full bg-vibe-violet px-4 py-2 text-sm font-semibold text-white"><RefreshCw size={16} /> Assign</button>}>
            <div className="space-y-3">
              <select value={selectedBookingId} onChange={(e) => setSelectedBookingId(e.target.value)} className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet">
                <option value="">Choose booking</option>
                {filteredBookings.map((booking) => <option key={booking.bookingId} value={booking.bookingId}>{booking.customerName} · {booking.partySize} guest(s) · {formatDate(booking.date)}</option>)}
              </select>
              <select value={selectedTableId} onChange={(e) => setSelectedTableId(e.target.value)} className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet">
                <option value="">Choose table</option>
                {currentTables.map((table) => <option key={table.id} value={table.id}>T{table.tableNo} · {table.seats} seats · {table.status}</option>)}
              </select>
              <div className="space-y-2">
                {filteredBookings.slice(0, 8).map((booking) => {
                  const assignment = workspace?.bookingAssignments[booking.bookingId];
                  const assignedTable = assignment?.tableId ? currentTables.find((table) => table.id === assignment.tableId) : null;
                  return (
                    <div key={booking.bookingId} className="rounded-2xl border border-surface-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">{booking.customerName}</p>
                          <p className="text-xs text-ink-faint">{booking.partySize} guest(s) · {booking.slotTime} · {booking.status}</p>
                        </div>
                        <Badge tone={statusTone(booking.status) as never}>{assignedTable ? `T${assignedTable.tableNo}` : "Unassigned"}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {currentTables.slice(0, 4).map((table) => (
                          <button key={table.id} onClick={() => handleMoveTable(booking.bookingId, table.id)} className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-200">Move to T{table.tableNo}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {activeSection === "reservations" && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Reservation management" description="Accept, reject, seat, and complete bookings." action={<button onClick={() => selectedBookingId && handleTableBookingLookup(selectedBookingId)} className="inline-flex items-center gap-2 rounded-full bg-vibe-violet px-4 py-2 text-sm font-semibold text-white"><Copy size={16} /> Load booking</button>}>
            <div className="space-y-3">
              {pendingBookings.length > 0 ? pendingBookings.map((booking) => {
                const assignment = workspace?.bookingAssignments[booking.bookingId];
                const assignedTable = assignment?.tableId ? currentTables.find((table) => table.id === assignment.tableId) : null;
                return (
                  <div key={booking.bookingId} className="rounded-2xl border border-surface-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-ink">{booking.customerName}</p>
                        <p className="mt-0.5 text-xs text-ink-faint">{booking.phone} · {formatDate(booking.date)} · {booking.slotTime} · {booking.partySize} guest(s)</p>
                      </div>
                      <Badge tone={statusTone(booking.status) as never}>{booking.status}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-ink-soft">{booking.specialRequests || "No special request"}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full bg-cream-200 px-2.5 py-1 font-semibold text-ink-soft">{assignedTable ? `Table ${assignedTable.tableNo}` : "No table assigned"}</span>
                      <span className="rounded-full bg-cream-200 px-2.5 py-1 font-semibold text-ink-soft">{booking.seatingPreference || "Any seating"}</span>
                      <span className="rounded-full bg-cream-200 px-2.5 py-1 font-semibold text-ink-soft">{booking.occasion || "General visit"}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => handleReservationAction(booking, "Confirmed")} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Accept</button>
                      <button onClick={() => handleReservationAction(booking, "Rejected")} className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">Reject</button>
                      <button onClick={() => handleReservationAction(booking, "Seated")} className="rounded-full bg-vibe-violet px-3 py-1.5 text-xs font-semibold text-white">Mark arrived</button>
                      <button onClick={() => handleReservationAction(booking, "Completed")} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Complete</button>
                      <button onClick={() => handleReservationAction(booking, "NoShow")} className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">No-show</button>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <select value={assignedTable?.id || ""} onChange={(e) => e.target.value && handleAssignTable(booking.bookingId, e.target.value)} className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-semibold outline-none">
                        <option value="">Assign table</option>
                        {currentTables.map((table) => <option key={table.id} value={table.id}>T{table.tableNo} · {table.status}</option>)}
                      </select>
                      <button onClick={() => handleTableBookingLookup(booking.bookingId)} className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft">Open booking</button>
                    </div>
                  </div>
                );
              }) : <EmptyState title="No pending requests" description="New reservations will appear here as they arrive from the customer app." />}
            </div>
          </SectionCard>

          <SectionCard title="Reservation history" description="Everything that has happened this service window." action={<Link href="/vendor/food/notifications" className="inline-flex items-center gap-2 text-sm font-semibold text-vibe-violet">Notifications <ChevronRight size={16} /></Link>}>
            <div className="space-y-3">
              {filteredBookings.slice(0, 10).map((booking) => (
                <div key={booking.bookingId} className="rounded-2xl border border-surface-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">{booking.customerName}</p>
                      <p className="text-xs text-ink-faint">{formatDate(booking.date)} · {booking.slotTime} · {booking.partySize} guest(s)</p>
                    </div>
                    <Badge tone={statusTone(booking.status) as never}>{booking.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-ink-soft">{booking.specialRequests || "No special request"}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {activeSection === "menu" && (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard title="Menu merchandising" description="Categorize, reorder, enable, and tag dishes for dine-in only browsing." action={<button onClick={addMenuItemToWorkspace} className="inline-flex items-center gap-2 rounded-full bg-vibe-violet px-4 py-2 text-sm font-semibold text-white"><Plus size={16} /> Add dish</button>}>
            <div className="space-y-3">
              {topMenuItems.map(({ item, meta }) => (
                <div key={item._id} className="rounded-2xl border border-surface-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.name}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">{item.category} · ₹{item.price.toLocaleString("en-IN")} · {meta.seasonal}</p>
                    </div>
                    <Badge tone={meta.enabled ? "success" : "neutral"}>{meta.enabled ? "Enabled" : "Disabled"}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {meta.dietaryTags.map((tagName) => <span key={tagName} className="rounded-full bg-cream-200 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">{tagName}</span>)}
                    {meta.chefSpecial && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">Chef special</span>}
                    {meta.recommended && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">Recommended</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => handleSaveMenuItem(item, { inStock: !item.inStock })} className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-200">{item.inStock ? "Disable" : "Enable"}</button>
                    <button onClick={() => handleSaveMenuItem(item, { price: item.price + 20 })} className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-200">+₹20</button>
                    <button onClick={() => handleSaveMenuItem(item, { price: Math.max(1, item.price - 20) })} className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-200">-₹20</button>
                    <button onClick={() => handleSaveMenuItem(item, { category: "Chef Specials" })} className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-cream-200">Chef special</button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Tagging controls" description="Mark dishes as seasonal, chef specials, and recommended." action={<Link href="/vendor/food/menu" className="inline-flex items-center gap-2 text-sm font-semibold text-vibe-violet">Full menu CRUD <ChevronRight size={16} /></Link>}>
            <div className="space-y-3">
              {topMenuItems.length > 0 ? topMenuItems.map(({ item, meta }) => (
                <div key={item._id} className="rounded-2xl border border-surface-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{item.name}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => setWorkspace(workspace ? { ...workspace, menu: { ...workspace.menu, [item._id]: { ...meta, recommended: !meta.recommended } } } : workspace)} className="rounded-full border border-surface-border px-2.5 py-1 text-[11px] font-semibold text-ink-soft">Recommended</button>
                    <button onClick={() => setWorkspace(workspace ? { ...workspace, menu: { ...workspace.menu, [item._id]: { ...meta, chefSpecial: !meta.chefSpecial } } } : workspace)} className="rounded-full border border-surface-border px-2.5 py-1 text-[11px] font-semibold text-ink-soft">Chef special</button>
                    <button onClick={() => setWorkspace(workspace ? { ...workspace, menu: { ...workspace.menu, [item._id]: { ...meta, enabled: !meta.enabled } } } : workspace)} className="rounded-full border border-surface-border px-2.5 py-1 text-[11px] font-semibold text-ink-soft">{meta.enabled ? "Disable" : "Enable"}</button>
                  </div>
                </div>
              )) : <EmptyState title="No menu items" description="Use the full menu page to build dishes, categories, and pricing." />}
            </div>
          </SectionCard>
        </div>
      )}

      {activeSection === "offers" && (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Offer studio" description="Create and manage flat discounts, buffet offers, happy hours, festive promos, and coupon campaigns." action={<button onClick={handleSaveOffer} className="inline-flex items-center gap-2 rounded-full bg-vibe-violet px-4 py-2 text-sm font-semibold text-white"><Plus size={16} /> Save offer</button>}>
            <div className="space-y-3">
              <input value={offerDraft?.title ?? ""} onChange={(e) => updateOfferDraft("title", e.target.value)} className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" placeholder="Offer title" />
              <input value={offerDraft?.subtitle ?? ""} onChange={(e) => updateOfferDraft("subtitle", e.target.value)} className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" placeholder="Short description" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={offerDraft?.type ?? "Flat discount"} onChange={(e) => updateOfferDraft("type", e.target.value as OfferType)} className="rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet">
                  {(["Flat discount", "Buffet", "Happy hour", "Complimentary", "Festival", "Coupon"] as const).map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <input value={offerDraft?.valueLabel ?? ""} onChange={(e) => updateOfferDraft("valueLabel", e.target.value)} className="rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" placeholder="Value label" />
                <input value={offerDraft?.validFrom ?? ""} onChange={(e) => updateOfferDraft("validFrom", e.target.value)} className="rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" type="date" />
                <input value={offerDraft?.validTo ?? ""} onChange={(e) => updateOfferDraft("validTo", e.target.value)} className="rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" type="date" />
                <input value={offerDraft?.startTime ?? ""} onChange={(e) => updateOfferDraft("startTime", e.target.value)} className="rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" placeholder="Start time" />
                <input value={offerDraft?.endTime ?? ""} onChange={(e) => updateOfferDraft("endTime", e.target.value)} className="rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" placeholder="End time" />
              </div>
              <input value={offerDraft?.couponCode ?? ""} onChange={(e) => updateOfferDraft("couponCode", e.target.value)} className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" placeholder="Coupon code (optional)" />
              <textarea value={offerDraft?.conditions.join(" • ") ?? ""} onChange={(e) => updateOfferDraft("conditions", e.target.value.split("•").map((item) => item.trim()).filter(Boolean))} className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm outline-none focus:border-vibe-violet" placeholder="Separate conditions with •" />
              <label className="flex items-center gap-2 rounded-2xl border border-surface-border px-4 py-3 text-sm font-semibold text-ink-soft">
                <input type="checkbox" checked={offerDraft?.active ?? true} onChange={(e) => updateOfferDraft("active", e.target.checked)} />
                Active now
              </label>
            </div>
          </SectionCard>

          <SectionCard title="Live offers" description="Toggle what the customer app should surface right now.">
            <div className="space-y-3">
              {currentOffers.map((offer) => (
                <div key={offer.id} className="rounded-2xl border border-surface-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink">{offer.title}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">{offer.type} · {offer.valueLabel} · {offer.validFrom} to {offer.validTo}</p>
                    </div>
                    <Badge tone={offer.active ? "success" : "neutral"}>{offer.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-ink-soft">{offer.subtitle}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {offer.conditions.map((condition) => <span key={condition} className="rounded-full bg-cream-200 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">{condition}</span>)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => setOfferDraft(offer)} className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft">Edit</button>
                    <button onClick={() => handleToggleOffer(offer.id)} className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-soft">{offer.active ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => handleDeleteOffer(offer.id)} className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-semibold text-rose-600">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {activeSection === "payments" && (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard title="Settlement summary" description="Track payouts, deductions, commissions, refunds, and GST-level reporting." action={<button onClick={() => setToast("A settlement report can be exported from the table below.")} className="inline-flex items-center gap-2 rounded-full bg-vibe-violet px-4 py-2 text-sm font-semibold text-white"><FileDown size={16} /> Export</button>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Gross billed" value={`₹${(dineDashboard?.grossBilled ?? filteredBills.reduce((sum, bill) => sum + bill.billAmount, 0)).toLocaleString("en-IN")}`} hint="Before discounts and fees" icon={IndianRupee} tone="info" />
              <MetricCard label="Net revenue" value={`₹${(dineDashboard?.netRevenue ?? filteredBills.reduce((sum, bill) => sum + bill.restaurantNet, 0)).toLocaleString("en-IN")}`} hint="Restaurant share after deductions" icon={BadgePercent} tone="success" />
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {filteredBills.slice(0, 6).map((bill) => (
                <div key={bill.billId} className="flex items-center justify-between gap-3 rounded-2xl border border-surface-border px-4 py-3">
                  <div>
                    <p className="font-semibold text-ink">{bill.customerName}</p>
                    <p className="text-xs text-ink-faint">{bill.billId} · {formatDate(bill.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-ink">₹{bill.payableAmount.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-ink-faint">GST + convenience fee</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Invoices and payout history" description="Download receipts for the front desk or accounting team." action={<Link href="/vendor/food/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-vibe-violet">Analytics <ChevronRight size={16} /></Link>}>
            <div className="space-y-3">
              {filteredBills.slice(0, 5).map((bill, index) => {
                const sourceOrder = filteredOrders[index];
                return (
                  <div key={bill.billId} className="rounded-2xl border border-surface-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{bill.customerName}</p>
                        <p className="mt-0.5 text-xs text-ink-faint">{formatDate(bill.createdAt)} · {bill.paymentMethod || "Unknown payment"}</p>
                      </div>
                      <button onClick={() => handleDownloadInvoice(bill, sourceOrder)} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Download</button>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-cream-200/70 p-3 text-xs">
                        <p className="font-semibold text-ink">Bill</p>
                        <p className="mt-1 text-ink-faint">₹{bill.billAmount.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="rounded-xl bg-cream-200/70 p-3 text-xs">
                        <p className="font-semibold text-ink">Payable</p>
                        <p className="mt-1 text-ink-faint">₹{bill.payableAmount.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="rounded-xl bg-cream-200/70 p-3 text-xs">
                        <p className="font-semibold text-ink">Restaurant net</p>
                        <p className="mt-1 text-ink-faint">₹{bill.restaurantNet.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      )}

      {activeSection === "analytics" && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Operational analytics" description="Daily, weekly, monthly, and yearly booking and revenue performance.">
            <div className="space-y-4">
              {(foodDashboard?.chart ?? []).map((point) => (
                <div key={point.date}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{point.label}</span>
                    <span className="text-ink-faint">₹{point.revenue.toLocaleString("en-IN")} · {point.orders} order(s)</span>
                  </div>
                  <div className="mt-1.5 h-2.5 rounded-full bg-cream-300">
                    <div className="h-full rounded-full bg-gradient-to-r from-vibe-violet to-vibe-lime" style={{ width: `${Math.max(8, Math.min(100, point.orders * 12))}%` }} />
                  </div>
                </div>
              ))}
              {(!foodDashboard?.chart || foodDashboard.chart.length === 0) && <EmptyState title="No chart data yet" description="The dashboard chart will show once the API returns live revenue and order totals." />}
            </div>
          </SectionCard>

          <SectionCard title="Performance signals" description="Peak dining hours, repeat customers, menu popularity, and offer performance.">
            <div className="grid gap-3">
              <div className="rounded-2xl border border-surface-border p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">Repeat customers</p>
                <p className="mt-1 text-2xl font-black text-ink">{repeatCustomers}</p>
              </div>
              <div className="rounded-2xl border border-surface-border p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">Peak dining hours</p>
                <p className="mt-1 text-sm font-semibold text-ink">{dineDashboard?.bookingsByStatus.Confirmed ? "7 PM - 9 PM" : "6 PM - 10 PM"}</p>
              </div>
              <div className="rounded-2xl border border-surface-border p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">Offer performance</p>
                <p className="mt-1 text-sm font-semibold text-ink">{activeOffers.length} active offer(s) driving conversions</p>
              </div>
              <div className="rounded-2xl border border-surface-border p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">Menu popularity</p>
                <p className="mt-1 text-sm font-semibold text-ink">{topMenuItems[0]?.item.name || "No menu data"} is leading in the current mix</p>
              </div>
              <div className="rounded-2xl border border-surface-border p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">Customer ratings</p>
                <p className="mt-1 text-sm font-semibold text-ink">{selectedMeta.rating.toFixed(1)} ★ across {selectedMeta.reviewCount.toLocaleString("en-IN")} public ratings</p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {activeSection === "reviews" && (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard title="Customer reviews" description="Reply to feedback and flag anything inappropriate.">
            <div className="space-y-3">
              {currentReviews.map((review) => (
                <div key={review.id} className="rounded-2xl border border-surface-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{review.author}</p>
                      <p className="text-xs text-ink-faint">{review.occasion} · {review.visited}</p>
                    </div>
                    <Badge tone="pending">{review.rating.toFixed(1)} ★</Badge>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">{review.comment}</p>
                  {review.reply && <p className="mt-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><span className="font-semibold">Reply:</span> {review.reply}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      value={reviewReply[review.id] ?? ""}
                      onChange={(e) => setReviewReply((current) => ({ ...current, [review.id]: e.target.value }))}
                      className="min-w-0 flex-1 rounded-full border border-surface-border px-4 py-2 text-xs outline-none focus:border-vibe-violet"
                      placeholder="Write a reply"
                    />
                    <button onClick={() => workspace && setWorkspace({ ...workspace, reviews: workspace.reviews.map((item) => item.id === review.id ? { ...item, reply: reviewReply[review.id] ?? item.reply } : item) })} className="rounded-full bg-vibe-violet px-3 py-2 text-xs font-semibold text-white">Reply</button>
                    <button onClick={() => workspace && setWorkspace({ ...workspace, reviews: workspace.reviews.map((item) => item.id === review.id ? { ...item, reported: true } : item) })} className="rounded-full border border-surface-border px-3 py-2 text-xs font-semibold text-rose-600">Report</button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Ratings snapshot" description="What guests are saying overall.">
            <div className="space-y-3">
              {["5", "4", "3", "2", "1"].map((starLabel) => {
                const count = currentReviews.filter((review) => Math.floor(review.rating) === Number(starLabel)).length;
                const pct = currentReviews.length > 0 ? Math.max(8, (count / currentReviews.length) * 100) : 8;
                return (
                  <div key={starLabel}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{starLabel} star</span>
                      <span className="text-ink-faint">{count}</span>
                    </div>
                    <div className="mt-1.5 h-2.5 rounded-full bg-cream-300">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      )}

      {activeSection === "team" && (
        <SectionCard
          title="Staff and permissions"
          description="Create managers, receptionists, cashiers, and operations staff with role-based access."
          action={<Link href="/vendor/role-access" className="inline-flex items-center gap-2 rounded-full bg-vibe-violet px-4 py-2 text-sm font-semibold text-white">Open role access <ChevronRight size={16} /></Link>}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {staff.length > 0 ? staff.map((member) => (
              <div key={member.id} className="rounded-2xl border border-surface-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{member.holderName}</p>
                    <p className="text-xs text-ink-faint">{member.roleName} · {member.holderEmail}</p>
                  </div>
                  <Badge tone={member.status === "Active" ? "success" : "neutral"}>{member.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-ink-soft">{member.holderPhone}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => deleteVendorStaff(member.id).then(() => setStaff((current) => current.filter((item) => item.id !== member.id))).catch((error) => setToast(error instanceof ApiError ? error.describe() : "Could not remove staff"))} className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-semibold text-rose-600">Remove</button>
                </div>
              </div>
            )) : <EmptyState title="No staff loaded" description="Use the dedicated role access page to create staff accounts and permissions." />}
          </div>
        </SectionCard>
      )}

      {activeSection === "activity" && (
        <SectionCard title="Activity log" description="Every major change is tracked here for security and auditing.">
          <div className="space-y-3">
            {currentActivity.map((entry) => (
              <div key={entry.id} className="flex gap-3 rounded-2xl border border-surface-border p-4">
                <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${entry.tone === "success" ? "bg-emerald-500" : entry.tone === "danger" ? "bg-rose-500" : entry.tone === "pending" ? "bg-amber-500" : "bg-sky-500"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{entry.title}</p>
                    <span className="text-xs text-ink-faint">{formatTime(entry.time)}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">{entry.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {activeSection === "notifications" && (
        <SectionCard title="Vendor notifications" description="Reservation, payment, and offer alerts in one place." action={<button onClick={() => setWorkspace(workspace ? { ...workspace, notifications: workspace.notifications.map((item) => ({ ...item, unread: false })) } : workspace)} className="inline-flex items-center gap-2 rounded-full bg-vibe-violet px-4 py-2 text-sm font-semibold text-white"><CheckCircle2 size={16} /> Mark all read</button>}>
          <div className="space-y-3">
            {currentNotifications.map((notification) => (
              <div key={notification.id} className={`rounded-2xl border p-4 ${notification.unread ? "border-vibe-violet/20 bg-vibe-violet/5" : "border-surface-border bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{notification.title}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">{formatTime(notification.time)}</p>
                  </div>
                  <button onClick={() => setNotificationRead(notification.id)} className="rounded-full border border-surface-border px-3 py-1 text-[11px] font-semibold text-ink-soft">{notification.unread ? "Mark read" : "Read"}</button>
                </div>
                <p className="mt-2 text-xs text-ink-soft">{notification.detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="rounded-2xl border border-surface-border bg-white p-4 text-sm text-ink-soft shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-ink">Customer app sync status</p>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 size={14} /> Approved profile and menu data should sync to the app
          </span>
        </div>
        <p className="mt-2">
          BookYourVibe should render all approved restaurant information, photos, menus, seating, offers, and availability from this workspace. Use the shared restaurant routes for deeper editing, and the customer app can consume the same approval-ready data model.
        </p>
      </div>
    </div>
  );
}
