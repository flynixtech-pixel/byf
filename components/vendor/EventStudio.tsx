"use client";

import { useRef, useState, useMemo, useEffect, useContext } from "react";
import { Check, Loader2, Plus, Trash2, Upload, X, Calendar, MapPin, Tag, Landmark, Sparkles, BookOpen, MoreVertical, CheckCircle2, ImagePlus, Image as ImageIcon, Lightbulb, Info, Pencil, Camera } from "lucide-react";
import { VendorAuthContext } from "@/components/providers/VendorAuthProvider";
import { uploadAdminImage, uploadVendorImage } from "@/lib/api/uploads";
import { ApiError } from "@/lib/api/client";
import { TimeField } from "./TimeField";
import { AiNameSuggestBot } from "./AiNameSuggestBot";
import { AiAddOnSuggestBot } from "./AiAddOnSuggestBot";
import { AiLaunchAutoFillCard } from "./AiLaunchAutoFillCard";
import { GeneratedLaunchDetails } from "@/lib/api/vendor";
import {
  AddOn,
  Coupon,
  ItineraryStop,
  Listing,
  ListingFAQ,
  ListingImage,
  PriceTier,
  DateOverride,
  TurfSlot,
} from "@/lib/types";

type Audience = "admin" | "vendor";

const STEPS = [
  { id: 1, label: "Event photos", hint: "Poster & banner" },
  { id: 2, label: "Location", hint: "Venue & category" },
  { id: 3, label: "Booking", hint: "Dates & timezone" },
  { id: 4, label: "Pricing", hint: "Rates & add-ons" },
  { id: 5, label: "Launch", hint: "Publish your event" },
] as const;

const EVENT_SUBCATEGORIES = [
  { id: "alcoholic-party", label: "Alcoholic Party" },
  { id: "non-alcoholic-party", label: "Non-Alcoholic Party" },
  { id: "business", label: "Business" },
  { id: "sports", label: "Sports" },
  { id: "performance", label: "Performance" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyListing(): Listing {
  const now = new Date();
  return {
    id: `byv-${now.getTime()}`,
    title: "",
    type: "Event",
    categories: ["Events"],
    subCategories: [],
    price: 0,
    listedOn: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    status: "Active",
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
    description: "",
    highlights: [],
    inclusions: [],
    exclusions: [],
    itinerary: [],
    faqs: [],
    tags: [],
    priceTiers: [],
    addOns: [],
    coupons: [],
    bookingType: "Recurring",
    availableFrom: todayISO(),
    availableTill: todayISO(),
    slotsPerDay: 1,
  };
}

type StepProps = {
  draft: Listing;
  update: <K extends keyof Listing>(key: K, value: Listing[K]) => void;
  updateMany: (patch: Partial<Listing>) => void;
};

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
          className={`px-3 py-1.5 ${
            value === opt.value ? "bg-ink text-white" : "bg-white text-ink-soft hover:bg-cream-300"
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
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (v: string[]) => void;
  tone?: "success" | "danger";
}) {
  const [input, setInput] = useState("");

  function add() {
    if (input.trim()) {
      onChange([...values, input.trim()]);
      setInput("");
    }
  }

  const pillTone =
    tone === "success"
      ? "bg-lime-100 text-vibe-limeDark"
      : tone === "danger"
      ? "bg-rose-100 text-vibe-coral"
      : "bg-vibe-violet/10 text-vibe-violet";

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
        <button type="button" onClick={add} className="shrink-0 rounded-lg bg-vibe-violet px-4 text-xs font-semibold text-white">
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((v, i) => (
            <span key={i} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${pillTone}`}>
              {v}
              <button type="button" onClick={() => onChange(values.filter((_, idx) => idx !== i))}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* --- JSON Price Tier Serializer/Parser --- */
interface PriceTierRow {
  id: string;
  type: string;
  amount: number;
  platformFee: number;
  gst: number;
  note: string;
}

function parsePriceTierLabel(tierLabel: string): { type: string; platformFee: number; gst: number; note: string } {
  try {
    if (tierLabel.startsWith("{")) {
      const parsed = JSON.parse(tierLabel);
      return {
        type: parsed.type || "",
        platformFee: typeof parsed.platformFee === "number" ? parsed.platformFee : 0,
        gst: typeof parsed.gst === "number" ? parsed.gst : 0,
        note: parsed.note || "",
      };
    }
  } catch (e) {
    // ignore
  }
  return { type: tierLabel, platformFee: 0, gst: 0, note: "" };
}

function serializePriceTierLabel(type: string, platformFee: number, gst: number, note: string): string {
  return JSON.stringify({ type, platformFee, gst, note });
}

/* --- JSON Schedule Serializer/Parser --- */
interface ScheduleRow {
  id: string;
  date: string;
  time: string;
  slots: number;
  note: string;
}

function parseScheduleLabel(label: string): { slots: number; note: string } {
  try {
    if (label.startsWith("{")) {
      const parsed = JSON.parse(label);
      return {
        slots: typeof parsed.slots === "number" ? parsed.slots : 10,
        note: parsed.note || "",
      };
    }
  } catch (e) {
    // ignore
  }
  const match = label.match(/^(.*)\s*\((\d+)\s*slots\)$/);
  if (match) {
    return { slots: parseInt(match[2]), note: match[1].trim() };
  }
  return { slots: 10, note: label || "" };
}

function serializeScheduleLabel(slots: number, note: string): string {
  return JSON.stringify({ slots, note });
}

function calculateEndTime(startTime: string): string {
  if (!startTime) return "11:00";
  const [hStr, mStr] = startTime.split(":");
  let h = parseInt(hStr);
  let m = parseInt(mStr);
  if (isNaN(h) || isNaN(m)) return "11:00";
  h = (h + 1) % 24;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  STEP 1 — EVENT PHOTOS                                             */
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
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

function EventPhotosStep({ draft, update, audience }: StepProps & { audience: Audience }) {
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoInputType, setVideoInputType] = useState<"paste" | "upload">(() => {
    if (draft.videoUrl?.includes("cloudinary") || draft.videoUrl?.match(/\.(mp4|mov|webm)/i)) {
      return "upload";
    }
    return "paste";
  });

  function uploadImage(file: File) {
    return audience === "admin" ? uploadAdminImage(file, "listings") : uploadVendorImage(file, "listings");
  }

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
      const results = await Promise.all(Array.from(files).map((f) => uploadImage(f)));
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
      const result = await uploadImage(file);
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

      <div className="mt-6 border-t border-slate-100 pt-6">
        <p className="mb-1 text-sm font-semibold text-ink font-sans">Event Video (Optional)</p>
        <p className="mb-3 text-xs text-ink-faint">
          Choose to either paste a YouTube/Vimeo link or upload an MP4 video file (max 2 MB).
        </p>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setVideoInputType("paste");
              update("videoUrl", "");
            }}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              videoInputType === "paste"
                ? "bg-vibe-violet text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Paste YouTube/Vimeo Link
          </button>
          <button
            type="button"
            onClick={() => {
              setVideoInputType("upload");
              update("videoUrl", "");
            }}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              videoInputType === "upload"
                ? "bg-vibe-violet text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Upload MP4 File
          </button>
        </div>

        {videoInputType === "paste" && (
          <div className="max-w-lg space-y-2">
            <FieldLabel>Paste Video URL</FieldLabel>
            <input
              type="text"
              value={draft.videoUrl || ""}
              onChange={(e) => update("videoUrl", e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              className={inputClass}
            />
          </div>
        )}

        {videoInputType === "upload" && (
          <div className="max-w-md space-y-2">
            <FieldLabel>Upload Video File</FieldLabel>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/*"
              className="hidden"
              id="video-upload-input"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                  setError("Video file is too large — max 2 MB");
                  return;
                }
                setError(null);
                setUploadingVideo(true);
                try {
                  const result = await uploadImage(file);
                  update("videoUrl", result.url);
                } catch (err) {
                  setError(err instanceof ApiError ? err.describe() : "Video upload failed");
                } finally {
                  setUploadingVideo(false);
                }
              }}
            />
            {uploadingVideo ? (
              <div className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Uploading Video...
              </div>
            ) : draft.videoUrl?.match(/\.(mp4|mov|webm)/i) || draft.videoUrl?.includes("cloudinary") ? (
              <div className="flex h-10 items-center justify-between rounded-lg border border-vibe-violet/20 bg-vibe-violet/5 px-3">
                <span className="truncate text-xs font-semibold text-vibe-violet">Video File Uploaded</span>
                <button
                  type="button"
                  onClick={() => update("videoUrl", "")}
                  className="text-xs text-vibe-coral underline hover:text-vibe-coral/80"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => document.getElementById("video-upload-input")?.click()}
                className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-surface-border bg-cream-200/50 text-xs font-semibold text-ink hover:bg-cream-200 transition"
              >
                <Upload size={13} /> Select MP4 file
              </button>
            )}
          </div>
        )}

        {draft.videoUrl && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Video Preview</p>
            <div className="aspect-video w-full max-w-lg overflow-hidden rounded-lg bg-black">
              {draft.videoUrl.includes("youtube.com") || draft.videoUrl.includes("youtu.be") ? (
                <iframe
                  src={getYouTubeEmbedUrl(draft.videoUrl)}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : draft.videoUrl.includes("vimeo.com") ? (
                <iframe
                  src={getVimeoEmbedUrl(draft.videoUrl)}
                  className="h-full w-full border-0"
                  allowFullScreen
                />
              ) : (
                <video src={draft.videoUrl} controls className="h-full w-full" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getYouTubeEmbedUrl(url: string): string {
  try {
    let videoId = "";
    if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1].split(/[?#]/)[0];
    } else if (url.includes("youtube.com/watch")) {
      const match = url.match(/[?&]v=([^&#]+)/);
      videoId = match ? match[1] : "";
    } else if (url.includes("youtube.com/embed/")) {
      videoId = url.split("youtube.com/embed/")[1].split(/[?#]/)[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  } catch {
    return url;
  }
}

function getVimeoEmbedUrl(url: string): string {
  try {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : url;
  } catch {
    return url;
  }
}

/* ------------------------------------------------------------------ */
/*  STEP 2 — LOCATION & CATEGORY                                      */
/* ------------------------------------------------------------------ */

function LocationStep({ draft, update, updateMany }: StepProps) {
  const [venueInput, setVenueInput] = useState(draft.address || "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [coords, setCoords] = useState<{ lat: string; lon: string } | null>(null);
  const [cityInput, setCityInput] = useState("");
  const venueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (venueRef.current && !venueRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (venueInput.length < 3) {
      setSuggestions([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setLoadingSuggestions(true);
      const cc = draft.country === "India" ? "in" : "in";
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          venueInput
        )}&countrycodes=${cc}&limit=5&addressdetails=1`,
        // Force the Referer header — see note in PackageStudio's identical call.
        { headers: { "Accept-Language": "en" }, referrerPolicy: "origin" }
      )
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setSuggestions(data);
          } else {
            setSuggestions([]);
          }
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoadingSuggestions(false));
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [venueInput, draft.country]);

  function handleSelectSuggestion(item: any) {
    const address = item.display_name;
    const lat = item.lat;
    const lon = item.lon;

    setVenueInput(address);
    setCoords({ lat, lon });
    setSuggestions([]);

    const patch: Partial<Listing> = { address };

    const addr = item.address;
    if (addr) {
      if (addr.state) {
        patch.state = addr.state;
      }
      if (addr.city || addr.town || addr.village || addr.suburb) {
        const cityName = addr.city || addr.town || addr.village || addr.suburb;
        if (draft.cityMode === "multiple") {
          patch.cities = [cityName];
        } else {
          patch.city = cityName;
        }
      }
    }
    updateMany(patch);
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
    : null;

  const currentSubCat = draft.categories[0] === "Events" ? (draft.subCategories[0] || "") : (draft.categories[0] || "");

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-[11px] font-semibold tracking-wider text-ink-faint uppercase font-sans">Basic Info</p>
        <p className="text-xs text-ink-faint">Name, location &amp; category details for this event.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <FieldLabel>Event Name *</FieldLabel>
            <AiNameSuggestBot
              type="Event"
              category={currentSubCat}
              venue={draft.address}
              onSelectName={(name) => update("title", name)}
            />
          </div>
          <input
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Sunday Trek Meetup"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative space-y-4">
          <div ref={venueRef} className="relative">
            <FieldLabel>Destination venue *</FieldLabel>
            <div className="relative">
              <input
                value={venueInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setVenueInput(val);
                  update("address", val);
                }}
                placeholder="Search venue (e.g. Urban Square Mall, Udaipur...)"
                className={inputClass}
              />
              {loadingSuggestions && (
                <span className="absolute right-3 top-3 text-[10px] text-ink-faint font-bold animate-pulse">Searching...</span>
              )}
            </div>

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
            <p className="mt-1.5 text-[11px] text-ink-faint">
              Type venue name to search or auto-fill coordinates, state, and city. Custom venue names are allowed.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
              <input
                value={draft.state}
                onChange={(e) => update("state", e.target.value)}
                className={inputClass}
                placeholder="Type state name"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <FieldLabel>Choose city *</FieldLabel>
              <ToggleGroup
                value={draft.cityMode ?? "single"}
                options={[
                  { value: "single", label: "Single city" },
                  { value: "multiple", label: "Multiple cities" },
                ]}
                onChange={(v) => {
                  update("cityMode", v);
                  if (v === "single") {
                    const firstCity = draft.cities?.[0] || draft.city || "";
                    updateMany({ city: firstCity, cities: [] });
                  } else {
                    if (draft.city && (!draft.cities || draft.cities.length === 0)) {
                      updateMany({ cities: [draft.city] });
                    }
                  }
                }}
              />
            </div>
            <div className="mb-2 flex flex-wrap gap-2">
              {draft.cityMode === "multiple"
                ? (draft.cities ?? []).map((c) => (
                    <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-vibe-violet/10 border border-vibe-violet/20 px-3 py-1 text-xs font-extrabold text-vibe-violet">
                      {c}
                      <button type="button" onClick={() => update("cities", (draft.cities ?? []).filter((x) => x !== c))} className="hover:text-rose-600 transition cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  ))
                : draft.city && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-vibe-violet/10 border border-vibe-violet/20 px-3 py-1 text-xs font-extrabold text-vibe-violet">
                      {draft.city}
                      <button type="button" onClick={() => update("city", "")} className="hover:text-rose-600 transition cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  )}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCity())}
                placeholder={draft.cityMode === "multiple" ? "Search or type city name and click + Add..." : "Search or type single city..."}
                className={inputClass}
              />
              {draft.cityMode === "multiple" ? (
                <button
                  type="button"
                  onClick={() => addCity()}
                  disabled={!cityInput.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-vibe-violet px-4 py-3 text-xs font-extrabold text-white shadow-xs hover:bg-vibe-violet/90 transition disabled:opacity-40 shrink-0 cursor-pointer"
                >
                  <Plus size={14} /> Add
                </button>
              ) : (
                cityInput.trim() && (
                  <button
                    type="button"
                    onClick={() => addCity()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-vibe-violet px-4 py-3 text-xs font-extrabold text-white shadow-xs hover:bg-vibe-violet/90 transition shrink-0 cursor-pointer"
                  >
                    Set City
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Live Map Preview */}
        <div className="rounded-xl border border-surface-border bg-cream-200/40 p-4 flex flex-col min-h-[300px]">
          <p className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase">Live map preview</p>
          <div className="flex-1 w-full rounded-xl overflow-hidden min-h-[200px] bg-cream-300 relative border border-slate-200 mt-2">
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
                <span>Map will appear here</span>
                <span className="text-[10px] mt-1">The map preview will appear here once you choose an exact destination.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid gap-5 sm:grid-cols-2 pt-4 border-t border-surface-border">
        <div className="rounded-xl border border-surface-border bg-vibe-violet/5 p-4 flex items-start gap-3">
          <Landmark className="text-vibe-violet shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-semibold text-ink">EVENT CATEGORY</p>
            <p className="text-base font-extrabold text-vibe-violet mt-1">Events</p>
            <p className="text-xs text-ink-faint mt-1 leading-normal">
              Event mode keeps the main category locked to Events while you choose the event sub-category.
            </p>
          </div>
        </div>

        <div>
          <FieldLabel>Category *</FieldLabel>
          <select
            value={currentSubCat}
            onChange={(e) => {
              const val = e.target.value;
              updateMany({
                categories: ["Events"],
                subCategories: [val],
              });
            }}
            className={inputClass}
          >
            <option value="">Select event sub-category</option>
            {EVENT_SUBCATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.label}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP 3 — BOOKING (SCHEDULE ROWS)                                  */
/* ------------------------------------------------------------------ */

function BookingStep({ draft, updateMany, vendorProfile }: StepProps & { vendorProfile: any }) {
  const [rows, setRows] = useState<ScheduleRow[]>(() => {
    const list: ScheduleRow[] = [];
    if (draft.dateOverrides && draft.dateOverrides.length > 0) {
      draft.dateOverrides.forEach((override, oIdx) => {
        const slots = override.slots || [];
        slots.forEach((slot, sIdx) => {
          const { slots: capacityCount, note } = parseScheduleLabel(slot.label);
          list.push({
            id: `sched-${oIdx}-${sIdx}-${Date.now()}`,
            date: override.date,
            time: slot.startTime,
            slots: capacityCount,
            note,
          });
        });
      });
    }
    if (list.length === 0) {
      list.push({
        id: `sched-init-${Date.now()}`,
        date: todayISO(),
        time: "10:00",
        slots: 10,
        note: "",
      });
    }
    return list;
  });

  const [timezone, setTimezone] = useState("India - Kolkata (Sat 20:42 • UTC +5:30)");

  const vendorName = useMemo(() => {
    if (!vendorProfile) return draft.ownerName || "Select vendor";
    return ("businessName" in vendorProfile
      ? (vendorProfile as any).businessName
      : ("holderName" in vendorProfile
        ? (vendorProfile as any).holderName
        : draft.ownerName || "Vendor"));
  }, [vendorProfile, draft.ownerName]);

  function syncRows(nextRows: ScheduleRow[]) {
    setRows(nextRows);

    const grouped: Record<string, ScheduleRow[]> = {};
    nextRows.forEach((r) => {
      if (!r.date) return;
      if (!grouped[r.date]) grouped[r.date] = [];
      grouped[r.date].push(r);
    });

    const dateOverrides: DateOverride[] = Object.keys(grouped).map((date) => ({
      date,
      isHoliday: false,
      holidayName: "",
      slots: grouped[date].map((row) => ({
        startTime: row.time || "10:00",
        endTime: calculateEndTime(row.time || "10:00"),
        label: serializeScheduleLabel(row.slots || 10, row.note || ""),
        price: 0,
        blocked: false,
      })),
    }));

    const sortedDates = nextRows.map((r) => r.date).filter(Boolean).sort();
    const availableFrom = sortedDates[0] || todayISO();
    const availableTill = sortedDates[sortedDates.length - 1] || todayISO();
    const capacity = nextRows.reduce((sum, r) => sum + (r.slots || 0), 0);

    updateMany({
      dateOverrides,
      slotsPerDay: nextRows.length,
      availableFrom,
      availableTill,
      capacity,
    });
  }

  function addRow() {
    const lastRow = rows[rows.length - 1];
    const nextRows = [
      ...rows,
      {
        id: `sched-${Date.now()}-${rows.length}`,
        date: lastRow ? lastRow.date : todayISO(),
        time: lastRow ? lastRow.time : "10:00",
        slots: lastRow ? lastRow.slots : 10,
        note: "",
      },
    ];
    syncRows(nextRows);
  }

  function updateRow(idx: number, patch: Partial<ScheduleRow>) {
    const nextRows = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    syncRows(nextRows);
  }

  function removeRow(idx: number) {
    if (rows.length === 1) return;
    const nextRows = rows.filter((_, i) => i !== idx);
    syncRows(nextRows);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-wider text-ink-faint uppercase font-sans">Booking setup</p>
          <p className="text-xs text-ink-faint">Configure timing schedule and tickets count for customers RSVP.</p>
        </div>
        <div className="rounded-full bg-vibe-violet/10 px-3 py-1 text-xs font-bold text-vibe-violet flex items-center gap-1">
          <Calendar size={13} /> Events • fixed dates and times
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Assigned Vendor *</FieldLabel>
          <input
            type="text"
            value={vendorName}
            className={`${inputClass} bg-cream-200/50 cursor-not-allowed`}
            disabled
          />
        </div>
        <div>
          <FieldLabel>Time Zone</FieldLabel>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass}>
            <option>India - Kolkata (Sat 20:42 • UTC +5:30)</option>
            <option>UTC (GMT +00:00)</option>
            <option>Eastern Time (EST • UTC -5:00)</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-surface-border p-4 bg-cream-200/20">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Event Schedules / Batches</p>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 rounded-lg bg-vibe-violet px-3 py-1.5 text-xs font-semibold text-white hover:bg-vibe-violet/90"
          >
            <Plus size={12} /> Add event
          </button>
        </div>

        <div className="space-y-3">
          <div className="hidden sm:grid grid-cols-[1.5fr_1.2fr_1fr_2fr_auto] gap-3 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <div>Date</div>
            <div>Time</div>
            <div>Slots</div>
            <div>Note / Location</div>
            <div className="w-8" />
          </div>

          {rows.map((row, idx) => (
            <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1.5fr_1.2fr_1fr_2fr_auto] gap-3 items-center border-b sm:border-0 border-surface-border pb-3 sm:pb-0">
              <div>
                <span className="sm:hidden block text-[10px] font-bold text-slate-500 mb-1">Date</span>
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(idx, { date: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <span className="sm:hidden block text-[10px] font-bold text-slate-500 mb-1">Time</span>
                <TimeField
                  value={row.time || "12:00"}
                  onChange={(next) => updateRow(idx, { time: next })}
                />
              </div>
              <div>
                <span className="sm:hidden block text-[10px] font-bold text-slate-500 mb-1">Slots</span>
                <input
                  type="number"
                  min="1"
                  value={row.slots === 0 ? "" : row.slots}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                    updateRow(idx, { slots: cleaned === "" ? 0 : parseInt(cleaned, 10) || 0 });
                  }}
                  className={inputClass}
                />
              </div>
              <div>
                <span className="sm:hidden block text-[10px] font-bold text-slate-500 mb-1">Note / Location</span>
                <input
                  value={row.note}
                  onChange={(e) => updateRow(idx, { note: e.target.value })}
                  placeholder="e.g. Goa, Batch 1"
                  className={inputClass}
                />
              </div>
              <div className="flex justify-end pt-3 sm:pt-0">
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  disabled={rows.length === 1}
                  className="rounded-lg p-2 text-ink-faint hover:text-vibe-coral disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STEP 4 — PRICING (PRICE TIERS, ADD-ONS, COUPONS)                  */
/* ------------------------------------------------------------------ */

function PricingStep({ draft, update, updateMany }: StepProps) {
  const category = draft.categories[0] === "Events" ? (draft.subCategories[0] || "") : (draft.categories[0] || "");
  const [priceTiers, setPriceTiers] = useState<PriceTierRow[]>(() => {
    const list = draft.priceTiers.map((t) => {
      const parsed = parsePriceTierLabel(t.label);
      return {
        id: t.id,
        type: parsed.type,
        amount: t.amount,
        platformFee: parsed.platformFee,
        gst: parsed.gst,
        note: parsed.note,
      };
    });
    if (list.length === 0) {
      list.push({
        id: `tier-init-${Date.now()}`,
        type: "Adult",
        amount: 2999,
        platformFee: 199,
        gst: 0,
        note: "",
      });
    }
    return list;
  });

  function syncPriceTiers(nextTiers: PriceTierRow[]) {
    setPriceTiers(nextTiers);

    const priceTiers: PriceTier[] = nextTiers.map((row) => ({
      id: row.id,
      label: serializePriceTierLabel(row.type, row.platformFee, row.gst, row.note),
      amount: row.amount || 0,
    }));

    const amounts = nextTiers.map((t) => t.amount).filter((a) => a > 0);
    const minPrice = amounts.length ? Math.min(...amounts) : 0;

    updateMany({
      priceTiers,
      price: minPrice,
    });
  }

  function addTier() {
    const next = [
      ...priceTiers,
      {
        id: `tier-${Date.now()}-${priceTiers.length}`,
        type: "",
        amount: 0,
        platformFee: 0,
        gst: 0,
        note: "",
      },
    ];
    syncPriceTiers(next);
  }

  function updateTier(idx: number, patch: Partial<PriceTierRow>) {
    const next = priceTiers.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    syncPriceTiers(next);
  }

  function removeTier(idx: number) {
    if (priceTiers.length === 1) return;
    const next = priceTiers.filter((_, i) => i !== idx);
    syncPriceTiers(next);
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
      <div>
        <p className="mb-1 text-[11px] font-semibold tracking-wider text-ink-faint uppercase font-sans">Pricing</p>
        <p className="text-xs text-ink-faint">Set ticket price and taxation details</p>
      </div>

      <div className="rounded-xl border border-surface-border p-4 bg-cream-200/20">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Ticket Tiers</p>
          <button
            type="button"
            onClick={addTier}
            className="inline-flex items-center gap-1.5 rounded-lg bg-vibe-violet px-3 py-1.5 text-xs font-semibold text-white hover:bg-vibe-violet/90"
          >
            <Plus size={12} /> Add price
          </button>
        </div>

        <div className="space-y-3">
          <div className="hidden sm:grid grid-cols-[1.5fr_1fr_1fr_2fr_auto] gap-3 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <div>Type</div>
            <div>Amount (₹)</div>
            <div>GST (%)</div>
            <div>Note (Optional)</div>
            <div className="w-8" />
          </div>

          {priceTiers.map((tier, idx) => (
            <div key={tier.id} className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr_2fr_auto] gap-3 items-center border-b sm:border-0 border-surface-border pb-3 sm:pb-0">
              <div>
                <span className="sm:hidden block text-[10px] font-bold text-slate-500 mb-1">Type</span>
                <input
                  value={tier.type}
                  onChange={(e) => updateTier(idx, { type: e.target.value })}
                  placeholder="e.g. Adult"
                  className={inputClass}
                />
              </div>
              <div>
                <span className="sm:hidden block text-[10px] font-bold text-slate-500 mb-1">Amount (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={tier.amount === 0 ? "" : tier.amount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                    updateTier(idx, { amount: cleaned === "" ? 0 : Number(cleaned) || 0 });
                  }}
                  className={inputClass}
                />
              </div>
              <div>
                <span className="sm:hidden block text-[10px] font-bold text-slate-500 mb-1">GST (%)</span>
                <select
                  value={tier.gst}
                  onChange={(e) => updateTier(idx, { gst: Number(e.target.value) })}
                  className={inputClass}
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                </select>
              </div>
              <div>
                <span className="sm:hidden block text-[10px] font-bold text-slate-500 mb-1">Note (Optional)</span>
                <input
                  value={tier.note}
                  onChange={(e) => updateTier(idx, { note: e.target.value })}
                  placeholder="e.g. for kids"
                  className={inputClass}
                />
              </div>
              <div className="flex justify-end pt-3 sm:pt-0">
                <button
                  type="button"
                  onClick={() => removeTier(idx)}
                  disabled={priceTiers.length === 1}
                  className="rounded-lg p-2 text-ink-faint hover:text-vibe-coral disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl2 border border-surface-border p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Add-ons</p>
              <p className="text-xs text-ink-faint">Optional extras with charges</p>
            </div>
            <AiAddOnSuggestBot
              type="Event"
              category={category}
              eventTitle={draft.title}
              venue={draft.address}
              onAddAddOn={(item) => {
                const next = [...addOns, { id: `ao-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, label: item.label, price: item.price }];
                update("addOns", next);
              }}
            />
          </div>
          <div className="space-y-3">
            {addOns.map((a, i) => (
              <div key={a.id} className="flex gap-2">
                <input
                  value={a.label}
                  onChange={(e) => updateAddOn(i, { label: e.target.value })}
                  placeholder="e.g. Breakfast, Hotel stay"
                  className={inputClass}
                />
                <input
                  type="number"
                  value={a.price === 0 ? "" : a.price}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                    updateAddOn(i, { price: cleaned === "" ? 0 : Number(cleaned) || 0 });
                  }}
                  placeholder="₹ Price"
                  className={`${inputClass} w-28`}
                />
                <button type="button" onClick={() => removeAddOn(i)} className="shrink-0 text-ink-faint hover:text-vibe-coral">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addAddOn} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-vibe-lime px-3 py-2 text-xs font-semibold text-vibe-indigo">
            <Plus size={13} /> Add extra
          </button>
        </div>

        <div className="rounded-xl2 border border-surface-border p-5">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Coupons &amp; Discounts</p>
            <button
              type="button"
              onClick={addCoupon}
              className="inline-flex items-center gap-1 rounded-full border border-vibe-violet px-3 py-1 text-xs font-semibold text-vibe-violet"
            >
              <Plus size={12} /> Add Coupon
            </button>
          </div>
          <p className="mb-4 text-xs text-ink-faint">Configure multiple promotional codes for this package</p>
          <p className="mb-2 text-[11px] font-semibold tracking-wider text-ink-faint uppercase font-sans">Active Coupons</p>
          {coupons.length === 0 ? (
            <p className="rounded-lg bg-cream-200/60 px-3 py-3 text-xs text-ink-faint">
              No coupons have been configured yet. Click Add Coupon to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {coupons.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2">
                  <input
                    value={c.code}
                    onChange={(e) => updateCoupon(i, { code: e.target.value.toUpperCase() })}
                    placeholder="CODE20"
                    className={inputClass}
                  />
                  <div className="flex shrink-0 items-center gap-1">
                    <input
                      type="number"
                      value={c.discountPercent === 0 ? "" : c.discountPercent}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                        updateCoupon(i, { discountPercent: cleaned === "" ? 0 : Number(cleaned) || 0 });
                      }}
                      className={`${inputClass} w-16`}
                    />
                    <span className="text-xs text-ink-faint">%</span>
                  </div>
                  <button type="button" onClick={() => removeCoupon(i)} className="text-ink-faint hover:text-vibe-coral">
                    <X size={16} />
                  </button>
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
/*  STEP 5 — LAUNCH (DESCRIPTION, HIGHLIGHTS, FAQS, ITINERARY)        */
/* ------------------------------------------------------------------ */

function LaunchStep({ draft, update, updateMany }: StepProps) {
  const category = draft.categories[0] === "Events" ? (draft.subCategories[0] || "") : (draft.categories[0] || "");

  function handleApplyLaunchDetails(data: GeneratedLaunchDetails) {
    updateMany({
      description: data.description || draft.description,
      inclusions: data.inclusions.length > 0 ? data.inclusions : draft.inclusions,
      exclusions: data.exclusions.length > 0 ? data.exclusions : draft.exclusions,
      highlights: data.highlights.length > 0 ? data.highlights : draft.highlights,
      tags: data.tags.length > 0 ? data.tags : draft.tags,
      faqs: data.faqs.length > 0 ? data.faqs : draft.faqs,
    });
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
      <AiLaunchAutoFillCard
        type="Event"
        eventTitle={draft.title}
        category={category}
        venue={draft.address}
        onApplyLaunchDetails={handleApplyLaunchDetails}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-wider text-ink-faint uppercase font-sans">Visibility &amp; publishing</p>
          <p className="text-xs text-ink-faint">Choose how this event should appear before you go live</p>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-wider text-ink-faint uppercase font-sans">Private</p>
            <ToggleGroup
              value={draft.isPrivate ? "On" : "Off"}
              options={[
                { value: "Off", label: "Off" },
                { value: "On", label: "On" },
              ]}
              onChange={(v) => update("isPrivate", v === "On")}
            />
          </div>
        </div>
      </div>

      <div>
        <FieldLabel>Description *</FieldLabel>
        <textarea
          rows={5}
          value={draft.description}
          onChange={(e) => update("description", e.target.value)}
          className={inputClass}
          placeholder="Describe your event — what makes it special, who it's for, and what guests can expect."
        />
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold tracking-wider text-ink-faint uppercase font-sans">What&apos;s Included &amp; Excluded</p>
        <p className="mb-3 text-xs text-ink-faint">Included items in ticket price, and what is not.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <TagField
            label="What's Included"
            placeholder="e.g. Professional guide, Refreshments"
            values={draft.inclusions}
            onChange={(v) => update("inclusions", v)}
            tone="success"
          />
          <TagField
            label="What's Excluded"
            placeholder="e.g. Personal gear, Transport"
            values={draft.exclusions}
            onChange={(v) => update("exclusions", v)}
            tone="danger"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TagField
          label="Highlights"
          placeholder="e.g. Stunning sunset views, Live music"
          values={draft.highlights}
          onChange={(v) => update("highlights", v)}
        />
        <TagField
          label="Tags"
          placeholder="e.g. adventure, trekking, camping"
          values={draft.tags}
          onChange={(v) => update("tags", v)}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl2 border border-surface-border p-5">
          <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
            <BookOpen size={16} className="text-vibe-violet" /> FAQs *
          </p>
          <p className="mb-4 text-xs text-ink-faint font-sans">Common questions &amp; answers</p>
          <div className="space-y-4">
            {draft.faqs.map((f, i) => (
              <div key={i} className="rounded-lg border border-surface-border p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <FieldLabel>Question</FieldLabel>
                  <button type="button" onClick={() => removeFaq(i)} className="text-ink-faint hover:text-vibe-coral">
                    <X size={14} />
                  </button>
                </div>
                <input value={f.question} onChange={(e) => updateFaq(i, { question: e.target.value })} className={`${inputClass} mb-2`} />
                <FieldLabel>Answer</FieldLabel>
                <input value={f.answer} onChange={(e) => updateFaq(i, { answer: e.target.value })} className={inputClass} />
              </div>
            ))}
          </div>
          <button type="button" onClick={addFaq} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-vibe-lime px-3 py-2 text-xs font-semibold text-vibe-indigo">
            <Plus size={13} /> Add FAQ
          </button>
        </div>

        <div className="rounded-xl2 border border-surface-border p-5">
          <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
            <Sparkles size={16} className="text-vibe-limeDark" /> Itinerary
          </p>
          <p className="mb-4 text-xs text-ink-faint font-sans">Day-by-day plan</p>
          <div className="space-y-4">
            {draft.itinerary.map((s, i) => (
              <div key={i} className="rounded-lg border border-surface-border p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">Day {s.day}</p>
                  <button type="button" onClick={() => removeDay(i)} className="text-ink-faint hover:text-vibe-coral">
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
          <button type="button" onClick={addDay} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-vibe-lime px-3 py-2 text-xs font-semibold text-vibe-indigo">
            <Plus size={13} /> Add day
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EVENT STUDIO WIZARD                                               */
/* ------------------------------------------------------------------ */

export function EventStudio({
  mode,
  initialListing,
  audience = "vendor",
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  initialListing?: Listing;
  audience?: Audience;
  onClose: () => void;
  onSave: (listing: Listing) => void;
}) {
  const [draft, setDraft] = useState<Listing>(() => initialListing ?? emptyListing());
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const vendorAuth = useContext(VendorAuthContext);
  const resolvedVendor = vendorAuth?.vendor || vendorProfile;

  useEffect(() => {
    import("@/lib/api/auth").then((auth) => {
      auth.restoreVendorSession().then((profile) => {
        if (profile) {
          setVendorProfile(profile);
        }
      });
    });
  }, []);

  function update<K extends keyof Listing>(key: K, value: Listing[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function updateMany(patch: Partial<Listing>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function goTo(s: number) {
    setStep(s);
    setMaxStep((m) => Math.max(m, s));
  }

  function handlePrimary() {
    if (step < 5) {
      goTo(step + 1);
      return;
    }

    const profileName = vendorProfile
      ? ("businessName" in vendorProfile
        ? (vendorProfile as any).businessName
        : ("holderName" in vendorProfile
          ? (vendorProfile as any).holderName
          : ""))
      : "";

    const finalTitle = draft.title.trim() || profileName || "New Event";
    const finalDraft = {
      ...draft,
      title: finalTitle,
      coverImage: draft.images[0]?.url ? draft.images[0].url : undefined,
    };

    if (finalDraft.categories.length === 0 || !finalDraft.categories[0] || finalDraft.categories[0] === "") {
      setFormError("Choose a category sub-category.");
      goTo(2); // Location step
      return;
    }
    const hasCity = finalDraft.cityMode === "multiple" ? (finalDraft.cities?.length ?? 0) > 0 : finalDraft.city.trim().length > 0;
    if (!hasCity) {
      setFormError("Choose at least one city.");
      goTo(2); // Location step
      return;
    }
    if (!finalDraft.description.trim()) {
      setFormError("Add a description before publishing.");
      goTo(5); // Launch step
      return;
    }

    setFormError(null);
    onSave(finalDraft);
  }

  const stepProps: StepProps = { draft, update, updateMany };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-cream-200">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-vibe-indigo via-vibe-violet to-vibe-violetSoft px-4 py-4 text-white shadow-pop sm:px-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
            {mode === "edit" ? "Edit Event" : "New Event"}
          </p>
          <h2 className="font-display text-lg font-semibold sm:text-xl">
            Event Studio
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-sm font-semibold hover:bg-white/20"
        >
          <X size={15} /> Close
        </button>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(s.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                step === s.id ? "border-vibe-violet bg-vibe-violet/5" : "border-surface-border bg-white hover:bg-cream-300"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  step === s.id ? "bg-vibe-violet text-white" : maxStep > s.id ? "bg-vibe-limeDark text-white" : "bg-cream-300 text-ink-faint"
                }`}
              >
                {maxStep > s.id ? <Check size={12} /> : s.id}
              </span>
              <span>
                <p className="text-xs font-semibold leading-none text-ink">{s.label}</p>
                <p className="mt-0.5 text-[10px] text-ink-faint">{s.hint}</p>
              </span>
            </button>
          ))}
        </div>

        {formError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-vibe-coral">
            {formError}
          </div>
        )}

        <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel sm:p-6">
          {step === 1 && <EventPhotosStep draft={draft} update={update} updateMany={updateMany} audience={audience} />}
          {step === 2 && <LocationStep draft={draft} update={update} updateMany={updateMany} />}
          {step === 3 && <BookingStep draft={draft} update={update} updateMany={updateMany} vendorProfile={resolvedVendor} />}
          {step === 4 && <PricingStep draft={draft} update={update} updateMany={updateMany} />}
          {step === 5 && <LaunchStep draft={draft} update={update} updateMany={updateMany} />}
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between border-t border-surface-border bg-white px-4 py-4 sm:px-8">
        <p className="text-xs text-ink-faint">Step {step} of 5</p>
        <div className="flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-cream-300"
            >
              Back
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-cream-300">
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrimary}
            className="rounded-lg bg-vibe-violet px-5 py-2 text-sm font-semibold text-white hover:bg-vibe-violetSoft"
          >
            {step < 5
              ? "Save & Next"
              : mode === "edit"
              ? "Update Event"
              : "Publish Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
