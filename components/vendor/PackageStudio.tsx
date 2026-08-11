"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { Check, ExternalLink, Loader2, Plus, Trash2, Upload, X, Clock3, ChevronLeft, ChevronRight, LayoutGrid, List, Sunrise, Sun, Sunset, Moon, Ban, Crop, ArrowUpDown, Lightbulb, Layers, Grid, LocateFixed, Pencil, Info, Camera, GraduationCap, MoreVertical, CheckCircle2, ImagePlus, Image as ImageIcon } from "lucide-react";
import { uploadAdminImage, uploadVendorImage } from "@/lib/api/uploads";
import { ApiError } from "@/lib/api/client";
import {
  createVendorCustomSport,
  deleteVendorCustomSport,
  getVendorCustomSports,
  updateVendorCustomSport,
  VendorCustomSport,
} from "@/lib/api/vendor";
import {
  AddOn,
  BookingType,
  Coupon,
  ItineraryStop,
  Listing,
  ListingFAQ,
  ListingImage,
  ListingType,
  PriceTier,
  TurfSlot,
  Court,
} from "@/lib/types";
import { ClockSlotsWidget } from "./ClockSlotsWidget";
import { SPORT_CATEGORIES, SportCategory, venueOptionsFor, VenueSetting } from "@/lib/taxonomy";
import { usePexelsImage } from "@/lib/pexels";
import { trackEvent, trackPriceChange } from "@/lib/analytics";
import { INDIAN_HOLIDAYS } from "@/lib/holidays";

type Audience = "admin" | "vendor";

const STEPS = [
  { id: 1, label: "Images", hint: "Media uploads" },
  { id: 2, label: "Slots", hint: "Turf time slots" },
  { id: 3, label: "Details", hint: "Name & games / categories" },
  { id: 4, label: "Location", hint: "Venue address & map" },
  { id: 5, label: "Pricing", hint: "Set prices per slot" },
  { id: 6, label: "Publish", hint: "Review details & save" },
] as const;

/** Event-friendly labels for the same step components (BookingStep renders booking
 * setup for events, PricingStep renders participant tiers, etc.). */
const EVENT_STEPS = [
  { id: 1, label: "Event photos", hint: "Poster & banner" },
  { id: 2, label: "Booking", hint: "Dates & timezone" },
  { id: 3, label: "Details", hint: "Name & category" },
  { id: 4, label: "Location", hint: "Venue & map" },
  { id: 5, label: "Pricing", hint: "Rates & add-ons" },
  { id: 6, label: "Launch", hint: "Publish your event" },
] as const;

/** Extra step appended only when the vendor opts into adding an academy at this venue. */
const ACADEMY_STEP = { id: 7, label: "Academy", hint: "Coaching at this venue" } as const;

/** Academy details collected inline in the Package Studio, saved right after the
 * listing itself is created (an academy needs a listing id to attach to). */
export interface AcademyDraft {
  name: string;
  sports: string[];
  pricingMode: "session" | "day" | "month";
  price: string;
  days: number[];
  startTime: string;
  endTime: string;
  capacity: string;
}

export function emptyAcademyDraft(): AcademyDraft {
  return {
    name: "",
    sports: [],
    pricingMode: "month",
    price: "",
    days: [1, 2, 3, 4, 5, 6],
    startTime: "16:00",
    endTime: "18:00",
    capacity: "20",
  };
}

function stepsFor(type: ListingType, withAcademy = false) {
  if (type === "Event") return EVENT_STEPS; // Events never host an academy.
  return withAcademy ? [...STEPS, ACADEMY_STEP] : STEPS;
}

function formatListedOn(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function to12h(t: string) {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr) % 24; // "24:00" (midnight close) → 12:00 AM
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${ap}`;
}

/** Starter template for new venue packages — vendors edit or remove whatever doesn't apply.
 * Events start blank since Included/Excluded mean trip inclusions there, not venue facilities. */
const DEFAULT_PACKAGE_DESCRIPTION =
  "A well-maintained venue with a quality playing surface and proper lighting. " +
  "Perfect for casual games, regular practice sessions and small tournaments. " +
  "Easy to reach, with an on-ground team ready to help you get started.";
const DEFAULT_AMENITIES_PROVIDED = ["Washrooms", "Parking", "Floodlights", "Drinking Water", "First Aid Kit", "Seating Area"];
const DEFAULT_AMENITIES_NOT_PROVIDED = ["Equipment Rental", "Cafeteria"];

/** Common venue facilities offered as one-tap chips in the Amenities step (either column).
 * The vendor can still type anything custom — these just save the usual ones. */
const AMENITY_SUGGESTIONS = [
  "Washrooms", "Parking", "Floodlights", "Drinking Water", "First Aid Kit", "Seating Area",
  "Changing Rooms", "Showers", "Lockers", "CCTV", "Wi-Fi", "Cafeteria", "Equipment Rental",
  "Shoe Rental", "Coaching", "Air Conditioning", "Shaded Area", "Spectator Seating",
  "Sound System", "Scoreboard", "Wheelchair Access",
];
/** For Events, "Included / Excluded" are trip inclusions, not venue facilities. */
const EVENT_INCLUSION_SUGGESTIONS = [
  "Professional guide", "Equipment", "Refreshments", "Transport", "Insurance", "Photography", "Certificate",
];

function emptyListing(type: ListingType): Listing {
  const now = new Date();
  const isEvent = type === "Event";
  return {
    id: `byv-${now.getTime()}`,
    title: "",
    type,
    categories: [],
    subCategories: [],
    sportCapacities: [],
    courts: [],
    price: 0,
    listedOn: formatListedOn(now),
    status: "Inactive",
    trending: false,
    isPrivate: false,
    access: "Vendor Owned",
    images: [],
    country: "India",
    city: "",
    state: "",
    cityMode: "single",
    cities: [],
    address: "",
    startingPoint: "",
    endingPoint: "",
    reportingStartTime: "",
    reportingEndTime: "",
    description: isEvent ? "" : DEFAULT_PACKAGE_DESCRIPTION,
    highlights: [],
    inclusions: isEvent ? [] : [...DEFAULT_AMENITIES_PROVIDED],
    exclusions: isEvent ? [] : [...DEFAULT_AMENITIES_NOT_PROVIDED],
    itinerary: [],
    faqs: [],
    tags: [],
    technicalSpecs: [],
    priceTiers: [],
    addOns: [],
    coupons: [],
    bookingType: "Recurring",
    availableFrom: now.toISOString().slice(0, 10),
    availableTill: now.toISOString().slice(0, 10),
    slotsPerDay: 0,
  };
}

type StepProps = {
  draft: Listing;
  update: <K extends keyof Listing>(key: K, value: Listing[K]) => void;
};

function uploadImage(audience: Audience, file: File) {
  return audience === "admin" ? uploadAdminImage(file, "listings") : uploadVendorImage(file, "listings");
}

/** The top-level `price` shown on listing cards / detail pages isn't edited directly anywhere in
 * this form — it must be derived from the per-slot pricing (Step 5) so customers and vendors see
 * the real "starting from" price instead of the 0 the draft is initialized with. */
function computeStartingPrice(listing: Listing): number {
  if (listing.type === "Event") {
    const amounts = listing.priceTiers.map((t) => t.amount).filter((a) => a > 0);
    return amounts.length ? Math.min(...amounts) : 0;
  }
  const allSlots = [
    ...(listing.slotsList ?? []),
    ...((listing.dateOverrides ?? []).flatMap((o) => o.slots ?? [])),
  ];
  const pricedSlots = allSlots.filter((s) => s.price > 0 && !s.blocked).map((s) => s.price);
  return pricedSlots.length ? Math.min(...pricedSlots) : 0;
}

const inputClass =
  "w-full rounded-lg border border-surface-border bg-cream-200/40 px-3 py-2.5 text-sm outline-none focus:border-vibe-violet placeholder:text-ink-faint";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
      {children}
    </label>
  );
}

function ToggleGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-surface-border text-xs font-semibold">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 ${value === opt.value ? "bg-ink text-white" : "bg-white text-ink-soft hover:bg-cream-300"
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function TagField({
  label,
  placeholder,
  values,
  onChange,
  tone,
  suggestions = [],
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (v: string[]) => void;
  tone?: "success" | "danger";
  /** Common options offered as one-tap chips, so the vendor can pick instead of typing. */
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");

  function add(raw?: string) {
    const v = (raw ?? input).trim();
    if (!v) return;
    // Case-insensitive de-dupe so "Parking" isn't added twice.
    if (!values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    if (raw === undefined) setInput("");
  }

  const pillTone =
    tone === "success" ? "bg-lime-100 text-vibe-limeDark" : tone === "danger" ? "bg-rose-100 text-vibe-coral" : "bg-vibe-violet/10 text-vibe-violet";

  // Only suggest what hasn't been added yet.
  const openSuggestions = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className={inputClass}
        />
        <button onClick={() => add()} className="shrink-0 rounded-lg bg-vibe-violet px-4 text-xs font-semibold text-white">
          Add
        </button>
      </div>

      {/* One-tap common options */}
      {openSuggestions.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {openSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-surface-border bg-white px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-vibe-violet/50 hover:text-vibe-violet"
            >
              <Plus size={11} /> {s}
            </button>
          ))}
        </div>
      )}

      {values.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((v, i) => (
            <span key={i} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${pillTone}`}>
              {v}
              <button onClick={() => onChange(values.filter((_, idx) => idx !== i))}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP 1 — PACKAGE PHOTOS                                            */
/* ------------------------------------------------------------------ */

function PhotoBox({
  label,
  tag,
  dims,
  hint,
  image,
  uploading,
  inputRef,
  onFile,
  onRemove,
  outputNote,
  aspectClass,
  wrapperClass,
}: {
  label: string;
  tag: string;
  dims: string;
  hint: string;
  image?: ListingImage;
  uploading?: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File | undefined) => void;
  onRemove?: () => void;
  outputNote: string;
  aspectClass?: string;
  wrapperClass?: string;
}) {
  return (
    <div className={`flex flex-col rounded-xl border border-surface-border bg-white p-4 shadow-sm ${wrapperClass || ""}`}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-ink">{label}</h4>
            <span className="rounded bg-vibe-violet/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-vibe-violet">{tag}</span>
          </div>
          <p className="mt-1 text-xs text-ink-faint">{hint}</p>
          <p className="text-xs text-ink-faint">Recommended: {dims}</p>
        </div>
        <button type="button" className="text-ink-faint hover:text-ink">
          <Info size={16} />
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {uploading ? (
        <div className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-surface-border bg-cream-50 ${aspectClass || 'flex-1 min-h-[240px]'}`}>
          <Loader2 size={24} className="animate-spin text-vibe-violet" />
          <span className="text-xs font-semibold text-ink-faint">Uploading...</span>
        </div>
      ) : image ? (
        <div className={`group relative w-full overflow-hidden rounded-xl bg-cream-100 ${aspectClass || 'flex-1 min-h-[240px]'}`}>
          <img src={image.url} alt={label} className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" />
          <div className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
            <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-1.5 rounded-lg bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm transition hover:bg-black/80">
              <Pencil size={12} />
              Change
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-surface-border bg-cream-50 transition-colors hover:bg-cream-100 ${aspectClass || 'flex-1 min-h-[240px]'}`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-vibe-violet shadow-sm">
            <Upload size={16} />
          </span>
          <span className="text-sm font-semibold text-ink">Upload {label.toLowerCase()}</span>
        </button>
      )}

      <div className="mt-4 flex gap-2 rounded-lg bg-vibe-violet/5 px-3 py-2.5 text-[11px] text-vibe-violet/80">
        <Lightbulb size={14} className="shrink-0 mt-0.5" />
        <span className="leading-snug">{outputNote}</span>
      </div>
    </div>
  );
}

function PackageStep({
  draft,
  update,
  audience,
  academyEnabled,
  onToggleAcademy,
}: StepProps & {
  audience: Audience;
  /** Undefined for Events — they never host an academy, so the prompt is hidden. */
  academyEnabled?: boolean;
  onToggleAcademy?: (on: boolean) => void;
}) {
  const posterInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const universalInput = useRef<HTMLInputElement>(null);
  const bulkInput = useRef<HTMLInputElement>(null);
  const [uploadingTypes, setUploadingTypes] = useState<Set<string>>(new Set());
  const [bulkUploading, setBulkUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function appendFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBulkUploading(true);
    try {
      const results = await Promise.all(Array.from(files).map((f) => uploadImage(audience, f)));
      const currentImages = draft.universalImages || [];
      const startIndex = currentImages.length;
      const newImages: ListingImage[] = results.map((r, i) => ({
        id: `img-${Date.now()}-${i}`,
        url: r.url,
        label: `Photo ${startIndex + i + 1}`,
      }));
      update("universalImages", [...currentImages, ...newImages]);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Upload failed");
    } finally {
      setBulkUploading(false);
    }
  }

  async function handleMainUpload(type: "poster" | "banner", file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploadingTypes((prev) => new Set(prev).add(type));
    try {
      const result = await uploadImage(audience, file);
      const newImage = { id: `img-${Date.now()}-${type}`, url: result.url, label: type === "poster" ? "Poster" : "Banner" };
      if (type === "poster") update("posterImage", newImage);
      else if (type === "banner") update("bannerImage", newImage);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Upload failed");
    } finally {
      setUploadingTypes((prev) => {
        const next = new Set(prev);
        next.delete(type);
        return next;
      });
    }
  }

  function removeMain(type: "poster" | "banner") {
    if (type === "poster") update("posterImage", undefined);
    else if (type === "banner") update("bannerImage", undefined);
  }

  function usePosterAsBanner() {
    if (draft.posterImage) {
      update("bannerImage", { ...draft.posterImage, id: `img-${Date.now()}-banner`, label: "Banner" });
    }
  }

  const galleryImages = [...(draft.universalImages || []), ...draft.images];

  function removeAt(index: number) {
    const uniLen = (draft.universalImages || []).length;
    if (index < uniLen) {
      update("universalImages", draft.universalImages!.filter((_, i) => i !== index));
    } else {
      update("images", draft.images.filter((_, i) => i !== (index - uniLen)));
    }
  }

  const poster = draft.posterImage;
  const banner = draft.bannerImage;

  return (
    <div>
      {onToggleAcademy && (
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-vibe-violet/10 bg-vibe-violet/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vibe-violet/10 text-vibe-violet">
              <GraduationCap size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Do you also run an academy here?</p>
              <p className="text-xs text-ink-faint">
                Turn this on to add a step for the academy&apos;s name, sports and fees.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {[
              {
                label: "Yes, add academy",
                on: true,
                className: academyEnabled
                  ? "border border-vibe-violet/20 bg-vibe-violet/10 text-vibe-violet"
                  : "border border-surface-border bg-white text-ink-faint hover:bg-slate-50",
              },
              {
                label: "No, just the venue",
                on: false,
                className: !academyEnabled
                  ? "bg-indigo-950 text-white shadow-sm"
                  : "border border-surface-border bg-white text-ink-faint hover:bg-slate-50",
              },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => onToggleAcademy(opt.on)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${opt.className}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-base font-semibold text-ink">Cover Images (Recommended)</h3>
        <p className="text-sm text-ink-faint">
          Add a poster and banner to make your listing stand out. You can update or replace them anytime.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-vibe-coral">{error}</div>
      )}



      <div className="flex flex-col gap-5 lg:flex-row mb-6 items-stretch">
        <PhotoBox
          label="Poster Image"
          tag="OPTIONAL"
          dims="1080 x 1350 px (4:5)"
          hint="Best for cards, search results & mobile screens"
          image={poster}
          uploading={uploadingTypes.has("poster")}
          inputRef={posterInput}
          onFile={(f) => handleMainUpload("poster", f)}
          onRemove={poster ? () => removeMain("poster") : undefined}
          outputNote="This image will be shown on listing cards and in search results."
          wrapperClass="lg:w-[320px] shrink-0"
          aspectClass="h-[220px]"
        />
        <PhotoBox
          label="Banner Image"
          tag="OPTIONAL"
          dims="1600 x 900 px (16:9)"
          hint="Best for detail page headers & hero sections"
          image={banner}
          uploading={uploadingTypes.has("banner")}
          inputRef={bannerInput}
          onFile={(f) => handleMainUpload("banner", f)}
          onRemove={banner ? () => removeMain("banner") : undefined}
          outputNote="This image will be shown at the top of your listing detail page."
          wrapperClass="flex-1"
          aspectClass="h-[220px]"
        />
      </div>

      {poster && !banner && (
        <button
          type="button"
          onClick={usePosterAsBanner}
          className="mb-6 rounded-md border border-vibe-violet/20 bg-vibe-violet/5 px-3 py-1.5 text-[11px] font-semibold text-vibe-violet transition-colors hover:bg-vibe-violet/10"
        >
          Use poster as banner too
        </button>
      )}

      <div className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-ink">Universal Photos</h3>
              <span className="rounded bg-vibe-violet/10 px-1.5 py-0.5 text-[10px] font-semibold text-vibe-violet uppercase">REQUIRED</span>
            </div>
            <p className="text-sm text-ink-faint">
              Add 1–10 photos. These photos will be used across different screens and layouts in the app.
            </p>
          </div>
          <span className="text-sm font-medium text-vibe-violet">{galleryImages.length} / 10 photos</span>
        </div>
        
        <input
          ref={bulkInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            appendFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="rounded-xl border border-vibe-violet/10 bg-white p-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => bulkInput.current?.click()}
              disabled={bulkUploading || galleryImages.length >= 10}
              className="flex h-36 w-36 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-vibe-violet/30 bg-vibe-violet/5 hover:bg-vibe-violet/10 transition disabled:opacity-50"
            >
              {bulkUploading ? (
                <>
                  <Loader2 size={24} className="mb-2 animate-spin text-vibe-violet" />
                  <span className="text-sm font-semibold text-vibe-violet">Uploading...</span>
                </>
              ) : (
                <>
                  <ImagePlus size={24} className="mb-2 text-vibe-violet" />
                  <span className="text-sm font-semibold text-vibe-violet">Add Photos</span>
                  <span className="text-[10px] text-vibe-violet/70">or drag and drop</span>
                  <span className="mt-1 text-[9px] text-vibe-violet/60">JPG, PNG, WEBP (max 10MB each)</span>
                </>
              )}
            </button>

            {galleryImages.map((img, i) => (
              <div key={img.id} className="relative h-36 w-32 shrink-0 overflow-hidden rounded-xl border border-surface-border group">
                <img src={img.url} className="h-full w-full object-cover" alt={img.label} />
                <div className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-[10px] font-bold text-vibe-violet backdrop-blur-sm">
                  {i + 1}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => removeAt(i)} className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-rose-500/80">
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
            ))}

            {Array.from({ length: 10 - galleryImages.length }).map((_, i) => (
              <div key={`empty-${i}`} className="relative flex h-36 w-32 shrink-0 items-center justify-center rounded-xl border border-dashed border-surface-border bg-slate-50/50">
                <div className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-300">
                  {galleryImages.length + i + 1}
                </div>
                <ImageIcon size={24} className="text-slate-200" />
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg bg-vibe-violet/5 px-4 py-3 text-xs text-vibe-violet">
            <Lightbulb size={14} className="shrink-0" />
            <span><span className="font-semibold">Tip:</span> Use clear, high quality photos of your venue, facilities, seating, and surroundings.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP 3 — DETAILS                                                   */
/* ------------------------------------------------------------------ */

/** A stable gradient per option, so cards without local artwork still look
 * distinct from each other instead of all sharing one generic stock photo. */
const TILE_GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-orange-400 to-rose-500",
  "from-sky-500 to-blue-600",
  "from-fuchsia-500 to-purple-600",
  "from-amber-400 to-orange-500",
  "from-cyan-500 to-sky-600",
  "from-rose-400 to-pink-600",
];
function gradientFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TILE_GRADIENTS[h % TILE_GRADIENTS.length];
}

/** Per-sport search terms that return a clearly on-topic photo. Anything not
 * listed falls back to "<label> sport court". */
const CATEGORY_IMAGE_QUERY: Record<string, string> = {
  basketball: "basketball court game",
  volleyball: "volleyball court game",
  swimming: "swimming pool lanes",
  "snooker-pool": "snooker billiards table",
  skating: "roller skating rink",
  "indoor-games": "carrom board game",
};

function CategoryPhoto({ cat }: { cat: SportCategory }) {
  // Curated local artwork wins; otherwise fetch a distinct, on-topic photo.
  // (Skipping the fetch entirely when we already have local art.)
  const query = cat.image ? null : CATEGORY_IMAGE_QUERY[cat.id] ?? `${cat.label} sport court`;
  const { url } = usePexelsImage(query);
  const [errored, setErrored] = useState(false);
  const src = cat.image ?? url;
  if (src && !errored) {
    return (
      <img
        src={src}
        alt={cat.label}
        onError={() => setErrored(true)}
        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        loading="lazy"
        decoding="async"
      />
    );
  }
  // Last resort (offline / photo missing): a distinct gradient per sport, so two
  // cards can never render the same shared stock image again.
  return <div className={`h-full w-full bg-gradient-to-br ${gradientFor(cat.id)} transition duration-300 group-hover:scale-105`} />;
}

/**
 * Courts are the venue's bookable units. Without them the whole venue is one unit, so a
 * single 6-7 AM booking blocks everyone else out of that hour — with three courts listed,
 * the same hour sells three times over.
 *
 * A court belongs to one or more of the games the venue offers: a single hall can be a
 * badminton court in the morning and a pickleball court in the evening, while a box-cricket
 * pitch hosts only cricket. Players pick their game first, so the counter at the top shows
 * exactly how many courts each game will sell.
 */
interface GameCourtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sportLabel: string;
  draft: Listing;
  update: <K extends keyof Listing>(key: K, value: Listing[K]) => void;
  audience: Audience;
  allCategories: SportCategory[];
}

function GameCourtsModal({
  isOpen,
  onClose,
  sportLabel,
  draft,
  update,
  audience,
  allCategories,
}: GameCourtsModalProps) {
  const courts = draft.courts ?? [];
  const setCourts = (next: Court[]) => update("courts", next);

  const hostsSport = (court: Court, label: string) =>
    court.sports.length === 0 || court.sports.includes(label);

  // Filter courts hosting the active sport
  const activeCourtsWithIndices = useMemo(() => {
    return courts
      .map((court, originalIndex) => ({ court, originalIndex }))
      .filter(({ court }) => hostsSport(court, sportLabel));
  }, [courts, sportLabel]);

  // Other courts in this listing that do NOT host the active sport
  const otherCourtsWithIndices = useMemo(() => {
    return courts
      .map((court, originalIndex) => ({ court, originalIndex }))
      .filter(({ court }) => !hostsSport(court, sportLabel));
  }, [courts, sportLabel]);

  const [activeTab, setActiveTab] = useState<number>(0);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [showPriceInfo, setShowPriceInfo] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(0);
      setShowInfo(false);
      setShowPriceInfo(false);
    }
  }, [isOpen, sportLabel]);

  const currentTab = Math.min(activeTab, Math.max(0, activeCourtsWithIndices.length - 1));

  const patch = (index: number, changes: Partial<Court>) =>
    setCourts(courts.map((c, i) => (i === index ? { ...c, ...changes } : c)));

  const addCourtForSport = () => {
    const nextCourts = [
      ...courts,
      {
        id: `court-${Date.now()}-${courts.length}`,
        name: `Court ${courts.length + 1}`,
        sports: [sportLabel],
        priceOverride: null,
        sportPrices: [],
        image: "",
        surface: "",
        active: true,
      },
    ];
    setCourts(nextCourts);
    // Find what the new length of active courts will be
    const hostsSportVal = (c: Court) => c.sports.length === 0 || c.sports.includes(sportLabel);
    const newActiveCount = nextCourts.filter(hostsSportVal).length;
    setActiveTab(newActiveCount - 1);
  };

  const sportLabels = draft.categories.map(
    (catId) => allCategories.find((c) => c.id === catId)?.label ?? catId
  );

  const allConfiguredSlots = [
    ...(draft.slotsList ?? []),
    ...((draft.dateOverrides ?? []).flatMap((o) => o.slots ?? [])),
  ];
  const slotPrices = allConfiguredSlots.filter((s) => s.price > 0 && !s.blocked).map((s) => s.price);
  const slotPrice = slotPrices.length ? Math.min(...slotPrices) : 0;
  const slotPriceMax = slotPrices.length ? Math.max(...slotPrices) : 0;
  const slotPriceLabel = !slotPrice
    ? ""
    : slotPrice === slotPriceMax
      ? `₹${slotPrice.toLocaleString("en-IN")}`
      : `₹${slotPrice.toLocaleString("en-IN")}–₹${slotPriceMax.toLocaleString("en-IN")}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-3xl border border-surface-border bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border pb-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-vibe-violet/10 text-vibe-violet">
              <Layers size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-ink leading-none">
                  Configure {sportLabel}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowInfo(!showInfo)}
                  className={`rounded-full p-1 transition cursor-pointer ${showInfo ? "bg-vibe-violet/20 text-vibe-violet" : "text-ink-faint hover:bg-cream-200 hover:text-ink"
                    }`}
                  title="Show Info"
                >
                  <Info size={15} />
                </button>
                {slotPrice ? (
                  <span className="rounded-full bg-vibe-violet/10 px-2 py-0.5 text-[10px] font-black text-vibe-violet">
                    {slotPriceLabel}/hr
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPriceInfo(!showPriceInfo)}
                    className={`rounded-full p-1 transition cursor-pointer ${showPriceInfo ? "bg-red-200 text-red-700" : "bg-red-50 text-red-500 hover:bg-red-100 animate-pulse"
                      }`}
                    title="Price Warning"
                  >
                    <Info size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-faint hover:bg-cream-200 hover:text-ink transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="mt-3 flex-1 overflow-y-auto pr-1 space-y-3">
          {/* Info guide panel */}
          {showInfo && (
            <div className="rounded-xl border border-surface-border bg-cream-200/40 p-3 text-[11px] text-ink-soft animate-in slide-in-from-top-1 duration-200 space-y-1">
              <p>• Add and manage bookable courts/pitches that host this sport.</p>
              <p>• Every court configured for this sport will sell at the slots hourly price by default.</p>
              <p>• You can enable this sport on other existing courts if they are multi-purpose.</p>
            </div>
          )}

          {/* Price Warning Details Banner */}
          {showPriceInfo && !slotPrice && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] font-bold text-red-700 animate-in slide-in-from-top-1 duration-155">
              No time slot price set yet — add slots in the Slots step first.
            </div>
          )}

          {/* Active Sport Courts List */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Courts hosting {sportLabel} ({activeCourtsWithIndices.length})
            </span>
            {activeCourtsWithIndices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-border p-6 text-center">
                <p className="text-xs text-ink-soft font-semibold">No courts configured for {sportLabel} yet.</p>
                <p className="text-[10px] text-ink-faint mt-1">Players won&apos;t be able to book this sport unless you add a court.</p>
              </div>
            ) : (
              <div>
                {/* Tabbed Court Selectors [Court 1] [Court 2] [Court 3] */}
                <div className="flex items-center gap-2 border-b border-surface-border pb-3 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint shrink-0">Select Court:</span>
                  <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-none pb-1 scroll-smooth">
                    {activeCourtsWithIndices.map(({ court }, i) => (
                      <button
                        key={court.id}
                        type="button"
                        onClick={() => setActiveTab(i)}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${currentTab === i
                            ? "bg-vibe-violet text-white shadow-md scale-105"
                            : "border border-surface-border bg-white text-ink-soft hover:bg-cream-200"
                          }`}
                      >
                        {court.name || `Court ${i + 1}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Render only the selected court */}
                {(() => {
                  const target = activeCourtsWithIndices[currentTab];
                  if (!target) return null;
                  const { court, originalIndex } = target;
                  return (
                    <CourtRow
                      key={court.id}
                      court={court}
                      index={originalIndex}
                      sportLabels={sportLabels}
                      galleryImages={draft.images}
                      audience={audience}
                      slotPrice={slotPrice}
                      onPatch={(changes) => patch(originalIndex, changes)}
                      onRemove={() => {
                        setCourts(courts.filter((_, i) => i !== originalIndex));
                        if (currentTab > 0 && currentTab === activeCourtsWithIndices.length - 1) {
                          setActiveTab(currentTab - 1);
                        }
                      }}
                    />
                  );
                })()}
              </div>
            )}
          </div>

          {/* Add Court Button */}
          <button
            type="button"
            onClick={addCourtForSport}
            className="w-full py-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-vibe-violet/40 bg-vibe-violet/5 hover:bg-vibe-violet/10 text-xs font-bold text-vibe-violet transition"
          >
            <Plus size={14} /> Add Court for {sportLabel}
          </button>

          {/* Other Existing Courts Section */}
          {otherCourtsWithIndices.length > 0 && (
            <div className="mt-4 pt-4 border-t border-surface-border space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint block">
                Enable {sportLabel} for other existing courts
              </span>
              <p className="text-[10px] text-ink-faint">
                You have courts configured for other games. You can enable {sportLabel} on them if they are multi-purpose.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {otherCourtsWithIndices.map(({ court, originalIndex }) => (
                  <div key={court.id} className="flex items-center justify-between rounded-xl border border-surface-border bg-cream-200/20 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">{court.name || `Court ${originalIndex + 1}`}</p>
                      <p className="text-[10px] text-ink-faint truncate">
                        Hosts: {court.sports.length > 0 ? court.sports.join(", ") : "All games"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const currentSports = court.sports;
                        const nextSports = currentSports.includes(sportLabel) ? currentSports : [...currentSports, sportLabel];
                        patch(originalIndex, { sports: nextSports });
                      }}
                      className="shrink-0 rounded-lg border border-surface-border bg-white px-2 py-1 text-[10px] font-bold text-ink hover:border-vibe-violet hover:text-vibe-violet transition"
                    >
                      Enable
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-surface-border pt-4 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-vibe-violet px-6 py-2.5 text-xs font-bold text-white transition hover:bg-vibe-violetSoft cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/** One court's card in the courts builder — name, games, photo, surface and rates. */
function CourtRow({
  court,
  index,
  sportLabels,
  galleryImages,
  audience,
  slotPrice,
  onPatch,
  onRemove,
}: {
  court: Court;
  index: number;
  sportLabels: string[];
  galleryImages: ListingImage[];
  audience: Audience;
  /** Cheapest configured slot rate — what this court charges when it has no price of its own. */
  slotPrice: number;
  onPatch: (changes: Partial<Court>) => void;
  onRemove: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isCourtActive = court.active !== false;

  async function uploadCourtPhoto(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const result = await uploadImage(audience, file);
      onPatch({ image: result.url });
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.describe() : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-surface-border bg-cream-200/30 p-3">
      <div className="flex items-center gap-2">
        <input
          value={court.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          placeholder={`Court ${index + 1}`}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => onPatch({ active: !isCourtActive })}
          title={isCourtActive ? "Court is bookable" : "Court is hidden from booking"}
          className={`shrink-0 rounded-lg border px-2.5 py-2 text-[11px] font-bold transition ${isCourtActive
              ? "border-vibe-violet bg-vibe-violet text-white"
              : "border-surface-border bg-white text-ink-faint"
            }`}
        >
          {isCourtActive ? "Active" : "Off"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-lg border border-surface-border bg-white p-2 text-ink-faint hover:text-red-500"
          aria-label={`Remove ${court.name || `court ${index + 1}`}`}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-ink-faint">Games on this court:</span>
        {sportLabels.length === 0 ? (
          <span className="text-[11px] text-ink-faint">Pick games above first</span>
        ) : (
          sportLabels.map((label) => {
            const on = court.sports.includes(label);
            return (
              <button
                key={label}
                type="button"
                onClick={() =>
                  onPatch({
                    sports: on ? court.sports.filter((s) => s !== label) : [...court.sports, label],
                  })
                }
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${on
                    ? "border-vibe-violet bg-vibe-violet text-white"
                    : "border-surface-border bg-white text-ink-faint"
                  }`}
              >
                {label}
              </button>
            );
          })
        )}
        {court.sports.length === 0 && sportLabels.length > 0 && (
          <span className="text-[11px] text-ink-faint">(hosts every game)</span>
        )}
      </div>

      {/* Court photo — shown on the court card the player picks from at checkout. */}
      <div className="mt-3">
        <span className="text-[11px] font-semibold text-ink-faint">Court photo</span>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void uploadCourtPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {court.image ? (
            <span className="relative h-14 w-20 overflow-hidden rounded-lg border border-vibe-violet">
              <img src={court.image} alt={court.name} className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <button
                type="button"
                onClick={() => onPatch({ image: "" })}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                aria-label="Remove court photo"
              >
                <X size={10} />
              </button>
            </span>
          ) : null}

          {/* Re-using a venue photo is the common case, so those come first. */}
          {galleryImages
            .filter((img) => img.url && img.url !== court.image)
            .slice(0, 6)
            .map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onPatch({ image: img.url })}
                className="h-14 w-20 overflow-hidden rounded-lg border border-surface-border opacity-80 transition hover:opacity-100"
                title={`Use ${img.label}`}
              >
                <img src={img.url} alt={img.label} className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}

          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
            className="flex h-14 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-surface-border bg-white text-[10px] font-bold text-ink-faint hover:border-vibe-violet disabled:opacity-60"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {uploading ? "Uploading" : "Upload"}
          </button>
        </div>
        {uploadError && <p className="mt-1 text-[11px] font-semibold text-vibe-coral">{uploadError}</p>}
      </div>

      <div className="mt-3">
        <span className="text-[11px] font-semibold text-ink-faint">Surface / size</span>
        <input
          value={court.surface ?? ""}
          onChange={(e) => onPatch({ surface: e.target.value })}
          placeholder="e.g. Outdoor · Synthetic · Full court"
          className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-1.5 text-sm text-ink outline-none focus:border-vibe-violet"
        />
      </div>

      {/* Price lives in the Slots step and nowhere else — a court-level rate is what used
          to make the slot card and the court list quote two different numbers. */}
      <p className="mt-2 text-[11px] font-semibold text-vibe-violet">
        {slotPrice
          ? `Players pay the time slot price, ₹${slotPrice.toLocaleString("en-IN")}/hr, on this court.`
          : "Players pay the time slot price on this court — set it in the Slots step."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CUSTOM SPORT MODAL & MANAGEMENT                                    */
/* ------------------------------------------------------------------ */

interface CustomSportModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSport: SportCategory | null;
  audience: Audience;
  existingSportNames: string[];
  onSaved: (sport: VendorCustomSport, isEdit: boolean) => void;
}

function CustomSportModal({
  isOpen,
  onClose,
  editingSport,
  audience,
  existingSportNames,
  onSaved,
}: CustomSportModalProps) {
  const [name, setName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingSport) {
        setName(editingSport.label);
        setIconUrl(editingSport.image || "");
      } else {
        setName("");
        setIconUrl("");
      }
      setError(null);
    }
  }, [isOpen, editingSport]);

  if (!isOpen) return null;

  async function handleFileSelected(file?: File) {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Only image files (JPG, PNG, SVG, WebP) are allowed.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Maximum image size is 2 MB.");
      return;
    }

    setUploading(true);
    try {
      const res = await uploadVendorImage(file, "listings");
      setIconUrl(res.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Sport Name cannot be empty.");
      return;
    }

    if (!iconUrl) {
      setError("Sport Icon or Image is required.");
      return;
    }

    const isDuplicate = existingSportNames.some((existing) => {
      if (editingSport && existing.toLowerCase() === editingSport.label.toLowerCase()) {
        return false;
      }
      return existing.toLowerCase() === trimmed.toLowerCase();
    });

    if (isDuplicate) {
      setError(`A sport named "${trimmed}" already exists.`);
      return;
    }

    setSaving(true);
    try {
      if (editingSport?.customId) {
        const updated = await updateVendorCustomSport(editingSport.customId, {
          sportName: trimmed,
          iconUrl,
        });
        onSaved(updated, true);
      } else {
        const created = await createVendorCustomSport({
          sportName: trimmed,
          iconUrl,
        });
        onSaved(created, false);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Failed to save custom sport.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-surface-border bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-surface-border pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-vibe-violet/10 text-vibe-violet">
              <Plus size={18} />
            </span>
            <h3 className="text-lg font-black text-ink">
              {editingSport ? "Edit Sport" : "Add New Sport"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-ink-faint hover:bg-cream-200 hover:text-ink transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Sport Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Squash, Padel, Golf..."
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Sport Icon / Image * (Max 2 MB)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/svg+xml, image/webp"
              className="hidden"
              onChange={(e) => {
                handleFileSelected(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            {iconUrl ? (
              <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-2xl border border-surface-border bg-cream-200/50 p-2">
                <img src={iconUrl} alt="Sport Preview" className="h-full w-full object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-ink hover:bg-cream-100 cursor-pointer"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setIconUrl("")}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFileSelected(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center transition cursor-pointer ${dragOver
                    ? "border-vibe-violet bg-vibe-violet/10"
                    : "border-surface-border bg-cream-200/40 hover:border-vibe-violet/50 hover:bg-cream-200"
                  }`}
              >
                {uploading ? (
                  <>
                    <Loader2 size={24} className="animate-spin text-vibe-violet" />
                    <span className="text-xs font-bold text-ink-faint">Uploading icon...</span>
                  </>
                ) : (
                  <>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-vibe-violet shadow-sm">
                      <Upload size={18} />
                    </span>
                    <p className="text-xs font-bold text-ink">
                      Click to upload or drag &amp; drop icon
                    </p>
                    <p className="text-[10px] text-ink-faint">
                      PNG, JPG, SVG, WebP (Max 2 MB)
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-surface-border pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-surface-border px-4 py-2.5 text-xs font-bold text-ink-soft hover:bg-cream-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-xl bg-vibe-violet px-5 py-2.5 text-xs font-bold text-white transition hover:bg-vibe-violetSoft disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Sport"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailsStep({ draft, update, audience }: StepProps & { audience: Audience }) {
  const gameVenue: VenueSetting = draft.gameVenue ?? "both";
  const categoryOptions = draft.type === "Game" ? venueOptionsFor(gameVenue) : SPORT_CATEGORIES;

  const [customSports, setCustomSports] = useState<VendorCustomSport[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<SportCategory | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeCourtSport, setActiveCourtSport] = useState<string | null>(null);
  const [openInfos, setOpenInfos] = useState<Record<string, boolean>>({});

  const toggleInfo = (key: string) =>
    setOpenInfos((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (audience === "vendor") {
      getVendorCustomSports()
        .then((res) => setCustomSports(res || []))
        .catch(() => { });
    }
  }, [audience]);

  const customCategories: SportCategory[] = customSports.map((cs) => ({
    id: cs._id,
    label: cs.sportName,
    image: cs.iconUrl,
    venue: cs.venue || "both",
    subCategories: [],
    isCustom: true,
    customId: cs._id,
  }));

  const allCategories = [...categoryOptions, ...customCategories];

  async function handleDeleteCustomSport(cat: SportCategory) {
    if (!cat.customId) return;
    if (!confirm(`Are you sure you want to delete "${cat.label}"?`)) return;
    try {
      await deleteVendorCustomSport(cat.customId);
      setCustomSports((prev) => prev.filter((s) => s._id !== cat.customId));
      if (draft.categories.includes(cat.id)) {
        update("categories", draft.categories.filter((c) => c !== cat.id));
      }
      setToastMessage("Custom sport deleted successfully.");
    } catch (err) {
      setToastMessage("Failed to delete custom sport.");
    }
  }

  function handleSportSaved(sport: VendorCustomSport, isEdit: boolean) {
    if (isEdit) {
      setCustomSports((prev) => prev.map((s) => (s._id === sport._id ? sport : s)));
      setToastMessage("Sport updated successfully.");
    } else {
      setCustomSports((prev) => [sport, ...prev]);
      setToastMessage("New sport added successfully.");
    }
  }

  return (
    <div className="space-y-5">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase leading-none">Basic info</p>
          <button
            type="button"
            onClick={() => toggleInfo("basic")}
            className={`rounded-full p-0.5 transition cursor-pointer ${openInfos["basic"] ? "bg-vibe-violet/20 text-vibe-violet" : "text-ink-faint hover:bg-cream-200 hover:text-ink"
              }`}
            title="Show info"
          >
            <Info size={11} />
          </button>
        </div>
        {openInfos["basic"] && (
          <p className="text-xs text-ink-faint mt-1 bg-cream-200/40 p-2 rounded-lg leading-relaxed animate-in slide-in-from-top-1 duration-150">
            Name this listing, then set its type &amp; category.
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase leading-none">
            Listing name *
          </label>
          <button
            type="button"
            onClick={() => toggleInfo("title")}
            className={`rounded-full p-0.5 transition cursor-pointer ${openInfos["title"] ? "bg-vibe-violet/20 text-vibe-violet" : "text-ink-faint hover:bg-cream-200 hover:text-ink"
              }`}
            title="Show info"
          >
            <Info size={11} />
          </button>
        </div>
        {openInfos["title"] && (
          <p className="mb-2 text-xs text-ink-faint bg-cream-200/40 p-2 rounded-lg leading-relaxed animate-in slide-in-from-top-1 duration-150">
            Pre-filled from your business profile — edit it if this venue has its own name.
          </p>
        )}
        <input
          value={draft.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. BABA Turf & Sports Arena"
          className={inputClass}
        />
      </div>

      {draft.type !== "Event" && (
        <div>
          <FieldLabel>Listing type *</FieldLabel>
          <ToggleGroup
            value={draft.type as "Turf" | "Game"}
            options={[
              { value: "Turf", label: "Turf" },
              { value: "Game", label: "Game" },
            ]}
            onChange={(v) => update("type", v)}
          />
        </div>
      )}

      {draft.type === "Game" && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase leading-none">
              Indoor / Outdoor *
            </label>
            <button
              type="button"
              onClick={() => toggleInfo("venue")}
              className={`rounded-full p-0.5 transition cursor-pointer ${openInfos["venue"] ? "bg-vibe-violet/20 text-vibe-violet" : "text-ink-faint hover:bg-cream-200 hover:text-ink"
                }`}
              title="Show info"
            >
              <Info size={11} />
            </button>
          </div>
          {openInfos["venue"] && (
            <p className="mb-2 text-xs text-ink-faint bg-cream-200/40 p-2 rounded-lg leading-relaxed animate-in slide-in-from-top-1 duration-150">
              Choose Indoor to only show indoor games, Outdoor for outdoor-only, or Both for the full list.
            </p>
          )}
          <ToggleGroup
            value={gameVenue}
            options={[
              { value: "indoor", label: "Indoor" },
              { value: "outdoor", label: "Outdoor" },
              { value: "both", label: "Both" },
            ]}
            onChange={(v) => update("gameVenue", v)}
          />
        </div>
      )}

      <div>
        <FieldLabel>Category * (select all that apply)</FieldLabel>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {allCategories.map((cat) => {
            const isSelected = draft.categories.includes(cat.id);
            return (
              <div key={cat.id} className="group relative aspect-[4/3] overflow-hidden rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setActiveCourtSport(cat.label);
                    } else {
                      const next = [...draft.categories, cat.id];
                      update("categories", next);
                      setActiveCourtSport(cat.label);
                    }
                  }}
                  className={`relative h-full w-full overflow-hidden rounded-2xl border-2 text-left shadow-sm transition cursor-pointer ${isSelected ? "border-vibe-violet ring-2 ring-vibe-violet/30" : "border-surface-border hover:border-vibe-violet/50"
                    }`}
                >
                  <div className="h-full w-full bg-cream-300">
                    <CategoryPhoto cat={cat} />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  {isSelected && <div className="pointer-events-none absolute inset-0 bg-vibe-violet/25" />}
                  <span className="absolute inset-x-0 bottom-0 px-1.5 py-1 text-[10px] sm:text-xs md:text-sm font-black text-white drop-shadow-sm leading-tight text-center sm:text-left">
                    {cat.label}
                  </span>

                  {/* Hover indicator to open modal */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none z-10">
                    <span className="rounded-full bg-black/75 px-2 py-1 text-[8px] sm:text-[10px] font-bold text-white backdrop-blur-sm whitespace-nowrap">
                      {isSelected ? "Configure" : "Select"}
                    </span>
                  </div>
                </button>

                {isSelected && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = draft.categories.filter((c) => c !== cat.id);
                      update("categories", next);
                      const validLabels = new Set(
                        next.map((id) => allCategories.find((c) => c.id === id)?.label ?? id)
                      );
                      const courts = draft.courts ?? [];
                      if (courts.length > 0) {
                        update(
                          "courts",
                          courts
                            .map((court) => ({ ...court, sports: court.sports.filter((s) => validLabels.has(s)) }))
                            .filter((court, i) => court.sports.length > 0 || courts[i]!.sports.length === 0)
                        );
                      }
                    }}
                    className="absolute right-1 top-1 sm:right-1.5 sm:top-1.5 z-20 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-vibe-violet text-white shadow hover:bg-rose-600 transition cursor-pointer"
                    title={`Deselect ${cat.label}`}
                  >
                    <X size={10} className="hidden group-hover:block sm:w-[12px] sm:h-[12px]" />
                    <Check size={10} className="block group-hover:hidden sm:w-[12px] sm:h-[12px]" />
                  </button>
                )}

                {/* Edit & Delete Action Buttons for Custom Sports only */}
                {cat.isCustom && (
                  <div className="absolute left-1 top-1 z-20 flex gap-1">
                    <button
                      type="button"
                      title="Edit Custom Sport"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSport(cat);
                        setModalOpen(true);
                      }}
                      className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md hover:bg-white hover:text-vibe-violet transition cursor-pointer"
                    >
                      <Pencil size={9} className="sm:w-[11px] sm:h-[11px]" />
                    </button>
                    <button
                      type="button"
                      title="Delete Custom Sport"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustomSport(cat);
                      }}
                      className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md hover:bg-white hover:text-rose-600 transition cursor-pointer"
                    >
                      <Trash2 size={9} className="sm:w-[11px] sm:h-[11px]" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* + Add New Sport Card */}
          {audience === "vendor" && (
            <button
              type="button"
              onClick={() => {
                setEditingSport(null);
                setModalOpen(true);
              }}
              className="group relative flex aspect-[4/3] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 border-dashed border-vibe-violet/40 bg-vibe-violet/5 text-center transition hover:border-vibe-violet hover:bg-vibe-violet/10 cursor-pointer"
            >
              <span className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-vibe-violet text-white shadow-md transition group-hover:scale-110">
                <Plus size={14} className="sm:w-[18px] sm:h-[18px]" />
              </span>
              <span className="text-[10px] sm:text-xs font-black text-vibe-violet leading-tight">
                + Add Sport
              </span>
            </button>
          )}
        </div>
      </div>

      {draft.categories.length > 0 && draft.type !== "Event" && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase leading-none">
              Max players per game *
            </label>
            <button
              type="button"
              onClick={() => toggleInfo("capacities")}
              className={`rounded-full p-0.5 transition cursor-pointer ${openInfos["capacities"] ? "bg-vibe-violet/20 text-vibe-violet" : "text-ink-faint hover:bg-cream-200 hover:text-ink"
                }`}
              title="Show info"
            >
              <Info size={11} />
            </button>
          </div>
          {openInfos["capacities"] && (
            <p className="mb-2 text-xs text-ink-faint bg-cream-200/40 p-2 rounded-lg leading-relaxed animate-in slide-in-from-top-1 duration-150">
              How many players are allowed on court at once, for each sport you selected.
            </p>
          )}
          <div className="space-y-2">
            {draft.categories.map((catId) => {
              const label = allCategories.find((c) => c.id === catId)?.label ?? catId;
              const current = (draft.sportCapacities ?? []).find((s) => s.category === catId);
              return (
                <div key={catId} className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-cream-200/30 px-3.5 py-2.5">
                  <span className="text-sm font-semibold text-ink">{label}</span>
                  <input
                    type="number"
                    min={1}
                    value={current?.maxPlayers ?? ""}
                    onChange={(e) => {
                      const maxPlayers = Number(e.target.value) || 0;
                      const list = draft.sportCapacities ?? [];
                      const idx = list.findIndex((s) => s.category === catId);
                      let next;
                      if (maxPlayers <= 0) {
                        next = list.filter((s) => s.category !== catId);
                      } else if (idx > -1) {
                        next = list.map((s, i) => (i === idx ? { ...s, maxPlayers } : s));
                      } else {
                        next = [...list, { category: catId, maxPlayers }];
                      }
                      update("sportCapacities", next);
                    }}
                    placeholder="e.g. 14"
                    className="w-24 rounded-lg border border-surface-border bg-white px-3 py-1.5 text-sm font-bold text-ink outline-none focus:border-vibe-violet"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {draft.type !== "Event" && draft.categories.length > 0 && (
        <div className="mt-4 rounded-xl2 border border-surface-border bg-cream-200/20 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Configure Courts per Game
            </span>
            <button
              type="button"
              onClick={() => toggleInfo("courts")}
              className={`rounded-full p-0.5 transition cursor-pointer ${openInfos["courts"] ? "bg-vibe-violet/20 text-vibe-violet" : "text-ink-faint hover:bg-cream-200 hover:text-ink"
                }`}
              title="Show info"
            >
              <Info size={11} />
            </button>
          </div>
          {openInfos["courts"] && (
            <p className="text-xs text-ink-faint mb-3 bg-cream-200/40 p-2 rounded-lg leading-relaxed animate-in slide-in-from-top-1 duration-150">
              Click &quot;Configure&quot; on any selected game to manage its bookable courts.
            </p>
          )}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {draft.categories.map((catId) => {
              const cat = allCategories.find((c) => c.id === catId);
              if (!cat) return null;
              const hostsSport = (court: Court, label: string) =>
                court.sports.length === 0 || court.sports.includes(label);
              const forSport = (draft.courts ?? []).filter((c) => hostsSport(c, cat.label));
              return (
                <div key={catId} className="flex items-center justify-between rounded-xl border border-surface-border bg-white px-3.5 py-2.5 shadow-sm">
                  <div>
                    <span className="text-sm font-bold text-ink">{cat.label}</span>
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${forSport.length === 0 ? "bg-red-50 text-red-500" : "bg-vibe-violet/10 text-vibe-violet"
                      }`}>
                      {forSport.length} {forSport.length === 1 ? "court" : "courts"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveCourtSport(cat.label)}
                    className="rounded-lg border border-surface-border bg-white px-3 py-1.5 text-xs font-bold text-ink hover:border-vibe-violet hover:text-vibe-violet transition cursor-pointer"
                  >
                    Configure
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CustomSportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingSport={editingSport}
        audience={audience}
        existingSportNames={allCategories.map((c) => c.label)}
        onSaved={handleSportSaved}
      />

      <GameCourtsModal
        isOpen={activeCourtSport !== null}
        onClose={() => setActiveCourtSport(null)}
        sportLabel={activeCourtSport || ""}
        draft={draft}
        update={update}
        audience={audience}
        allCategories={allCategories}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP 4 — LOCATION                                                  */
/* ------------------------------------------------------------------ */

function LocationStep({ draft, update }: StepProps) {
  const [venueInput, setVenueInput] = useState(draft.address || "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [coords, setCoords] = useState<{ lat: string; lon: string } | null>(null);
  const [cityInput, setCityInput] = useState("");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  /** Fill address / city / state from the device's GPS — the Zomato/Instamart "use current location" flow. */
  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocError("Your browser doesn't support location access.");
      return;
    }
    setLocError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: String(latitude), lon: String(longitude) });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { "Accept-Language": "en" }, referrerPolicy: "origin" }
          );
          const data = await res.json();
          if (data?.display_name) {
            update("address", data.display_name);
            setVenueInput(data.display_name);
          }
          const addr = data?.address;
          if (addr) {
            if (addr.state) update("state", addr.state);
            const cityName = addr.city || addr.town || addr.village || addr.suburb || addr.county;
            if (cityName) {
              if (draft.cityMode === "multiple") {
                if (!(draft.cities ?? []).includes(cityName)) update("cities", [...(draft.cities ?? []), cityName]);
              } else {
                update("city", cityName);
              }
            }
          }
        } catch {
          // We still have the pin + coordinates even if the address lookup fails.
          setLocError("Pinned your location, but couldn't fetch the full address — type it in if needed.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Allow location access in your browser to use this."
            : "Couldn't get your location. Please try again."
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  // Nominatim Autocomplete debounced search
  useEffect(() => {
    if (venueInput.length < 3) {
      setSuggestions([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setLoadingSuggestions(true);
      const countryCodes: Record<string, string> = {
        "India": "in",
        "Sri Lanka": "lk",
        "Nepal": "np",
        "UAE": "ae",
      };
      const cc = countryCodes[draft.country ?? "India"] || "in";

      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(venueInput)}&countrycodes=${cc}&limit=5&addressdetails=1`, {
        // Nominatim requires a Referer or identifying User-Agent to accept a request;
        // some browsers/extensions drop Referer on cross-origin fetches by default,
        // causing a silent 403 — force it via referrerPolicy.
        headers: { "Accept-Language": "en" },
        referrerPolicy: "origin",
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setSuggestions(data);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setLoadingSuggestions(false));
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [venueInput]);

  function handleSelectSuggestion(item: any) {
    const address = item.display_name;
    const lat = item.lat;
    const lon = item.lon;

    update("address", address);
    setVenueInput(address);
    setCoords({ lat, lon });
    setSuggestions([]);

    const addr = item.address;
    if (addr) {
      if (addr.state) {
        update("state", addr.state);
      }
      if (addr.city || addr.town || addr.village || addr.suburb) {
        const cityName = addr.city || addr.town || addr.village || addr.suburb;
        if (draft.cityMode === "multiple") {
          update("cities", [cityName]);
        } else {
          update("city", cityName);
        }
      }
    }
  }

  function addCity() {
    const v = cityInput.trim();
    if (!v) return;
    if (draft.cityMode === "multiple") {
      if (!(draft.cities ?? []).includes(v)) update("cities", [...(draft.cities ?? []), v]);
    } else {
      update("city", v);
    }
    setCityInput("");
  }

  const mapEmbedUrl = coords
    ? `https://maps.google.com/maps?q=${coords.lat},${coords.lon}&t=&z=16&ie=UTF8&iwloc=&output=embed`
    : draft.address
      ? `https://maps.google.com/maps?q=${encodeURIComponent(draft.address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`
      : (draft.cityMode === "single" && draft.city)
        ? `https://maps.google.com/maps?q=${encodeURIComponent(draft.city + (draft.state ? ", " + draft.state : "") + ", " + (draft.country ?? "India"))}&t=&z=12&ie=UTF8&iwloc=&output=embed`
        : (draft.cityMode === "multiple" && draft.cities && draft.cities.length > 0)
          ? `https://maps.google.com/maps?q=${encodeURIComponent(draft.cities[0] + (draft.state ? ", " + draft.state : "") + ", " + (draft.country ?? "India"))}&t=&z=12&ie=UTF8&iwloc=&output=embed`
          : null;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">Venue location</p>
        <p className="text-xs text-ink-faint">Search for your venue to auto-fill coordinates, state, and city.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative">
          <FieldLabel>Destination venue *</FieldLabel>
          <div className="relative">
            <input
              value={venueInput}
              onChange={(e) => setVenueInput(e.target.value)}
              placeholder="Search venue (e.g. Urban Square Mall, Udaipur...)"
              className={inputClass}
            />
            {loadingSuggestions && (
              <span className="absolute right-3 top-3 text-[10px] text-ink-faint font-bold animate-pulse">Searching...</span>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 z-20 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition leading-tight"
                >
                  {item.display_name}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-vibe-violet/30 bg-vibe-violet/5 px-3 py-2 text-xs font-bold text-vibe-violet transition hover:bg-vibe-violet/10 disabled:opacity-60"
          >
            {locating ? <Loader2 size={13} className="animate-spin" /> : <LocateFixed size={13} />}
            {locating ? "Getting your location…" : "Use my current location"}
          </button>
          {locError && <p className="mt-1.5 text-[11px] font-semibold text-vibe-coral">{locError}</p>}

          <p className="mt-1.5 text-[11px] text-ink-faint">
            Start typing to view places suggestions, or use your current location. Selecting a suggestion autofills the coordinates, state, and city.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Country *</FieldLabel>
              <select value={draft.country ?? "India"} onChange={(e) => update("country", e.target.value)} className={inputClass}>
                <option>India</option>
                <option>Sri Lanka</option>
                <option>Nepal</option>
                <option>UAE</option>
              </select>
            </div>
            <div>
              <FieldLabel>State *</FieldLabel>
              <input value={draft.state} onChange={(e) => update("state", e.target.value)} className={inputClass} placeholder="e.g. Rajasthan" />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <FieldLabel>Choose city *</FieldLabel>
              <ToggleGroup
                value={draft.cityMode ?? "single"}
                options={[
                  { value: "single", label: "Single city" },
                  { value: "multiple", label: "Multiple cities" },
                ]}
                onChange={(v) => update("cityMode", v)}
              />
            </div>
            <div className="mb-2 flex flex-wrap gap-2">
              {draft.cityMode === "multiple"
                ? (draft.cities ?? []).map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-vibe-violet/10 px-2.5 py-1 text-xs font-medium text-vibe-violet">
                    {c}
                    <button onClick={() => update("cities", (draft.cities ?? []).filter((x) => x !== c))}>
                      <X size={12} />
                    </button>
                  </span>
                ))
                : draft.city && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-vibe-violet/10 px-2.5 py-1 text-xs font-medium text-vibe-violet">
                    {draft.city}
                    <button onClick={() => update("city", "")}>
                      <X size={12} />
                    </button>
                  </span>
                )}
            </div>
            <input
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCity())}
              placeholder="Type city name and press Enter..."
              className={inputClass}
            />
            <p className="mt-1.5 text-[11px] text-ink-faint">
              Press enter to add the city.
            </p>
          </div>
        </div>

        {/* Live Interactive Map Preview */}
        <div className="rounded-xl border border-surface-border bg-cream-200/40 p-4 flex flex-col min-h-[350px]">
          <div className="mb-3">
            <p className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase">Live map preview</p>
            {coords && (
              <p className="text-[10px] text-vibe-violet font-extrabold mt-1">
                📍 Lat: {Number(coords.lat).toFixed(6)} · Lng: {Number(coords.lon).toFixed(6)}
              </p>
            )}
          </div>

          <div className="flex-1 w-full rounded-xl overflow-hidden min-h-[220px] bg-cream-300 relative border border-slate-200">
            {mapEmbedUrl ? (
              <iframe
                key={mapEmbedUrl}
                title="Live Map Preview"
                src={mapEmbedUrl}
                className="absolute inset-0 w-full h-full border-0"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-xs text-ink-faint p-4 text-center">
                <span>No location to display.</span>
                <span className="text-[10px] mt-1">Start typing a venue name or add a city to load the map preview.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP 2 — SLOTS / BOOKING                                           */
/* ------------------------------------------------------------------ */

const BOOKING_TYPES: { value: BookingType; label: string; hint: string }[] = [
  { value: "Recurring", label: "Recurring", hint: "Customer picks any date" },
  { value: "Trips", label: "Trips", hint: "Date range booking" },
  { value: "Courses", label: "Courses", hint: "Fixed start and end dates" },
];

const TIME_OPTIONS = [
  { value: "00:00", label: "12:00 AM" },
  { value: "01:00", label: "01:00 AM" },
  { value: "02:00", label: "02:00 AM" },
  { value: "03:00", label: "03:00 AM" },
  { value: "04:00", label: "04:00 AM" },
  { value: "05:00", label: "05:00 AM" },
  { value: "06:00", label: "06:00 AM" },
  { value: "07:00", label: "07:00 AM" },
  { value: "08:00", label: "08:00 AM" },
  { value: "09:00", label: "09:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "01:00 PM" },
  { value: "14:00", label: "02:00 PM" },
  { value: "15:00", label: "03:00 PM" },
  { value: "16:00", label: "04:00 PM" },
  { value: "17:00", label: "05:00 PM" },
  { value: "18:00", label: "06:00 PM" },
  { value: "19:00", label: "07:00 PM" },
  { value: "20:00", label: "08:00 PM" },
  { value: "21:00", label: "09:00 PM" },
  { value: "22:00", label: "10:00 PM" },
  { value: "23:00", label: "11:00 PM" },
];

/** "Closes At" choices: same hours minus 00:00 (a venue can't close when the day starts), plus 24:00 so the last slot can run until midnight. */
const END_TIME_OPTIONS = [...TIME_OPTIONS.slice(1), { value: "24:00", label: "12:00 AM" }];

/* ─── Slot generation — the single source of truth for turning a duration + a time
   range into concrete slots. Both the bulk "Generate Slots" button and the clock
   dial's per-hour toggle call through this, so the slot list and the dial can never
   disagree about what a given duration/range produces. ── */
function t24m(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function m2t(m: number) {
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function dayPart(mins: number) {
  const h = Math.floor(mins / 60) % 24;
  if (h >= 5 && h < 12) return "Morning";
  if (h >= 12 && h < 17) return "Afternoon";
  if (h >= 17 && h < 21) return "Evening";
  return "Night";
}

// Every venue's day has a fixed 3:00–5:00 AM closed window for cleaning/maintenance —
// no slot may ever be created inside it, no matter where it starts or how long it runs.
// Matches CLOSED_HOURS in ClockSlotsWidget.tsx — keep both in sync.
const CLOSED_WINDOW_START = -1;
const CLOSED_WINDOW_END = -1;
function overlapsClosedWindow(startMin: number, endMin: number) {
  return false;
}

/** Any closing time is valid because it can wrap to the next day. */
function isValidTimeRange(startTime: string, endTime: string) {
  return true;
}

/** Splits [startMin, endMin) into fixed-length slots, skipping the closed window. The
 * only place slot boundaries get computed — Generate Slots and the clock dial both
 * route through this so a given duration always yields identical slots either way. */
function generateSlotsInRange(startMin: number, endMin: number, durationMinutes: number): TurfSlot[] {
  const slots: TurfSlot[] = [];
  let cur = startMin;
  while (cur + durationMinutes <= endMin) {
    if (!overlapsClosedWindow(cur, cur + durationMinutes)) {
      slots.push({ startTime: m2t(cur), endTime: m2t(cur + durationMinutes), label: dayPart(cur), price: 0 });
    }
    cur += durationMinutes;
  }
  return slots;
}

function BookingStep({ draft, update }: StepProps) {
  const [slotPrice, setSlotPrice] = useState(1000);
  const [bulkDuration, setBulkDuration] = useState("60");
  // Every venue's day starts at 5:00 AM by convention (3:00–5:00 AM is a fixed
  // closed window for cleaning/maintenance) — the generator defaults to that.
  const [bulkStartTime, setBulkStartTime] = useState("05:00");
  const [bulkEndTime, setBulkEndTime] = useState("22:00");

  // Any closing time is valid because it will wrap to the next day if earlier than start time.

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [cardSize, setCardSize] = useState<"S" | "M" | "L">("M");

  const isDailyRoutine = draft.dailyRoutine ?? true;
  const [selectedDate, setSelectedDate] = useState("");
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState("");

  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
    const days = [];

    // empty slots for padding
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // actual days of the month
    for (let i = 1; i <= lastDay; i++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const festival = INDIAN_HOLIDAYS[dateStr] || null;
      const isSunday = (firstDayIndex + i - 1) % 7 === 0;
      days.push({ dayNumber: i, dateStr, festival, isSunday });
    }
    return days;
  }, [calYear, calMonth]);

  // Tooltip helper detailing configured/available slots
  function getTooltipText(dateStr: string) {
    const dayOverride = (draft.dateOverrides ?? []).find((o) => o.date === dateStr);
    const isHolidayCell = dayOverride?.isHoliday;
    const slots = dayOverride ? (dayOverride.slots ?? []) : (draft.slotsList ?? []);
    const typeLabel = dayOverride
      ? isHolidayCell ? "Closed / Holiday" : "Custom Override Slots"
      : "Default Slots (Daily Routine)";

    let text = `${dateStr}\n---------------------\nType: ${typeLabel}\nTotal Slots: ${slots.length}\n`;
    if (isHolidayCell) {
      text += `Reason: ${dayOverride?.holidayName || "Holiday"}\n`;
    } else if (slots.length > 0) {
      text += `\nSlots List:\n${slots.map(s => `• ${to12h(s.startTime)} - ${to12h(s.endTime)}`).join("\n")}`;
    } else {
      text += "\nNo slots configured.";
    }
    return text;
  }

  const festivalToday = INDIAN_HOLIDAYS[selectedDate] || "";

  /* derive the active slot list (daily or date-specific override fallback to daily) */
  const dailySlots: TurfSlot[] = draft.slotsList ?? [];
  const override = (draft.dateOverrides ?? []).find((o) => o.date === selectedDate);
  const activeSlots: TurfSlot[] = isDailyRoutine
    ? dailySlots
    : selectedDate
      ? override
        ? override.slots ?? []
        : dailySlots // starts with copy of default slots for easier customization
      : [];

  /* helpers */
  function fmtDur(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}hr${h > 1 ? "s" : ""}`;
    return `${h}h ${m}m`;
  }

  /* persist slots into draft — always chronologically sorted, so the slot list, the
     clock dial and the "Opens/Closes" summary can never show three different orderings
     of the same underlying data. */
  function save(nextSlots: TurfSlot[]) {
    const sorted = [...nextSlots].sort((a, b) => t24m(a.startTime) - t24m(b.startTime));
    if (isDailyRoutine && !selectedDate) {
      update("slotsList", sorted);
      update("slotsPerDay", sorted.length);
    } else {
      if (!selectedDate) return;
      const existing = draft.dateOverrides ?? [];
      const idx = existing.findIndex((o) => o.date === selectedDate);
      const entry = { date: selectedDate, isHoliday, holidayName, slots: sorted };
      if (idx > -1) {
        const next = [...existing]; next[idx] = { ...next[idx], slots: sorted };
        update("dateOverrides", next);
      } else {
        update("dateOverrides", [...existing, entry]);
      }
      // `slotsPerDay` is a required summary stat on the backend. When the vendor only ever
      // configures date-specific slots (never touches the Global Default), it would otherwise
      // stay stuck at 0 and fail listing creation — so keep it in sync with whatever slots exist.
      if (dailySlots.length === 0 && sorted.length > 0) {
        update("slotsPerDay", sorted.length);
      }
    }
  }

  const rangeValid = true;

  function getBulkEndMins() {
    let startMin = t24m(bulkStartTime);
    let endMin = t24m(bulkEndTime);
    if (endMin <= startMin) endMin += 1440; // wrap to next day
    return endMin;
  }

  function generateBulkSlots() {
    if (!isDailyRoutine && !selectedDate) { alert("Please select a date first."); return; }
    const dur = parseInt(bulkDuration);
    const generated = generateSlotsInRange(t24m(bulkStartTime), getBulkEndMins(), dur);
    // Preserve overrides (slots with sport or courtId) and merge properties of matching base slots
    const overrides = activeSlots.filter((s) => (s.sport && s.sport.trim() !== "") || (s.courtId && s.courtId.trim() !== ""));
    const baseSlots = activeSlots.filter((s) => !((s.sport && s.sport.trim() !== "") || (s.courtId && s.courtId.trim() !== "")));

    const mergedBase = generated.map((gen) => {
      const match = baseSlots.find((existing) => existing.startTime === gen.startTime);
      return match ? { ...gen, ...match } : gen;
    });
    save([...mergedBase, ...overrides]);
  }

  /* Auto-generate slots when generator parameters change to keep UI strictly synchronized.
   * bulkStartTime/bulkEndTime/bulkDuration are local state seeded with fixed defaults
   * (05:00–22:00, 60 min) that essentially never match an existing listing's real
   * schedule. Since this effect also fires on mount, editing an existing package used to
   * silently regenerate — and overwrite — its actual slot list (and any custom
   * sport/court pricing that no longer lined up with the regenerated boundaries) the
   * instant the vendor landed on this step, before they had touched anything. On the
   * very first run, only proceed if there's nothing configured yet (a brand-new
   * listing) — that keeps the "auto-fill sensible defaults" convenience for a fresh
   * package while protecting an existing one. Every run after that only happens because
   * the vendor deliberately changed one of these three controls. */
  const didInitialSync = useRef(false);
  useEffect(() => {
    const isInitialMount = !didInitialSync.current;
    didInitialSync.current = true;
    if (isInitialMount && activeSlots.length > 0) return;
    if (!rangeValid) return;
    const dur = parseInt(bulkDuration);
    const generated = generateSlotsInRange(t24m(bulkStartTime), getBulkEndMins(), dur);

    // Separate overrides and base slots from activeSlots
    const overrides = activeSlots.filter((s) => (s.sport && s.sport.trim() !== "") || (s.courtId && s.courtId.trim() !== ""));
    const baseSlots = activeSlots.filter((s) => !((s.sport && s.sport.trim() !== "") || (s.courtId && s.courtId.trim() !== "")));

    // Merge existing base slots properties if any match
    const mergedBase = generated.map((gen) => {
      const match = baseSlots.find((existing) => existing.startTime === gen.startTime);
      return match ? { ...gen, ...match } : gen;
    });

    const merged = [...mergedBase, ...overrides];

    // Only update if generated slot layout (base slots) has changed to avoid loop
    const isDifferent =
      mergedBase.length !== baseSlots.length ||
      mergedBase.some((s, idx) => s.startTime !== baseSlots[idx]?.startTime || s.endTime !== baseSlots[idx]?.endTime);

    if (isDifferent) {
      save(merged);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkDuration, bulkStartTime, bulkEndTime]);

  const [selectedSlotIndices, setSelectedSlotIndices] = useState<number[]>([]);

  function isConsecutive(indices: number[], slots: TurfSlot[]): boolean {
    if (indices.length < 2) return false;
    const sorted = [...indices].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = slots[sorted[i]];
      const next = slots[sorted[i + 1]];
      if (!curr || !next) return false;
      if (t24m(curr.endTime) !== t24m(next.startTime)) return false;
    }
    return true;
  }

  function handleClubSelectedSlots() {
    if (selectedSlotIndices.length < 2) return;
    const sortedIndices = [...selectedSlotIndices].sort((a, b) => a - b);
    if (!isConsecutive(sortedIndices, activeSlots)) {
      alert("⚠️ Only consecutive time slots can be clubbed together.");
      return;
    }
    const selectedSlots = sortedIndices.map((idx) => activeSlots[idx]);
    const earliest = selectedSlots[0];
    const latest = selectedSlots[selectedSlots.length - 1];
    const totalPrice = selectedSlots.reduce((sum, s) => sum + s.price, 0);
    const totalDur = t24m(latest.endTime) - t24m(earliest.startTime);
    const clubId = "club_" + Math.random().toString(36).substring(2, 9);

    const clubSlot: TurfSlot = {
      id: clubId,
      startTime: earliest.startTime,
      endTime: latest.endTime,
      label: earliest.label,
      price: totalPrice,
      isClubSlot: true,
      clubId,
      slotIds: selectedSlots.map((s) => `${s.startTime}-${s.endTime}`),
      durationMinutes: totalDur,
    };

    const newSlots = activeSlots.filter((_, idx) => !sortedIndices.includes(idx));
    newSlots.push(clubSlot);
    newSlots.sort((a, b) => t24m(a.startTime) - t24m(b.startTime));

    save(newSlots);
    setSelectedSlotIndices([]);
    trackEvent("club_slot_created", { startTime: earliest.startTime, endTime: latest.endTime, durationMinutes: totalDur }, "vendor");
  }

  function handleSplitClubSlot(clubIndex: number) {
    const slot = activeSlots[clubIndex];
    if (!slot || !slot.isClubSlot) return;

    const startMins = t24m(slot.startTime);
    const endMins = t24m(slot.endTime);
    const totalHours = Math.max(1, (endMins - startMins) / 60);
    const hourlyRate = Math.round(slot.price / totalHours);
    const splitSlots: TurfSlot[] = [];

    let curr = startMins;
    while (curr + 60 <= endMins) {
      const s24 = m2t(curr % 1440);
      const e24 = m2t((curr + 60) % 1440);
      const startHour = Math.floor(curr / 60) % 24;
      let label = "Morning";
      if (startHour >= 12 && startHour < 17) label = "Afternoon";
      else if (startHour >= 17 && startHour < 22) label = "Evening";
      else if (startHour >= 22 || startHour < 5) label = "Night";

      splitSlots.push({
        startTime: s24,
        endTime: e24,
        label,
        price: hourlyRate,
        blocked: slot.blocked,
      });
      curr += 60;
    }

    const newSlots = activeSlots.filter((_, idx) => idx !== clubIndex);
    newSlots.push(...splitSlots);
    newSlots.sort((a, b) => t24m(a.startTime) - t24m(b.startTime));

    save(newSlots);
    trackEvent("club_slot_deleted", { clubId: slot.clubId }, "vendor");
  }

  function deleteSlot(i: number) { save(activeSlots.filter((_, idx) => idx !== i)); }
  function updateSlotPrice(i: number, price: number) { save(activeSlots.map((s, idx) => idx === i ? { ...s, price } : s)); }

  function deleteDayPartGroup(partName: string) {
    save(activeSlots.filter((s) => s.label !== partName));
  }

  function setDayPartGroupPrice(partName: string) {
    const input = prompt(`Enter price (₹) for all ${partName} slots:`);
    if (!input) return;
    const price = Number(input.replace(/\D/g, "")) || 0;
    save(activeSlots.map((s) => (s.label === partName ? { ...s, price } : s)));
  }

  /* Clock dial click — toggle every slot in the 1-hour block [hour * 60, (hour + 1) * 60) */
  const handleSelectHour = (hour: number) => {
    if (!isDailyRoutine && !selectedDate) { alert("Please select a date first."); return; }
    const dur = parseInt(bulkDuration);
    const blockStart = hour * 60;
    const blockEnd = blockStart + 60;

    if (overlapsClosedWindow(blockStart, blockEnd)) return; // 3–5 AM is fixed maintenance window

    const overlapping = activeSlots.filter((s) => {
      const sStart = t24m(s.startTime);
      const sEnd = t24m(s.endTime);
      return sStart < blockEnd && sEnd > blockStart;
    });

    if (overlapping.length > 0) {
      // Remove all slots overlapping this 1-hour block
      save(activeSlots.filter((s) => !overlapping.includes(s)));
    } else {
      // Generate slots for this hour using current duration
      const newSubSlots = generateSlotsInRange(blockStart, blockEnd, dur);
      save([...activeSlots, ...newSubSlots]);
    }
  };

  /* save holiday flag for a date */
  function saveHoliday() {
    if (!selectedDate) return;
    const existing = draft.dateOverrides ?? [];
    const idx = existing.findIndex((o) => o.date === selectedDate);
    if (idx > -1) {
      const next = [...existing]; next[idx] = { ...next[idx], isHoliday, holidayName };
      update("dateOverrides", next);
    } else {
      update("dateOverrides", [...existing, { date: selectedDate, isHoliday, holidayName, slots: [] }]);
    }
  }

  const selectedOverrideDate = selectedDate;

  if (draft.type === "Event") {
    return (
      <div>
        <div className="mb-5">
          <p className="mb-1 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">Booking setup</p>
          <p className="text-xs text-ink-faint">How customers will book this package</p>
        </div>
        <div className="mb-5 grid gap-5 sm:grid-cols-2">
          <div><FieldLabel>Starting Point</FieldLabel><input value={draft.startingPoint ?? ""} onChange={(e) => update("startingPoint", e.target.value)} className={inputClass} /></div>
          <div><FieldLabel>Ending Point</FieldLabel><input value={draft.endingPoint ?? ""} onChange={(e) => update("endingPoint", e.target.value)} className={inputClass} /></div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     TURF — Step 3: Slot Configuration  (professional rebuild)
  ════════════════════════════════════════════════════════════════ */
  // Memoized so the clock dial only gets a new array (and re-runs its own internal
  // segment/stat memos) when the underlying slots actually change — not on every
  // unrelated re-render of this step (calendar nav, hover state, etc.).
  const clockSlots = useMemo(
    () => activeSlots.map((s) => ({ ...s, status: "Available" as const })),
    [activeSlots]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">

      {/* ── LEFT PANEL ─────────────────────────────────────── */}
      <div className="flex flex-col gap-5">
        {/* ── MONTHLY CALENDAR SELECTOR ── */}
        <div className="rounded-2xl border-2 border-surface-border bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Select Calendar Date</p>
              <p className="text-[10px] text-ink-faint">Click a date to edit its timings. Hover for summary.</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Reset to global default button */}
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate("");
                    update("dailyRoutine", true);
                  }}
                  className="text-[10px] font-bold text-slate-500 hover:text-vibe-violet bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
                >
                  ⚙️ Edit Global Default
                </button>
              )}
              <div className="flex items-center gap-2">
                <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-extrabold text-slate-700 min-w-[100px] text-center uppercase tracking-wide">
                  {new Date(calYear, calMonth).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
                <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Weekdays row */}
          <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
          </div>

          {/* Calendar grid cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={idx} className="bg-slate-50/20 rounded-lg min-h-[60px]" />;

              const isSel = selectedDate === day.dateStr;
              const hasOvr = (draft.dateOverrides ?? []).some((o) => o.date === day.dateStr);
              const dayOverride = (draft.dateOverrides ?? []).find((o) => o.date === day.dateStr);
              const isHolidayCell = dayOverride?.isHoliday;

              return (
                <button
                  key={idx}
                  type="button"
                  title={getTooltipText(day.dateStr)}
                  onClick={() => {
                    setSelectedDate(day.dateStr);
                    setIsHoliday(dayOverride?.isHoliday ?? false);
                    setHolidayName(dayOverride?.holidayName ?? day.festival ?? "");
                    update("dailyRoutine", false);
                  }}
                  className={`flex flex-col justify-between items-start rounded-xl p-2 min-h-[75px] border text-left transition ${isSel
                      ? "border-slate-900 bg-slate-900 text-white shadow-md font-extrabold"
                      : isHolidayCell
                        ? "border-rose-300 bg-rose-50 hover:bg-rose-100"
                        : hasOvr
                          ? "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300"
                          : day.festival
                            ? "border-rose-100 bg-rose-50/30 hover:border-rose-200 text-rose-900"
                            : day.isSunday
                              ? "border-amber-200 bg-amber-50/40 hover:border-amber-300 text-amber-900"
                              : "border-slate-100 bg-white hover:border-slate-300"
                    }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-extrabold ${isSel ? "text-white" : "text-slate-800"}`}>
                      {day.dayNumber}
                    </span>
                    {hasOvr && !isSel && (
                      <span className={`w-2 h-2 rounded-full ${isHolidayCell ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`} />
                    )}
                  </div>

                  {/* Small text indicator & Festival name */}
                  <div className="w-full mt-2 flex flex-col gap-0.5">
                    {day.festival && !isSel && (
                      <span className="text-[7px] truncate font-bold text-rose-500 bg-rose-100/50 px-1 py-0.5 rounded uppercase leading-none">
                        {day.festival}
                      </span>
                    )}
                    {!day.festival && day.isSunday && !isSel && (
                      <span className="text-[7px] truncate font-bold text-amber-600 bg-amber-100/60 px-1 py-0.5 rounded uppercase leading-none">
                        Sunday
                      </span>
                    )}
                    <span className="text-[8px] truncate uppercase font-semibold leading-tight tracking-tight">
                      {isHolidayCell
                        ? "🚫 Closed"
                        : hasOvr
                          ? `✨ Custom`
                          : "⚙️ Default"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected override holiday / reset controls */}
          {selectedDate && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isHoliday}
                    onChange={(e) => {
                      setIsHoliday(e.target.checked);
                      if (!e.target.checked) setHolidayName("");
                    }}
                    className="w-4 h-4 rounded border-slate-300 accent-vibe-violet focus:ring-0"
                  />
                  <span className="text-xs font-bold text-slate-700">Mark {selectedDate} as Holiday/Closed</span>
                </label>
                {isHoliday && (
                  <input
                    type="text"
                    placeholder="e.g. Diwali, Maintenance..."
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    className={`${inputClass} text-xs py-1.5 w-48`}
                  />
                )}
                {isHoliday && (
                  <button type="button" onClick={saveHoliday} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-bold uppercase transition">Save Holiday</button>
                )}
              </div>

              {override && (
                <button
                  type="button"
                  onClick={() => {
                    update("dateOverrides", (draft.dateOverrides ?? []).filter((o) => o.date !== selectedDate));
                    setIsHoliday(false);
                    setHolidayName("");
                  }}
                  className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-2 rounded-lg font-bold uppercase transition"
                >
                  🗑️ Reset to Default Slots
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── SLOT GENERATOR ── */}
        {(!selectedDate || (selectedDate && !isHoliday)) && (
          <div className="rounded-2xl border-2 border-surface-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {!selectedDate ? "⚙️ Configuration: Global Default Slots" : `📅 Editing: Slots for ${selectedDate}`}
                </p>
              </div>

              {selectedDate && (
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        update("slotsList", activeSlots);
                        update("slotsPerDay", activeSlots.length);
                        update("dailyRoutine", true);
                        setSelectedDate("");
                        alert("🎉 Current slots have been saved as the Global Default layout!");
                      }
                    }}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-0 accent-emerald-500"
                  />
                  <span className="text-xs font-extrabold text-slate-700">Set as Global Default</span>
                </label>
              )}
            </div>

            <p className="text-[11px] font-bold text-ink uppercase tracking-wide mb-3 border-t border-slate-100 pt-3">
              Slot Generator
            </p>

            {/* Duration slider */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wide">Slot Duration</p>
                <span className="text-sm font-extrabold text-vibe-violet bg-vibe-violet/10 px-2 py-0.5 rounded-lg">{fmtDur(parseInt(bulkDuration))}</span>
              </div>
              <input type="range" min="15" max="180" step="15" value={bulkDuration} onChange={(e) => setBulkDuration(e.target.value)} className="w-full h-2 accent-vibe-violet cursor-pointer" />
            </div>

            {/* Opens At Hour Cards */}
            <div className="mb-4">
              <FieldLabel>Opens At *</FieldLabel>
              <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto border border-slate-100 rounded-lg p-2 bg-slate-50/50">
                {TIME_OPTIONS.map((t) => {
                  const isSelected = bulkStartTime === t.value;
                  return (
                    <button key={t.value} type="button" onClick={() => setBulkStartTime(t.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${isSelected ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Closes At Hour Cards */}
            <div className="mb-2">
              <FieldLabel>Closes At *</FieldLabel>
              <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto border border-slate-100 rounded-lg p-2 bg-slate-50/50">
                {END_TIME_OPTIONS.map((t) => {
                  const isSelected = bulkEndTime === t.value;
                  return (
                    <button key={t.value} type="button" onClick={() => setBulkEndTime(t.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${isSelected
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                        }`}>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={generateBulkSlots}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-vibe-violet px-6 py-2.5 text-xs font-bold text-white hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40">
                <Plus size={13} /> Generate Slots
              </button>
            </div>
            <p className="text-[10px] text-ink-faint mt-3">💡 You can also click any hour on the clock dial to the right to toggle that slot individually — it always uses the duration set above.</p>
          </div>
        )}

        {/* ── SLOT LIST TABLE & DYNAMIC GRID ─────────────────── */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[11px] font-bold text-ink uppercase tracking-wider">
                {!selectedDate ? `Global Default Slots (${activeSlots.length})` : `Slots for ${selectedDate} (${activeSlots.length})`}
              </p>
              {selectedDate && (draft.dateOverrides ?? []).some((o) => o.date === selectedDate) && (
                <button type="button" onClick={() => { update("dateOverrides", (draft.dateOverrides ?? []).filter((o) => o.date !== selectedDate)); setSelectedDate(""); }}
                  className="text-[10px] text-vibe-coral font-bold uppercase hover:underline">Clear Override</button>
              )}
            </div>

            {activeSlots.length > 0 && (
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <button type="button" onClick={() => setViewMode("grid")} className={`flex items-center justify-center p-1.5 transition ${viewMode === "grid" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"}`}>
                    <LayoutGrid size={13} />
                  </button>
                  <button type="button" onClick={() => setViewMode("list")} className={`flex items-center justify-center p-1.5 transition ${viewMode === "list" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"}`}>
                    <List size={13} />
                  </button>
                </div>

                {/* Size Toggle (only in Grid mode) */}
                {viewMode === "grid" && (
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                    {(["S", "M", "L"] as const).map((sz) => (
                      <button key={sz} type="button" onClick={() => setCardSize(sz)} className={`px-2 py-1 text-[10px] font-bold transition ${cardSize === sz ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700 bg-white"}`}>
                        {sz}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CLUB TOGETHER TOOLBAR */}
          {selectedSlotIndices.length > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-xl bg-purple-50 p-2.5 ring-1 ring-purple-200">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                <span>⭐ {selectedSlotIndices.length} slots selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClubSelectedSlots}
                  className="rounded-lg bg-vibe-violet px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-vibe-violet/90 transition"
                >
                  ⭐ Club Together
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSlotIndices([])}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {activeSlots.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center bg-white">
              <Clock3 size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-ink-faint font-medium">
                {!selectedDate
                  ? "No global default slots configured yet."
                  : "No slots configured yet — use the generator or clock dial."}
              </p>
            </div>
          ) : viewMode === "list" ? (
            <div className="rounded-xl border border-surface-border bg-white shadow-sm overflow-hidden max-h-[320px] overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="border-b border-surface-border text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-3 py-2.5 w-6">Select</th>
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Time Range</th>
                    <th className="px-3 py-2.5">Dur.</th>
                    <th className="px-3 py-2.5">Label / Type</th>
                    <th className="px-3 py-2.5 w-16 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSlots.map((slot, i) => {
                    const durMins = slot.durationMinutes || (t24m(slot.endTime) - t24m(slot.startTime));
                    const isChecked = selectedSlotIndices.includes(i);
                    return (
                      <tr key={i} className={`border-b border-surface-border last:border-0 hover:bg-cream-200/30 group ${slot.isClubSlot ? "bg-purple-50/40" : ""}`}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedSlotIndices((prev) => [...prev, i]);
                              else setSelectedSlotIndices((prev) => prev.filter((idx) => idx !== i));
                            }}
                            className="w-3.5 h-3.5 rounded border-slate-300 accent-vibe-violet"
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-400 font-semibold">{i + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-800">
                          {to12h(slot.startTime)} – {to12h(slot.endTime)}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{fmtDur(durMins)}</td>
                        <td className="px-3 py-2">
                          {slot.isClubSlot ? (
                            <span className="rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-[9px] font-extrabold uppercase border border-purple-300">
                              ⭐ Club Slot (₹{slot.price})
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[9px] font-bold uppercase">
                              {slot.label} {slot.price > 0 ? `· ₹${slot.price}` : ""}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {slot.isClubSlot ? (
                            <button type="button" onClick={() => handleSplitClubSlot(i)} className="text-[9px] font-bold text-purple-700 hover:underline mr-2">
                              Split
                            </button>
                          ) : null}
                          <button type="button" onClick={() => deleteSlot(i)} className="opacity-0 group-hover:opacity-100 p-1 text-ink-faint hover:text-vibe-coral transition">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* GRID VIEW CATEGORIZED BY DAY PARTS */
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {(["Morning", "Afternoon", "Evening", "Night", "Mid Night"] as const).map((part) => {
                const partSlots = activeSlots
                  .map((s, idx) => ({ ...s, originalIndex: idx }))
                  .filter((s) => s.label === part);

                if (partSlots.length === 0) return null;

                const sizeH = cardSize === "S" ? "h-20" : cardSize === "M" ? "h-24" : "h-28";
                const gridCols = cardSize === "S" ? "grid-cols-4 sm:grid-cols-5" : cardSize === "M" ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3";

                return (
                  <div key={part} className="border-b border-slate-100 pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{part}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-600">
                          {partSlots.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDayPartGroupPrice(part)}
                          className="text-[9px] font-bold text-vibe-violet hover:underline"
                        >
                          Set Price
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteDayPartGroup(part)}
                          className="text-[9px] font-bold text-rose-500 hover:underline"
                        >
                          Clear Group
                        </button>
                      </div>
                    </div>

                    <div className={`grid ${gridCols} gap-2`}>
                      {partSlots.map((slot) => {
                        const isChecked = selectedSlotIndices.includes(slot.originalIndex);
                        if (slot.isClubSlot) {
                          return (
                            <div key={slot.originalIndex} className={`flex flex-col items-center justify-center p-2 rounded-xl border border-purple-300 bg-purple-50/50 relative hover:shadow transition-shadow group ${sizeH}`}>
                              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-purple-700 mb-1">⭐ Club Slot</span>
                              <span className="text-xs font-bold text-purple-950 font-mono">{to12h(slot.startTime)} – {to12h(slot.endTime)}</span>
                              <span className="text-[9px] font-semibold text-purple-700 mt-0.5">{fmtDur(slot.durationMinutes || 120)} · ₹{slot.price}</span>
                              <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition">
                                <button type="button" onClick={() => handleSplitClubSlot(slot.originalIndex)} className="text-[9px] font-bold text-purple-700 hover:underline">Split Club</button>
                                <button type="button" onClick={() => deleteSlot(slot.originalIndex)} className="p-0.5 text-slate-400 hover:text-rose-600"><Trash2 size={11} /></button>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={slot.originalIndex} className={`flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-white relative hover:shadow transition-shadow group ${sizeH} ${isChecked ? "ring-2 ring-vibe-violet border-vibe-violet" : ""}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedSlotIndices((prev) => [...prev, slot.originalIndex]);
                                else setSelectedSlotIndices((prev) => prev.filter((idx) => idx !== slot.originalIndex));
                              }}
                              className="absolute top-1.5 left-1.5 w-3.5 h-3.5 rounded border-slate-300 accent-vibe-violet"
                            />
                            <span className="text-xs font-bold text-slate-700 font-mono mt-2">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <span className="text-[9px] text-slate-400 uppercase mt-1">
                              {slot.label} {slot.price > 0 ? `· ₹${slot.price}` : ""}
                            </span>

                            <button type="button" onClick={() => deleteSlot(slot.originalIndex)}
                              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-vibe-coral transition">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: CLOCK ─────────────────────────────── */}
      <div className="flex flex-col items-center gap-4 lg:border-l lg:border-surface-border lg:pl-6">
        <div className="w-full">
          <p className="text-[11px] font-bold text-ink uppercase tracking-wider mb-0.5 text-center">24-Hour Dial</p>
          <p className="text-[10px] text-ink-faint text-center mb-3">Click an hour to toggle · Duration controls slot length</p>
          <ClockSlotsWidget slots={clockSlots} onSelectHour={handleSelectHour} />
        </div>

        {activeSlots.length > 0 && (
          <div className="w-full rounded-2xl bg-slate-900 p-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Summary</p>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] text-slate-400">Total Slots</p><p className="text-2xl font-extrabold">{activeSlots.length}</p></div>
              <div><p className="text-[10px] text-slate-400">Avg Price</p><p className="text-2xl font-extrabold">₹{Math.round(activeSlots.reduce((a, s) => a + s.price, 0) / activeSlots.length).toLocaleString()}</p></div>
              <div><p className="text-[10px] text-slate-400">Opens</p><p className="text-sm font-bold">{to12h(activeSlots[0]?.startTime)}</p></div>
              <div><p className="text-[10px] text-slate-400">Closes</p><p className="text-sm font-bold">{to12h(activeSlots[activeSlots.length - 1]?.endTime)}</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP 5 — PRICING                                                   */
/* ------------------------------------------------------------------ */

const DAY_PART_QUERIES: Record<string, string> = {
  Morning: "sunrise sports court",
  Afternoon: "bright sunny sports field",
  Evening: "sunset sports field",
  Night: "stadium lights night",
  "Mid Night": "night sky stars",
};

const DAY_PART_ICONS: Record<string, typeof Sun> = {
  Morning: Sunrise,
  Afternoon: Sun,
  Evening: Sunset,
  Night: Moon,
  "Mid Night": Moon,
};

function DayPartGroup({ part, children, onSelectAll, onDeselectAll }: { part: string; children: React.ReactNode; onSelectAll?: () => void; onDeselectAll?: () => void }) {
  const { url } = usePexelsImage(DAY_PART_QUERIES[part] ?? part);
  const Icon = DAY_PART_ICONS[part] ?? Sun;
  return (
    <div
      className="rounded-xl p-3"
      style={
        url
          ? {
            backgroundImage: `linear-gradient(rgba(15,23,42,.6),rgba(15,23,42,.6)), url(${url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }
          : undefined
      }
    >
      <div className="mb-2 flex items-center justify-between">
        <p className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest ${url ? "text-white" : "text-slate-400"}`}>
          <Icon size={11} /> {part}
        </p>
        {(onSelectAll || onDeselectAll) && (
          <div className="flex items-center gap-2">
            {onSelectAll && (
              <button type="button" onClick={onSelectAll} className="rounded-lg bg-white/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm transition hover:bg-white/30 hover:text-white shadow-sm">
                Select All
              </button>
            )}
            {onDeselectAll && (
              <button type="button" onClick={onDeselectAll} className="rounded-lg bg-black/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm transition hover:bg-black/30 hover:text-white shadow-sm">
                Deselect All
              </button>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function AddOnRow({
  addOn,
  audience,
  onChange,
  onRemove,
}: {
  addOn: AddOn;
  audience: Audience;
  onChange: (patch: Partial<AddOn>) => void;
  onRemove: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadImage(audience, file);
      onChange({
        image: { id: `addon-img-${Date.now()}`, url: result.url, label: addOn.label || "Add-on" },
      });
    } catch {
      // upload failed — leave the add-on without a photo
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-surface-border bg-cream-200/50 text-vibe-violet transition-colors hover:bg-cream-200"
        title={addOn.image ? "Replace photo" : "Add photo"}
      >
        {uploading ? (
          <Loader2 size={20} className="animate-spin" />
        ) : addOn.image ? (
          <img src={addOn.image.url} alt={addOn.label || "Add-on"} className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Upload size={20} />
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex gap-2">
          <input
            value={addOn.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="e.g. Breakfast, Hotel stay"
            className={inputClass}
          />
          <input
            type="number"
            value={addOn.price === 0 ? "" : addOn.price}
            onChange={(e) => onChange({ price: Number(e.target.value) })}
            placeholder="₹ Price"
            className={`${inputClass} w-28`}
          />
          <button onClick={onRemove} className="shrink-0 text-ink-faint hover:text-vibe-coral">
            <X size={16} />
          </button>
        </div>
        {addOn.image && (
          <button
            type="button"
            onClick={() => onChange({ image: undefined })}
            className="self-start text-[11px] font-semibold text-ink-faint hover:text-vibe-coral"
          >
            Remove photo
          </button>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-faint mr-1">Applies to:</span>
          {["cricket", "football", "badminton", "pickleball", "swimming", "tennis", "basketball"].map((sp) => {
            const active = (addOn.sports ?? []).includes(sp);
            return (
              <button
                key={sp}
                type="button"
                onClick={() => {
                  const current = addOn.sports ?? [];
                  const updated = current.includes(sp) ? current.filter((s) => s !== sp) : [...current, sp];
                  onChange({ sports: updated });
                }}
                className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase transition ${active ? "bg-vibe-violet text-white" : "bg-cream-200/80 text-ink-soft hover:bg-cream-300"
                  }`}
              >
                {sp}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PricingStep({ draft, update, audience }: StepProps & { audience: Audience }) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  // Held as a string so the field can actually be cleared. As a number, clearing it
  // coerced ""→0 and the box snapped back to a stuck "0".
  const [priceInput, setPriceInput] = useState<string>("");
  const [activeSource, setActiveSource] = useState<string>("default");

  const [customSports, setCustomSports] = useState<VendorCustomSport[]>([]);
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>("all");
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>("all");

  const [showSlotPricingInfo, setShowSlotPricingInfo] = useState(false);
  const [showAddOnsInfo, setShowAddOnsInfo] = useState(false);
  const [showCouponsInfo, setShowCouponsInfo] = useState(false);

  useEffect(() => {
    if (audience === "vendor") {
      getVendorCustomSports()
        .then((res) => setCustomSports(res || []))
        .catch(() => { });
    }
  }, [audience]);

  useEffect(() => {
    setSelectedCourtFilter("all");
  }, [selectedSportFilter]);

  const customCategories: SportCategory[] = customSports.map((cs) => ({
    id: cs._id,
    label: cs.sportName,
    image: cs.iconUrl,
    venue: cs.venue || "both",
    subCategories: [],
    isCustom: true,
    customId: cs._id,
  }));

  const allCategories = [...SPORT_CATEGORIES, ...customCategories];

  const selectedGames = useMemo(() => {
    return draft.categories.map((catId) => {
      const label = allCategories.find((c) => c.id === catId)?.label ?? catId;
      return { id: catId, label };
    });
  }, [draft.categories, allCategories]);

  const filteredCourtsForPricing = useMemo(() => {
    if (selectedSportFilter === "all") {
      return draft.courts ?? [];
    }
    const sportLabel = selectedGames.find((g) => g.id === selectedSportFilter)?.label;
    if (!sportLabel) return [];
    return (draft.courts ?? []).filter(
      (c) => c.sports.length === 0 || c.sports.includes(sportLabel)
    );
  }, [draft.courts, selectedSportFilter, selectedGames]);

  /* slots can live in two places: the global default list, or per-date overrides */
  const defaultSlots = draft.slotsList ?? [];
  const overrideSources = (draft.dateOverrides ?? []).filter((o) => !o.isHoliday && (o.slots ?? []).length > 0);

  const sources: { id: string; label: string }[] = [
    ...(defaultSlots.length > 0 ? [{ id: "default", label: "Global Default" }] : []),
    ...overrideSources.map((o) => ({
      id: o.date,
      label: new Date(`${o.date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    })),
  ];

  const sourceId = sources.some((s) => s.id === activeSource) ? activeSource : sources[0]?.id ?? "default";

  const slots: TurfSlot[] =
    sourceId === "default"
      ? defaultSlots
      : (draft.dateOverrides ?? []).find((o) => o.date === sourceId)?.slots ?? [];

  function saveSlots(nextSlots: TurfSlot[]) {
    if (sourceId === "default") {
      update("slotsList", nextSlots);
    } else {
      update(
        "dateOverrides",
        (draft.dateOverrides ?? []).map((o) => (o.date === sourceId ? { ...o, slots: nextSlots } : o))
      );
    }
  }

  const uniqueTimeRanges = useMemo(() => {
    const ranges: { startTime: string; endTime: string; label: string }[] = [];
    const seen = new Set<string>();
    slots.forEach((s) => {
      const key = `${s.startTime}-${s.endTime}`;
      if (!seen.has(key)) {
        seen.add(key);
        ranges.push({ startTime: s.startTime, endTime: s.endTime, label: s.label });
      }
    });
    return ranges;
  }, [slots]);

  interface EffectiveSlotInfo {
    price: number;
    blocked: boolean;
    source: "exact" | "sport" | "court" | "default" | "none";
    sourceLabel: string;
  }

  const getEffectiveSlot = (startTime: string, endTime: string): EffectiveSlotInfo => {
    const matchSport = selectedSportFilter === "all" ? undefined : selectedGames.find(g => g.id === selectedSportFilter)?.label;
    const matchCourt = selectedCourtFilter === "all" ? undefined : selectedCourtFilter;

    // 1. Exact match for sport + court
    if (matchSport && matchCourt) {
      const exact = slots.find(s => s.startTime === startTime && s.endTime === endTime && s.sport === matchSport && s.courtId === matchCourt);
      if (exact) {
        return {
          price: exact.price,
          blocked: !!exact.blocked,
          source: "exact",
          sourceLabel: `This Court`,
        };
      }
    }

    // 2. Match for sport only
    if (matchSport) {
      const sportOnly = slots.find(s => s.startTime === startTime && s.endTime === endTime && s.sport === matchSport && !s.courtId);
      if (sportOnly) {
        return {
          price: sportOnly.price,
          blocked: !!sportOnly.blocked,
          source: "sport",
          sourceLabel: `${matchSport} Default`,
        };
      }
    }

    // 3. Match for court only
    if (matchCourt) {
      const courtOnly = slots.find(s => s.startTime === startTime && s.endTime === endTime && !s.sport && s.courtId === matchCourt);
      if (courtOnly) {
        return {
          price: courtOnly.price,
          blocked: !!courtOnly.blocked,
          source: "court",
          sourceLabel: `Court Default`,
        };
      }
    }

    // 4. Default fallback (no sport, no court)
    const fallback = slots.find(s => s.startTime === startTime && s.endTime === endTime && !s.sport && !s.courtId);
    if (fallback) {
      return {
        price: fallback.price,
        blocked: !!fallback.blocked,
        source: "default",
        sourceLabel: "Global Default",
      };
    }

    return {
      price: 0,
      blocked: false,
      source: "none",
      sourceLabel: "Unpriced",
    };
  };

  const activeFilterSlots = useMemo(() => {
    const matchSport = selectedSportFilter === "all" ? undefined : selectedGames.find(g => g.id === selectedSportFilter)?.label;
    const matchCourt = selectedCourtFilter === "all" ? undefined : selectedCourtFilter;
    const isOverrideMode = matchSport !== undefined || matchCourt !== undefined;

    return uniqueTimeRanges.map((range) => {
      const existing = slots.find(
        (s) =>
          s.startTime === range.startTime &&
          s.endTime === range.endTime &&
          s.sport === matchSport &&
          s.courtId === matchCourt
      );

      const effective = getEffectiveSlot(range.startTime, range.endTime);

      return {
        startTime: range.startTime,
        endTime: range.endTime,
        label: range.label,
        price: effective.price,
        blocked: effective.blocked,
        source: effective.source,
        sourceLabel: effective.sourceLabel,
        isOverride: isOverrideMode && !!existing,
        sport: matchSport,
        courtId: matchCourt,
      };
    });
  }, [uniqueTimeRanges, slots, selectedSportFilter, selectedCourtFilter, selectedGames]);

  const matchSport = selectedSportFilter === "all" ? undefined : selectedGames.find(g => g.id === selectedSportFilter)?.label;
  const matchCourt = selectedCourtFilter === "all" ? undefined : selectedCourtFilter;
  const isOverrideMode = matchSport !== undefined || matchCourt !== undefined;

  // Blocked slots (unavailable — excluded from pricing entirely)
  const blockedSlots = activeFilterSlots.filter((s) => s.blocked);
  // Slots that don't have custom overrides set for the exact selection
  const unpricedSlots = activeFilterSlots.filter((s) => {
    if (isOverrideMode) {
      return !s.isOverride && !s.blocked;
    } else {
      return s.price === 0 && !s.blocked;
    }
  });
  // Slots that DO have custom overrides set for the exact selection
  const pricedSlots = activeFilterSlots.filter((s) => {
    if (isOverrideMode) {
      return s.isOverride && s.price > 0 && !s.blocked;
    } else {
      return s.price > 0 && !s.blocked;
    }
  });

  function toggleBlockSlot(key: string, blocked: boolean) {
    const [start, end] = key.split("-");
    const matchSport = selectedSportFilter === "all" ? undefined : selectedGames.find(g => g.id === selectedSportFilter)?.label;
    const matchCourt = selectedCourtFilter === "all" ? undefined : selectedCourtFilter;

    let nextSlots = [...slots];
    const idx = nextSlots.findIndex(
      (s) =>
        s.startTime === start &&
        s.endTime === end &&
        s.sport === matchSport &&
        s.courtId === matchCourt
    );

    if (blocked) {
      if (idx > -1) {
        nextSlots[idx] = { ...nextSlots[idx], blocked: true };
      } else {
        const label = uniqueTimeRanges.find(r => r.startTime === start)?.label ?? "Morning";
        nextSlots.push({
          startTime: start,
          endTime: end,
          label,
          price: 0,
          blocked: true,
          sport: matchSport,
          courtId: matchCourt,
        });
      }
    } else {
      if (idx > -1) {
        if (nextSlots[idx].price > 0) {
          nextSlots[idx] = { ...nextSlots[idx], blocked: false };
        } else {
          nextSlots = nextSlots.filter((_, i) => i !== idx);
        }
      }
    }
    saveSlots(nextSlots);
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
  }

  function handleSetPrice() {
    if (selectedKeys.length === 0) return;
    const matchSport = selectedSportFilter === "all" ? undefined : selectedGames.find(g => g.id === selectedSportFilter)?.label;
    const matchCourt = selectedCourtFilter === "all" ? undefined : selectedCourtFilter;
    const priceNum = Number(priceInput) || 0;

    let nextSlots = [...slots];
    selectedKeys.forEach((key) => {
      const [start, end] = key.split("-");
      const idx = nextSlots.findIndex(
        (s) =>
          s.startTime === start &&
          s.endTime === end &&
          s.sport === matchSport &&
          s.courtId === matchCourt
      );
      if (idx > -1) {
        nextSlots[idx] = { ...nextSlots[idx], price: priceNum };
      } else {
        const label = uniqueTimeRanges.find(r => r.startTime === start)?.label ?? "Morning";
        nextSlots.push({
          startTime: start,
          endTime: end,
          label,
          price: priceNum,
          blocked: false,
          sport: matchSport,
          courtId: matchCourt,
        });
      }
    });
    saveSlots(nextSlots);
    setSelectedKeys([]);
  }

  function handleRemovePrice(key: string) {
    const [start, end] = key.split("-");
    const matchSport = selectedSportFilter === "all" ? undefined : selectedGames.find(g => g.id === selectedSportFilter)?.label;
    const matchCourt = selectedCourtFilter === "all" ? undefined : selectedCourtFilter;

    // Filter out override completely so it reverts to fallback defaults
    const nextSlots = slots.filter(
      (s) =>
        !(
          s.startTime === start &&
          s.endTime === end &&
          s.sport === matchSport &&
          s.courtId === matchCourt
        )
    );
    saveSlots(nextSlots);
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
  }

  function toggleSelect(key: string) {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function selectAll() {
    setSelectedKeys(unpricedSlots.map((s) => `${s.startTime}-${s.endTime}`));
  }

  function deselectAll() {
    setSelectedKeys([]);
  }

  function updateTier(i: number, patch: Partial<PriceTier>) {
    update("priceTiers", draft.priceTiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }
  function addTier() {
    update("priceTiers", [...draft.priceTiers, { id: `tier-${Date.now()}`, label: "", amount: 0 }]);
  }
  function removeTier(i: number) {
    update("priceTiers", draft.priceTiers.filter((_, idx) => idx !== i));
  }

  const addOns = draft.addOns ?? [];
  function updateAddOn(i: number, patch: Partial<AddOn>) {
    update("addOns", addOns.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }
  function addAddOn() {
    update("addOns", [...addOns, { id: `addon-${Date.now()}`, label: "", price: 0 }]);
  }
  function removeAddOn(i: number) {
    update("addOns", addOns.filter((_, idx) => idx !== i));
  }

  const coupons = draft.coupons ?? [];
  function addCoupon() {
    update("coupons", [...coupons, { id: `coupon-${Date.now()}`, code: "", discountPercent: 10 }]);
  }
  function updateCoupon(i: number, patch: Partial<Coupon>) {
    update("coupons", coupons.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function removeCoupon(i: number) {
    update("coupons", coupons.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-6">
      {/* ── TURF SLOT PRICING SELECTOR ── */}
      {draft.type !== "Event" && (
        <div className="rounded-xl border border-surface-border bg-cream-200/25 p-5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Slot-by-Slot Pricing
            </span>
            <button
              type="button"
              onClick={() => setShowSlotPricingInfo(!showSlotPricingInfo)}
              className={`rounded-full p-0.5 transition cursor-pointer ${showSlotPricingInfo ? "bg-vibe-violet/20 text-vibe-violet" : "text-ink-faint hover:bg-cream-200 hover:text-ink"
                }`}
              title="Show info"
            >
              <Info size={11} />
            </button>
          </div>
          {showSlotPricingInfo && (
            <p className="text-xs text-ink-faint mb-3 bg-cream-200/40 p-2.5 rounded-lg leading-relaxed animate-in slide-in-from-top-1 duration-150">
              Click to select one or multiple slots below, set their price, and apply. Priced slots will move to the list below.
            </p>
          )}

          {/* Slot source tabs — global default + per-date override lists */}
          {sources.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {sources.map((src) => (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => {
                    setActiveSource(src.id);
                    setSelectedKeys([]);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                    sourceId === src.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {src.id === "default" ? "⚙️ " : "📅 "}
                  {src.label}
                </button>
              ))}
            </div>
          )}
          {sources.length > 0 && sourceId !== "default" && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-vibe-amber">
              You are pricing the custom slots for {sources.find((s) => s.id === sourceId)?.label} only.
            </p>
          )}

          {/* Game and Court selectors for pricing overrides */}
          <div className="mb-4 bg-cream-200/50 p-4 rounded-xl border border-surface-border space-y-4">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                1. Select Sport / Game
              </span>
              <div className="flex flex-row flex-nowrap gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedSportFilter("all")}
                  className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition border cursor-pointer ${
                    selectedSportFilter === "all"
                      ? "border-vibe-violet bg-vibe-violet text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  All Games (Global Default)
                </button>
                {selectedGames.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedSportFilter(g.id)}
                    className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition border cursor-pointer ${
                      selectedSportFilter === g.id
                        ? "border-vibe-violet bg-vibe-violet text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                2. Select Court
              </span>
              <div className="flex flex-row flex-nowrap gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCourtFilter("all")}
                  disabled={selectedSportFilter === "all" && filteredCourtsForPricing.length === 0}
                  className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    selectedCourtFilter === "all"
                      ? "border-vibe-violet bg-vibe-violet text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  All Courts
                </button>
                {filteredCourtsForPricing.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCourtFilter(c.id)}
                    className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition border cursor-pointer ${
                      selectedCourtFilter === c.id
                        ? "border-vibe-violet bg-vibe-violet text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Selection Tip banner */}
            <div className="mt-3 pt-3 border-t border-cream-200/40">
              {selectedSportFilter === "all" && selectedCourtFilter === "all" ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800 border border-emerald-100/80 leading-relaxed animate-in slide-in-from-top-1 duration-150">
                  💡 <strong>Global Default:</strong> Setting a price here will apply to <strong>all games and all courts</strong> by default.
                </p>
              ) : selectedSportFilter !== "all" && selectedCourtFilter === "all" ? (
                <p className="rounded-lg bg-indigo-50 px-3 py-2 text-[11px] font-semibold text-indigo-850 border border-indigo-150/80 leading-relaxed animate-in slide-in-from-top-1 duration-150">
                  💡 <strong>Game Default:</strong> Setting a price here will apply to <strong>all courts</strong> hosting <strong>{selectedGames.find(g => g.id === selectedSportFilter)?.label}</strong> (unless overridden).
                </p>
              ) : selectedSportFilter === "all" && selectedCourtFilter !== "all" ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-850 border border-amber-150/80 leading-relaxed animate-in slide-in-from-top-1 duration-150">
                  💡 <strong>Court Default:</strong> Setting a price here will apply to <strong>all games</strong> played on <strong>{filteredCourtsForPricing.find(c => c.id === selectedCourtFilter)?.name ?? selectedCourtFilter}</strong>.
                </p>
              ) : (
                <p className="rounded-lg bg-purple-50 px-3 py-2 text-[11px] font-semibold text-purple-850 border border-purple-150/80 leading-relaxed animate-in slide-in-from-top-1 duration-150">
                  💡 <strong>Custom Override:</strong> Setting a price here will apply <strong>only</strong> to the game <strong>{selectedGames.find(g => g.id === selectedSportFilter)?.label}</strong> on <strong>{filteredCourtsForPricing.find(c => c.id === selectedCourtFilter)?.name ?? selectedCourtFilter}</strong>.
                </p>
              )}
            </div>
          </div>

          {/* Pricing Controls Row */}
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-48">
                <FieldLabel>Enter Price (₹) *</FieldLabel>
                <input type="number" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} placeholder="e.g. 1000" className={`${inputClass} text-xs`} />
              </div>
              <button type="button" onClick={handleSetPrice} disabled={selectedKeys.length === 0}
                className="rounded-xl bg-vibe-violet px-5 py-2.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition cursor-pointer">
                Apply Price ({selectedKeys.length} selected)
              </button>
            </div>

            {unpricedSlots.length > 0 && (
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg font-bold uppercase transition cursor-pointer">Select All</button>
                <button type="button" onClick={deselectAll} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg font-bold uppercase transition cursor-pointer">Deselect All</button>
              </div>
            )}
          </div>

          {/* Unpriced slots selector cards */}
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Select Slots to Price ({unpricedSlots.length})</p>
            {uniqueTimeRanges.length === 0 ? (
              <p className="text-xs text-slate-500 font-semibold bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                No slots generated yet. Go back to the Slots step (Step 2) and generate slots first.
              </p>
            ) : unpricedSlots.length === 0 ? (
              <p className="text-xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">🎉 All slots have been priced!</p>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {(["Morning", "Afternoon", "Evening", "Night", "Mid Night"] as const).map((part) => {
                  const partSlots = unpricedSlots.filter((s) => s.label === part);
                  if (partSlots.length === 0) return null;

                  return (
                    <DayPartGroup
                      key={part}
                      part={part}
                      onSelectAll={() => {
                        const keys = partSlots.map((s) => `${s.startTime}-${s.endTime}`);
                        setSelectedKeys((prev) => Array.from(new Set([...prev, ...keys])));
                      }}
                      onDeselectAll={() => {
                        const keys = partSlots.map((s) => `${s.startTime}-${s.endTime}`);
                        setSelectedKeys((prev) => prev.filter((k) => !keys.includes(k)));
                      }}
                    >
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                        {partSlots.map((s) => {
                          const key = `${s.startTime}-${s.endTime}`;
                          const isSelected = selectedKeys.includes(key);
                          return (
                            <div key={key} className="group relative">
                              <button type="button" onClick={() => toggleSelect(key)}
                                className={`flex w-full flex-col items-center justify-center p-2.5 rounded-xl border-2 transition cursor-pointer ${isSelected ? "border-vibe-violet bg-vibe-violet/5 font-extrabold shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                                  }`}
                              >
                                <span className="text-xs font-bold text-slate-700 font-mono">{to12h(s.startTime)} - {to12h(s.endTime)}</span>
                                <span className={`text-[10px] font-extrabold mt-1 ${s.price > 0 ? "text-vibe-violet" : "text-slate-400"}`}>
                                  {s.price > 0 ? `₹${s.price}` : "Not Set"}
                                </span>
                                <span className="text-[8px] text-slate-400 uppercase mt-0.5">{s.sourceLabel}</span>
                              </button>
                              <button
                                type="button"
                                title="Block this slot"
                                onClick={(e) => { e.stopPropagation(); toggleBlockSlot(key, true); }}
                                className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white opacity-0 transition group-hover:flex group-hover:opacity-100 hover:bg-vibe-coral cursor-pointer"
                              >
                                <Ban size={11} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </DayPartGroup>
                  );
                })}
              </div>
            )}
          </div>

          {/* List of Priced Slots */}
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Custom Overrides for Selected Sport/Court ({pricedSlots.length})
            </p>
            <p className="text-[9px] text-ink-faint mb-2.5">
              These are specific prices you set just for this game/court. Deleting them will revert the slot to inherit the default price.
            </p>
            {pricedSlots.length === 0 ? (
              <p className="text-xs text-ink-faint italic rounded-xl bg-white p-3 border border-slate-100">No custom pricing overrides set yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto pr-1">
                {pricedSlots.map((s) => {
                  const key = `${s.startTime}-${s.endTime}`;
                  return (
                    <div key={key} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-800 shadow-sm animate-in zoom-in-95 duration-100">
                      <span>{to12h(s.startTime)} - {to12h(s.endTime)}: ₹{s.price}</span>
                      <span className="text-[8px] text-vibe-violet bg-vibe-violet/5 px-1.5 py-0.5 rounded uppercase tracking-tight">{s.sourceLabel}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePrice(key)}
                        className="text-slate-400 hover:text-vibe-coral rounded p-0.5 transition cursor-pointer"
                        title="Remove override"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Blocked slots */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Blocked Slots ({blockedSlots.length})</p>
            {blockedSlots.length === 0 ? (
              <p className="text-xs text-ink-faint italic rounded-xl bg-white p-3 border border-slate-100">No slots blocked. Hover a slot above and tap the ban icon to block it.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-[150px] overflow-y-auto pr-1">
                {blockedSlots.map((s) => {
                  const key = `${s.startTime}-${s.endTime}`;
                  return (
                    <div key={key} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 animate-in zoom-in-95 duration-100">
                      <span>{to12h(s.startTime)} - {to12h(s.endTime)}</span>
                      <span className="text-[8px] text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded uppercase tracking-tight">Blocked</span>
                      <button
                        type="button"
                        onClick={() => toggleBlockSlot(key, false)}
                        className="text-slate-400 hover:text-vibe-violet rounded p-0.5 transition cursor-pointer"
                        title="Unblock slot"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Participant tiers */}
      {draft.type === "Event" && (
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">Pricing</p>
          <p className="mb-4 text-xs text-ink-faint">Set participant-wise pricing</p>
          <div className="space-y-3">
            {draft.priceTiers.map((tier, i) => (
              <div key={tier.id} className="grid grid-cols-[1fr_160px_auto] items-end gap-3">
                <div>
                  <FieldLabel>Type</FieldLabel>
                  <input value={tier.label} onChange={(e) => updateTier(i, { label: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <FieldLabel>Amount (₹)</FieldLabel>
                  <input
                    type="number"
                    value={tier.amount === 0 ? "" : tier.amount}
                    onChange={(e) => updateTier(i, { amount: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
                <button onClick={() => removeTier(i)} className="pb-2.5 text-ink-faint hover:text-vibe-coral">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addTier} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-vibe-lime px-3 py-2 text-xs font-semibold text-vibe-indigo">
            <Plus size={13} /> Add price
          </button>
        </div>
      )}


      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl2 border border-surface-border p-5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-ink">Add-ons</span>
              <button
                type="button"
                onClick={() => setShowAddOnsInfo(!showAddOnsInfo)}
                className={`rounded-full p-0.5 transition cursor-pointer ${showAddOnsInfo ? "bg-vibe-violet/20 text-vibe-violet" : "text-ink-faint hover:bg-cream-200 hover:text-ink"
                  }`}
                title="Show info"
              >
                <Info size={11} />
              </button>
            </div>
          </div>
          {showAddOnsInfo && (
            <p className="text-xs text-ink-faint mb-3 bg-cream-200/40 p-2.5 rounded-lg leading-relaxed animate-in slide-in-from-top-1 duration-150">
              Optional extras with charges — add a photo to drive impulse buys.
            </p>
          )}
          <div className="space-y-3">
            {addOns.map((a, i) => (
              <AddOnRow
                key={a.id}
                addOn={a}
                audience={audience}
                onChange={(patch) => updateAddOn(i, patch)}
                onRemove={() => removeAddOn(i)}
              />
            ))}
          </div>
          <button onClick={addAddOn} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-vibe-lime px-3 py-2 text-xs font-semibold text-vibe-indigo cursor-pointer">
            <Plus size={13} /> Add extra
          </button>
        </div>

        <div className="rounded-xl2 border border-surface-border p-5">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-ink">Coupons &amp; Discounts</span>
              <button
                type="button"
                onClick={() => setShowCouponsInfo(!showCouponsInfo)}
                className={`rounded-full p-0.5 transition cursor-pointer ${showCouponsInfo ? "bg-vibe-violet/20 text-vibe-violet" : "text-ink-faint hover:bg-cream-200 hover:text-ink"
                  }`}
                title="Show info"
              >
                <Info size={11} />
              </button>
            </div>
            <button
              onClick={addCoupon}
              className="inline-flex items-center gap-1 rounded-full border border-vibe-violet px-3 py-1 text-xs font-semibold text-vibe-violet cursor-pointer"
            >
              <Plus size={12} /> Add Coupon
            </button>
          </div>
          {showCouponsInfo && (
            <p className="text-xs text-ink-faint mb-3 bg-cream-200/40 p-2.5 rounded-lg leading-relaxed animate-in slide-in-from-top-1 duration-150">
              Configure multiple promotional codes for this package.
            </p>
          )}
          <p className="mb-2 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">Active Coupons</p>
          {coupons.length === 0 ? (
            <p className="rounded-lg bg-cream-200/60 px-3 py-3 text-xs text-ink-faint">
              No coupons have been configured yet. Click Add Coupon to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {coupons.map((c, i) => (
                <div key={c.id} className="bg-cream-200/30 p-3 rounded-xl border border-surface-border">
                  <div className="flex items-center gap-2">
                    <input
                      value={c.code}
                      onChange={(e) => updateCoupon(i, { code: e.target.value.toUpperCase() })}
                      placeholder="CODE20"
                      className={`${inputClass} flex-1 uppercase`}
                    />
                    <div className="flex shrink-0 items-center gap-1">
                      <input
                        type="number"
                        value={c.discountPercent === 0 ? "" : c.discountPercent}
                        onChange={(e) => updateCoupon(i, { discountPercent: Number(e.target.value) })}
                        className={`${inputClass} w-20`}
                        placeholder="%"
                      />
                    </div>
                    <button onClick={() => removeCoupon(i)} className="text-ink-faint hover:text-vibe-coral p-1 cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>
                  
                  {draft.type !== "Event" && selectedGames.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-cream-200/50">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-2">Applicable Games (Leave blank for all)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedGames.map(g => {
                          const isActive = c.sports?.includes(g.label);
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                const current = c.sports ?? [];
                                const next = isActive ? current.filter(s => s !== g.label) : [...current, g.label];
                                updateCoupon(i, { sports: next });
                              }}
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition cursor-pointer ${
                                isActive ? "bg-vibe-violet text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {g.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP 7 — ACADEMY (only when the vendor opted in on step 1)         */
/* ------------------------------------------------------------------ */

const ACADEMY_WEEKDAYS = [
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
  { day: 0, label: "Sun" },
];

function AcademyStep({
  academy,
  setAcademy,
  listingCategories,
}: {
  academy: AcademyDraft;
  setAcademy: (patch: Partial<AcademyDraft>) => void;
  listingCategories: string[];
}) {
  // Offer the venue's own sports first — an academy here almost always coaches
  // one of them — but keep the full catalogue available as a fallback.
  const options = listingCategories.length > 0
    ? SPORT_CATEGORIES.filter((c) => listingCategories.includes(c.id))
    : SPORT_CATEGORIES;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Academy at this venue</p>
        <p className="text-xs text-ink-faint">
          Players will see this alongside the turf, and enrolments show up under Bookings → Academy Bookings.
        </p>
      </div>

      <div>
        <FieldLabel>Academy name *</FieldLabel>
        <input
          value={academy.name}
          onChange={(e) => setAcademy({ name: e.target.value })}
          placeholder="e.g. Field Club Football Academy"
          className={inputClass}
        />
      </div>

      <div>
        <FieldLabel>Sports coached *</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {options.map((c) => {
            const active = academy.sports.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  setAcademy({
                    sports: active ? academy.sports.filter((s) => s !== c.id) : [...academy.sports, c.id],
                  })
                }
                className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${active ? "border-vibe-violet bg-vibe-violet text-white" : "border-surface-border bg-white text-ink-soft hover:border-vibe-violet/50"
                  }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <FieldLabel>How do you charge? *</FieldLabel>
        <div className="flex overflow-hidden rounded-xl border border-surface-border">
          {([
            ["session", "Per Game"],
            ["day", "Per Day"],
            ["month", "Per Month"],
          ] as [AcademyDraft["pricingMode"], string][]).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setAcademy({ pricingMode: mode })}
              className={`flex-1 py-2.5 text-xs font-bold transition ${academy.pricingMode === mode ? "bg-vibe-violet text-white" : "bg-white text-ink-soft hover:bg-cream-300"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-faint">₹</span>
          <input
            value={academy.price}
            onChange={(e) => setAcademy({ price: e.target.value.replace(/\D/g, "") })}
            inputMode="numeric"
            placeholder={academy.pricingMode === "session" ? "300" : academy.pricingMode === "day" ? "500" : "2500"}
            className={`${inputClass} pl-7`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Start time</FieldLabel>
          <input type="time" value={academy.startTime} onChange={(e) => setAcademy({ startTime: e.target.value })} className={inputClass} />
        </div>
        <div>
          <FieldLabel>End time</FieldLabel>
          <input type="time" value={academy.endTime} onChange={(e) => setAcademy({ endTime: e.target.value })} className={inputClass} />
        </div>
      </div>

      <div>
        <FieldLabel>Days it runs</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {ACADEMY_WEEKDAYS.map((d) => {
            const active = academy.days.includes(d.day);
            return (
              <button
                key={d.day}
                type="button"
                onClick={() =>
                  setAcademy({ days: active ? academy.days.filter((x) => x !== d.day) : [...academy.days, d.day] })
                }
                className={`h-10 w-14 rounded-lg border text-xs font-bold transition ${active ? "border-vibe-violet bg-vibe-violet text-white" : "border-surface-border bg-white text-ink-soft"
                  }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <FieldLabel>Batch capacity</FieldLabel>
        <input
          value={academy.capacity}
          onChange={(e) => setAcademy({ capacity: e.target.value.replace(/\D/g, "") })}
          inputMode="numeric"
          className={`${inputClass} max-w-[160px]`}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP 6 — LAUNCH                                                    */
/* ------------------------------------------------------------------ */

function LaunchStep({ draft, update }: StepProps) {
  const specs = draft.technicalSpecs ?? [];

  function addSpec() {
    update("technicalSpecs", [...specs, { label: "", value: "", icon: "crop", color: "purple" }]);
  }
  function updateSpec(i: number, patch: Partial<any>) {
    update("technicalSpecs", specs.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function removeSpec(i: number) {
    update("technicalSpecs", specs.filter((_, idx) => idx !== i));
  }

  function addDay() {
    update("itinerary", [...draft.itinerary, { day: draft.itinerary.length + 1, title: "", description: "" }]);
  }
  function updateDay(i: number, patch: Partial<ItineraryStop>) {
    update("itinerary", draft.itinerary.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function removeDay(i: number) {
    update(
      "itinerary",
      draft.itinerary.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, day: idx + 1 }))
    );
  }

  function addFaq() {
    update("faqs", [...draft.faqs, { question: "", answer: "" }]);
  }
  function updateFaq(i: number, patch: Partial<ListingFAQ>) {
    update("faqs", draft.faqs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function removeFaq(i: number) {
    update("faqs", draft.faqs.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">Visibility &amp; publishing</p>
          <p className="text-xs text-ink-faint">Choose how this package should appear before you go live</p>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-wider text-ink-faint uppercase">Status</p>
            <ToggleGroup
              value={draft.status}
              options={[
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
              ]}
              onChange={(v) => update("status", v)}
            />
          </div>
          {draft.type === "Event" && (
            <>
              <div>
                <p className="mb-1 text-[10px] font-semibold tracking-wider text-ink-faint uppercase">Trending</p>
                <ToggleGroup
                  value={draft.trending ? "On" : "Off"}
                  options={[
                    { value: "Off", label: "Off" },
                    { value: "On", label: "On" },
                  ]}
                  onChange={(v) => update("trending", v === "On")}
                />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold tracking-wider text-ink-faint uppercase">Private</p>
                <ToggleGroup
                  value={draft.isPrivate ? "On" : "Off"}
                  options={[
                    { value: "Off", label: "Off" },
                    { value: "On", label: "On" },
                  ]}
                  onChange={(v) => update("isPrivate", v === "On")}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <FieldLabel>Description *</FieldLabel>
        <textarea
          rows={5}
          value={draft.description}
          onChange={(e) => update("description", e.target.value)}
          className={inputClass}
          placeholder="Describe your package — what makes it special, who it's for, and what guests can expect."
        />
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">Amenities</p>
        <p className="mb-3 text-xs text-ink-faint">
          {draft.type === "Event" ? "What's included in the package price, and what's not." : "What facilities you provide at the venue, and what you don't."}
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <TagField
            label={draft.type === "Event" ? "Included" : "Amenities Provided"}
            placeholder={draft.type === "Event" ? "e.g. Professional guide" : "e.g. Washrooms, Parking, Floodlights"}
            values={draft.inclusions}
            onChange={(v) => update("inclusions", v)}
            tone="success"
            suggestions={draft.type === "Event" ? EVENT_INCLUSION_SUGGESTIONS : AMENITY_SUGGESTIONS}
          />
          <TagField
            label={draft.type === "Event" ? "Excluded" : "Not Provided"}
            placeholder={draft.type === "Event" ? "e.g. Personal expenses" : "e.g. Equipment rental, Cafeteria"}
            values={draft.exclusions}
            onChange={(v) => update("exclusions", v)}
            tone="danger"
            suggestions={draft.type === "Event" ? EVENT_INCLUSION_SUGGESTIONS : AMENITY_SUGGESTIONS}
          />
        </div>
      </div>

      <div className="rounded-xl2 border border-surface-border p-5">
        <p className="text-sm font-semibold text-ink">Technical Specifications</p>
        <p className="mb-4 text-xs text-ink-faint">
          Define technical metrics for this turf (e.g. Ground Dimensions, Vertical Clearance, Floodlights, Pitch Conditions, Nets etc.)
        </p>
        <div className="space-y-4">
          {specs.map((spec, i) => (
            <div key={i} className="flex flex-wrap items-center gap-4 rounded-xl border border-surface-border p-4 bg-cream-100/50">
              <div className="flex-1 min-w-[150px]">
                <FieldLabel>Specification Title</FieldLabel>
                <input
                  type="text"
                  value={spec.label}
                  onChange={(e) => updateSpec(i, { label: e.target.value })}
                  placeholder="e.g. Ground Dimensions"
                  className={inputClass}
                  required
                />
              </div>
              <div className="flex-[2] min-w-[200px]">
                <FieldLabel>Specification Value / Detail</FieldLabel>
                <input
                  type="text"
                  value={spec.value}
                  onChange={(e) => updateSpec(i, { value: e.target.value })}
                  placeholder="e.g. Massive 12,500 sq.ft arena..."
                  className={inputClass}
                  required
                />
              </div>
              <div className="w-40">
                <FieldLabel>Icon</FieldLabel>
                <select
                  value={spec.icon}
                  onChange={(e) => updateSpec(i, { icon: e.target.value })}
                  className={inputClass}
                >
                  <option value="crop">Dimensions (Crop)</option>
                  <option value="arrow-up-down">Clearance (Arrow)</option>
                  <option value="lightbulb">Floodlights (Bulb)</option>
                  <option value="layers">Pitch Conditions (Layers)</option>
                  <option value="grid">Nets Gap (Grid)</option>
                </select>
              </div>
              <div className="w-32">
                <FieldLabel>Color Theme</FieldLabel>
                <select
                  value={spec.color || "purple"}
                  onChange={(e) => updateSpec(i, { color: e.target.value })}
                  className={inputClass}
                >
                  <option value="purple">Purple</option>
                  <option value="blue">Blue</option>
                  <option value="orange">Orange</option>
                  <option value="green">Green</option>
                  <option value="pink">Pink</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeSpec(i)}
                className="mt-5 text-ink-faint hover:text-vibe-coral shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {specs.length === 0 && (
            <p className="text-xs text-ink-faint italic py-2 text-center bg-cream-100 rounded-xl">No technical specifications added yet.</p>
          )}
        </div>
        <button
          type="button"
          onClick={addSpec}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-vibe-lime px-3 py-2 text-xs font-semibold text-vibe-indigo"
        >
          <Plus size={13} /> Add Specification
        </button>
      </div>

      {draft.type === "Event" && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <TagField label="Highlights" placeholder="e.g. Stunning Himalayan views" values={draft.highlights} onChange={(v) => update("highlights", v)} />
            <TagField label="Tags" placeholder="e.g. adventure, trekking, camping" values={draft.tags} onChange={(v) => update("tags", v)} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl2 border border-surface-border p-5">
              <p className="text-sm font-semibold text-ink">FAQs *</p>
              <p className="mb-4 text-xs text-ink-faint">Common questions &amp; answers</p>
              <div className="space-y-4">
                {draft.faqs.map((f, i) => (
                  <div key={i} className="rounded-lg border border-surface-border p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <FieldLabel>Question</FieldLabel>
                      <button onClick={() => removeFaq(i)} className="text-ink-faint hover:text-vibe-coral">
                        <X size={14} />
                      </button>
                    </div>
                    <input value={f.question} onChange={(e) => updateFaq(i, { question: e.target.value })} className={`${inputClass} mb-2`} />
                    <FieldLabel>Answer</FieldLabel>
                    <input value={f.answer} onChange={(e) => updateFaq(i, { answer: e.target.value })} className={inputClass} />
                  </div>
                ))}
              </div>
              <button onClick={addFaq} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-vibe-lime px-3 py-2 text-xs font-semibold text-vibe-indigo">
                <Plus size={13} /> Add FAQ
              </button>
            </div>

            <div className="rounded-xl2 border border-surface-border p-5">
              <p className="text-sm font-semibold text-ink">Itinerary</p>
              <p className="mb-4 text-xs text-ink-faint">Day-by-day plan</p>
              <div className="space-y-4">
                {draft.itinerary.map((s, i) => (
                  <div key={i} className="rounded-lg border border-surface-border p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink">Day {s.day}</p>
                      <button onClick={() => removeDay(i)} className="text-ink-faint hover:text-vibe-coral">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <FieldLabel>Day Title</FieldLabel>
                    <input
                      value={s.title}
                      onChange={(e) => updateDay(i, { title: e.target.value })}
                      placeholder={`Day ${s.day}: Introduction`}
                      className={`${inputClass} mb-2`}
                    />
                    <FieldLabel>Description</FieldLabel>
                    <textarea rows={2} value={s.description} onChange={(e) => updateDay(i, { description: e.target.value })} className={inputClass} />
                  </div>
                ))}
              </div>
              <button onClick={addDay} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-vibe-lime px-3 py-2 text-xs font-semibold text-vibe-indigo">
                <Plus size={13} /> Add day
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PACKAGE STUDIO — shared modal for create & edit                    */
/* ------------------------------------------------------------------ */

export function PackageStudio({
  mode,
  initialListing,
  initialType = "Turf",
  audience = "vendor",
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  initialListing?: Listing;
  initialType?: ListingType;
  audience?: Audience;
  onClose: () => void;
  /** `academy` is present only when the vendor opted in on step 1 — the caller
   * creates the listing first, then attaches the academy to the new listing id. */
  onSave: (listing: Listing, academy?: AcademyDraft) => void;
}) {
  const [draft, setDraft] = useState<Listing>(() => initialListing ?? emptyListing(initialType));
  const [academyEnabled, setAcademyEnabled] = useState(false);
  const [academy, setAcademyState] = useState<AcademyDraft>(emptyAcademyDraft);
  const setAcademy = (patch: Partial<AcademyDraft>) => setAcademyState((a) => ({ ...a, ...patch }));

  // Events never host an academy, and an existing listing's academy is managed from
  // the Coaches section instead — so only offer this while creating a Turf/Game.
  const canOfferAcademy = draft.type !== "Event" && mode === "create";
  const showAcademyStep = canOfferAcademy && academyEnabled;
  const lastStep = showAcademyStep ? ACADEMY_STEP.id : 6;

  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [vendorProfile, setVendorProfile] = useState<any>(null);

  useEffect(() => {
    import("@/lib/api/auth").then((auth) => {
      auth.restoreVendorSession().then((profile) => {
        if (profile) {
          setVendorProfile(profile);
          setDraft((d) => {
            if (!d.title) {
              const name = ("businessName" in profile)
                ? (profile as any).businessName
                : ("holderName" in profile)
                  ? (profile as any).holderName
                  : "";
              return { ...d, title: name || "" };
            }
            return d;
          });
        }
      });
    });
  }, []);

  function update<K extends keyof Listing>(key: K, value: Listing[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function goTo(s: number) {
    setStep(s);
    setMaxStep((m) => Math.max(m, s));
  }

  function handlePrimary() {
    // Step 6 is Publish; when an academy was opted into, step 7 comes after it.
    if (step < lastStep) {
      goTo(step === 6 && showAcademyStep ? ACADEMY_STEP.id : step + 1);
      return;
    }

    const profileName = vendorProfile
      ? ("businessName" in vendorProfile
        ? (vendorProfile as any).businessName
        : ("holderName" in vendorProfile
          ? (vendorProfile as any).holderName
          : ""))
      : "";

    // Auto fallback for empty listing title to vendor profile business name
    const finalTitle = draft.title.trim() || profileName || `Udaipur ${draft.type} Club`;
    const startingPrice = computeStartingPrice(draft);
    const finalDraft = {
      ...draft,
      title: finalTitle,
      price: startingPrice,
      courts: (draft.courts ?? []).map((c) => ({
        ...c,
        active: c.active !== false,
        // Blank photo/surface are "not set", not empty values worth storing.
        image: c.image?.trim() ? c.image : undefined,
        surface: c.surface?.trim() ? c.surface.trim() : undefined,
        sportPrices: (c.sportPrices ?? []).filter((p) => p.price > 0),
      })),
    };

    if (finalDraft.categories.length === 0) {
      setFormError("Select at least one category.");
      goTo(3); // Details step
      return;
    }
    const hasCity = finalDraft.cityMode === "multiple" ? (finalDraft.cities?.length ?? 0) > 0 : finalDraft.city.trim().length > 0;
    if (!hasCity) {
      setFormError("Choose at least one city.");
      goTo(4); // Location step
      return;
    }
    if (finalDraft.type !== "Event" && (finalDraft.slotsPerDay ?? 0) <= 0) {
      setFormError("Generate at least one time slot before publishing.");
      goTo(2); // Slots step
      return;
    }
    if (startingPrice <= 0) {
      setFormError(
        finalDraft.type === "Event"
          ? "Set a price for at least one participant tier before publishing."
          : "Set a price for at least one slot before publishing."
      );
      goTo(5); // Pricing step
      return;
    }
    if (showAcademyStep) {
      if (academy.name.trim().length < 2) {
        setFormError("Enter the academy's name.");
        goTo(ACADEMY_STEP.id);
        return;
      }
      if (academy.sports.length === 0) {
        setFormError("Pick at least one sport for the academy.");
        goTo(ACADEMY_STEP.id);
        return;
      }
      if (!(Number(academy.price) > 0)) {
        setFormError("Set the academy's price.");
        goTo(ACADEMY_STEP.id);
        return;
      }
      if (academy.days.length === 0) {
        setFormError("Pick at least one day the academy runs.");
        goTo(ACADEMY_STEP.id);
        return;
      }
    }

    setFormError(null);
    onSave(finalDraft, showAcademyStep ? academy : undefined);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-cream-200">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-vibe-indigo via-vibe-violet to-vibe-violetSoft px-4 py-4 text-white shadow-pop sm:px-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
            {draft.type === "Event"
              ? mode === "edit" ? "Edit Event" : "New Event"
              : mode === "edit" ? "Edit Package" : "New Package"}
          </p>
          <h2 className="font-display text-lg font-semibold sm:text-xl">
            {draft.type === "Event" ? "Event Studio" : "Package Studio"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-sm font-semibold hover:bg-white/20"
        >
          <X size={15} /> Close
        </button>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-nowrap overflow-x-auto scrollbar-none gap-2 pb-2">
          {stepsFor(draft.type, showAcademyStep).map((s) => (
            <button
              key={s.id}
              onClick={() => goTo(s.id)}
              className={`flex shrink-0 items-center transition-all duration-300 ${
                step === s.id
                  ? "gap-2 rounded-xl border border-vibe-violet bg-vibe-violet/5 px-3 py-2"
                  : "rounded-full border border-surface-border bg-white p-2 hover:bg-cream-300"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  step === s.id
                    ? "bg-vibe-violet text-white"
                    : maxStep > s.id
                    ? "bg-vibe-limeDark text-white"
                    : "bg-cream-300 text-ink-faint"
                }`}
              >
                {maxStep > s.id ? <Check size={12} /> : s.id}
              </span>
              {step === s.id && (
                <span className="animate-in fade-in slide-in-from-left-1 overflow-hidden whitespace-nowrap">
                  <p className="text-xs font-semibold leading-none text-ink">{s.label}</p>
                  <p className="mt-0.5 text-[10px] text-ink-faint">{s.hint}</p>
                </span>
              )}
            </button>
          ))}
        </div>

        {formError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-vibe-coral">
            {formError}
          </div>
        )}

        <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel sm:p-6">
          {step === 1 && (
            <PackageStep
              draft={draft}
              update={update}
              audience={audience}
              academyEnabled={canOfferAcademy ? academyEnabled : undefined}
              onToggleAcademy={canOfferAcademy ? setAcademyEnabled : undefined}
            />
          )}
          {step === 2 && <BookingStep draft={draft} update={update} />}
          {step === 3 && <DetailsStep draft={draft} update={update} audience={audience} />}
          {step === 4 && <LocationStep draft={draft} update={update} />}
          {step === 5 && <PricingStep draft={draft} update={update} audience={audience} />}
          {step === 6 && <LaunchStep draft={draft} update={update} />}
          {step === ACADEMY_STEP.id && showAcademyStep && (
            <AcademyStep academy={academy} setAcademy={setAcademy} listingCategories={draft.categories} />
          )}
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between border-t border-surface-border bg-white px-4 py-4 sm:px-8">
        <p className="text-xs text-ink-faint">
          Step {step === ACADEMY_STEP.id ? 7 : step} of {showAcademyStep ? 7 : 6}
        </p>
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s === ACADEMY_STEP.id ? 6 : s - 1))}
              className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-cream-300"
            >
              Back
            </button>
          )}
          <button onClick={onClose} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-cream-300">
            Cancel
          </button>
          <button
            onClick={handlePrimary}
            className="rounded-lg bg-vibe-violet px-5 py-2 text-sm font-semibold text-white hover:bg-vibe-violetSoft"
          >
            {step < lastStep
              ? "Save & Next"
              : mode === "edit"
                ? draft.type === "Event" ? "Update Event" : "Update Package"
                : draft.type === "Event" ? "Publish Event" : "Create Listing"}
          </button>
        </div>
      </div>
    </div>
  );
}
