"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Camera, ClipboardList, FileText, Pencil, Plus,
  LayoutGrid, Clock as ClockIcon, ChevronDown, X,
  Ban, BookOpen, Pause, Clock3, CalendarDays, Phone, User, CalendarCheck, Check,
  Video, Loader2, Upload, MapPin, ChevronLeft, ChevronRight
} from "lucide-react";
import { Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { PackageStudio } from "@/components/vendor/PackageStudio";
import { EventStudio } from "@/components/vendor/EventStudio";
import { ClockSlotsWidget } from "@/components/vendor/ClockSlotsWidget";
import { uploadVendorImage } from "@/lib/api/uploads";
import { Listing, ListingImage } from "@/lib/types";
import {
  getVendorListingById, updateVendorListing,
  getVendorBookings, createVendorBooking,
} from "@/lib/api/vendor";
import { apiListingToMock, mockListingToApiInput } from "@/lib/api/listingAdapter";
import { getVenueById, getListingImage } from "@/lib/api/venues";
import { ApiError } from "@/lib/api/client";
import type { Booking } from "@/lib/api/types";
import { categoryLabel } from "@/lib/taxonomy";

type Tab = "overview" | "registrations" | "agenda" | "media";

const TYPE_TONE: Record<Listing["type"], "info" | "success" | "pending"> = {
  Turf: "info",
  Game: "success",
  Event: "pending",
};

const parseTime = (t: string) => {
  if (!t) return 0;
  const match12 = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const isPM = match12[3].toUpperCase() === "PM";
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return h * 60 + m;
  }
  const match24 = t.match(/(\d+):(\d+)/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }
  return 0;
};

const formatTime = (t: string) => {
  const mins = parseTime(t);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const isPM = h >= 12;
  const displayH = h % 12 || 12;
  return `${displayH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${isPM ? "PM" : "AM"}`;
};

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | undefined>(undefined);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [studioOpen, setStudioOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let currentTitle = "";
    getVendorListingById(params.id)
      .then((l) => {
        const mock = apiListingToMock(l);
        currentTitle = mock.title;
        setListing(mock);
        return getVendorBookings();
      })
      .then((res) => {
        if (res && res.items) {
          const listingBookings = res.items.filter(b => b.listingTitle === currentTitle || b.listingId === params.id);
          setBookings(listingBookings);
        }
      })
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load listing"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="rounded-xl2 border border-dashed border-surface-border bg-white py-16 text-center">
        <p className="text-sm text-ink-faint">Loading listing...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="rounded-xl2 border border-dashed border-surface-border bg-white py-16 text-center">
        <p className="text-sm text-ink-faint">Listing not found.</p>
        <Link href="/vendor/listings" className="mt-3 inline-block text-sm font-semibold text-vibe-violet">
          Back to Listings
        </Link>
      </div>
    );
  }

  async function replaceImage(index: number, file: File) {
    try {
      const { url } = await uploadVendorImage(file, "listings");
      const saved = await updateVendorListing(listing!.id, {
        images: [...listing!.images, { id: `img-${Date.now()}`, url, label: "Gallery Photo" }]
      });
      setListing(apiListingToMock(saved));
      setToast("Photo added to gallery");
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to update photo");
    }
  }

  async function saveVideo(videoUrl: string) {
    try {
      const saved = await updateVendorListing(listing!.id, { videoUrl });
      setListing(apiListingToMock(saved));
      setToast("Video saved — it's now live on your event page.");
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to update video");
    }
  }

  async function handleStudioSave(updated: Listing) {
    try {
      const saved = await updateVendorListing(updated.id, mockListingToApiInput(updated));
      setListing(apiListingToMock(saved));
      setStudioOpen(false);
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to update listing");
    }
  }

  const allImages = [
    listing.posterImage,
    listing.bannerImage,
    ...(listing.universalImages || []),
    ...listing.images
  ].filter(Boolean) as ListingImage[];

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <StudioSidebar listing={listing} tab={tab} onTabChange={setTab} />

      <div className="min-w-0 flex-1 space-y-5">
        <Link href="/vendor/listings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-vibe-violet">
          <ArrowLeft size={15} /> Back to Listings
        </Link>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-xl2 border border-surface-border bg-white p-4 shadow-panel sm:p-5">
              <div>
                <h1 className="text-xl font-bold text-ink sm:text-2xl">{listing.title}</h1>
                <div className="mt-1 flex items-center gap-2 text-sm text-ink-faint">
                  <MapPin size={14} /> {listing.city}, {listing.state}
                </div>
              </div>
              <button
                onClick={() => setStudioOpen(true)}
                className="rounded-lg bg-vibe-violet px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-vibe-violet-dark"
              >
                Edit Package
              </button>
            </div>

            <div className="rounded-[1.25rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50/50 border-b border-slate-100 px-5 py-3.5">
                <h2 className="text-sm font-bold text-slate-800">Basic Info</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
                <InfoField label="Type">
                  <p className="font-semibold text-slate-800">{listing.type}</p>
                </InfoField>
                <InfoField label="Categories">
                  <div className="flex flex-wrap gap-1">
                    {listing.categories.map((c) => (
                      <Badge key={c} tone="neutral" className="!text-[10px] !px-1.5 !py-0.5">
                        {categoryLabel(c)}
                      </Badge>
                    ))}
                  </div>
                </InfoField>
                <InfoField label="Base Price">
                  <p className="font-semibold text-slate-800">₹{listing.price}</p>
                </InfoField>
                <InfoField label="Status">
                  <Badge tone={listing.status === "Active" ? "success" : "neutral"} className="!text-[10px] !px-1.5 !py-0.5">
                    {listing.status}
                  </Badge>
                </InfoField>
              </div>
              
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5 border-t border-slate-100">
                <InfoField label="Open Time">
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <ClockIcon size={13} className="text-vibe-violet" /> 
                    {(() => {
                      let t = listing.reportingStartTime;
                      if (listing.slotsList && listing.slotsList.length > 0) {
                        let earliest = listing.slotsList[0].startTime;
                        let earliestMins = parseTime(earliest);
                        for (const s of listing.slotsList) {
                          const m = parseTime(s.startTime);
                          if (m < earliestMins) { earliestMins = m; earliest = s.startTime; }
                        }
                        if (earliest) t = formatTime(earliest);
                      }
                      return t || "N/A";
                    })()}
                  </p>
                </InfoField>
                <InfoField label="Close Time">
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Clock3 size={13} className="text-vibe-violet" /> 
                    {(() => {
                      let t = listing.reportingEndTime;
                      if (listing.slotsList && listing.slotsList.length > 0) {
                        let latest = listing.slotsList[0].endTime;
                        let latestMins = parseTime(latest);
                        for (const s of listing.slotsList) {
                          const m = parseTime(s.endTime);
                          if (m > latestMins) { latestMins = m; latest = s.endTime; }
                        }
                        if (latest) t = formatTime(latest);
                      }
                      return t || "N/A";
                    })()}
                  </p>
                </InfoField>
                <InfoField label={listing.type === "Turf" ? "Slots Booked" : "Bookings"}>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Check size={14} className="text-emerald-500" />
                    {bookings.filter(b => b.status !== "Cancelled").length}
                  </p>
                </InfoField>
                {listing.type !== "Turf" && (
                  <InfoField label="Tickets Sold">
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <User size={14} className="text-indigo-500" />
                      {bookings.filter(b => b.status !== "Cancelled").reduce((sum, b) => sum + (b.numberOfPlayers || 1), 0)}
                    </p>
                  </InfoField>
                )}
                {listing.type === "Turf" && (
                  <InfoField label="Total Slots">
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <LayoutGrid size={14} className="text-blue-500" />
                      {listing.slotsList?.length || 0}
                    </p>
                  </InfoField>
                )}
              </div>
            </div>

            <div>
              <p className="mb-1 text-sm font-semibold text-ink">Photos</p>
              <p className="mb-3 text-xs text-ink-faint">Poster, banner and gallery photos shown alongside your video.</p>
              <ImageGallery allImages={allImages} onReplace={replaceImage} />
            </div>
          </div>
        )}
        {tab === "agenda" && <AgendaTab listing={listing} onSeeBookings={() => setTab("registrations")} />}
        {tab === "media" && <MediaTab listing={listing} onSaveVideo={saveVideo} onReplaceImage={replaceImage} />}
        {tab === "registrations" && <RegistrationsTab listing={listing} bookings={bookings} />}
      </div>

      {studioOpen && (
        listing.type === "Event" ? (
          <EventStudio mode="edit" initialListing={listing} onClose={() => setStudioOpen(false)} onSave={handleStudioSave} />
        ) : (
          <PackageStudio mode="edit" initialListing={listing} onClose={() => setStudioOpen(false)} onSave={handleStudioSave} />
        )
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function StudioSidebar({
  listing,
  tab,
  onTabChange,
}: {
  listing: Listing;
  tab: Tab;
  onTabChange: (t: Tab) => void;
}) {
  const cover = getListingImage(listing, "poster");
  return (
    <aside className="w-full shrink-0 lg:w-72">
      <div className="overflow-hidden rounded-xl2 border border-surface-border bg-white shadow-panel">
        <div className="relative h-28">
          {cover && <img src={cover} alt={listing.title} className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute left-2 top-2">
            <Badge tone={listing.status === "Active" ? "success" : "neutral"}>{listing.status}</Badge>
          </div>
          <div className="absolute bottom-2 left-3 right-3">
            <p className="truncate text-sm font-semibold leading-tight text-white">{listing.title}</p>
            <p className="text-[11px] text-white/70">
              {listing.city}, {listing.state}
            </p>
          </div>
        </div>

        <div className="p-3">
          <p className="mb-2 px-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Pages</p>
          <nav className="space-y-1">
            <SidebarNavItem
              icon={<FileText size={15} />}
              label="Package Overview"
              hint={tab === "overview" ? "Current page" : "Open section"}
              active={tab === "overview"}
              onClick={() => onTabChange("overview")}
            />
            {listing.type === "Turf" && (
              <SidebarNavItem
                icon={<CalendarCheck size={15} />}
                label="Today's Agenda"
                hint={tab === "agenda" ? "Current page" : "Slot booking management"}
                active={tab === "agenda"}
                onClick={() => onTabChange("agenda")}
              />
            )}
            {listing.type === "Event" && (
              <SidebarNavItem
                icon={<Video size={15} />}
                label="Video & Media"
                hint={tab === "media" ? "Current page" : "Background video & photos"}
                active={tab === "media"}
                onClick={() => onTabChange("media")}
              />
            )}
            <SidebarNavItem
              icon={<ClipboardList size={15} />}
              label="Registrations"
              hint={tab === "registrations" ? "Current page" : "Open section"}
              active={tab === "registrations"}
              onClick={() => onTabChange("registrations")}
            />
          </nav>
        </div>
      </div>
    </aside>
  );
}

function SidebarNavItem({
  icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors ${
        active ? "bg-vibe-violet/10 text-vibe-violet" : "text-ink-soft hover:bg-cream-300"
      }`}
    >
      <span className={active ? "text-vibe-violet" : "text-ink-faint"}>{icon}</span>
      <span>
        <p className="text-sm font-semibold leading-none">{label}</p>
        <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>
      </span>
    </button>
  );
}

const videoInputClass =
  "w-full rounded-lg border border-surface-border bg-cream-200/40 px-3 py-2.5 text-sm outline-none focus:border-vibe-violet placeholder:text-ink-faint";

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

function MediaTab({
  listing,
  onSaveVideo,
  onReplaceImage,
}: {
  listing: Listing;
  onSaveVideo: (videoUrl: string) => Promise<void>;
  onReplaceImage: (index: number, file: File) => void;
}) {
  const [videoInputType, setVideoInputType] = useState<"paste" | "upload">(() =>
    listing.videoUrl?.includes("cloudinary") || listing.videoUrl?.match(/\.(mp4|mov|webm)/i) ? "upload" : "paste"
  );
  const [videoUrl, setVideoUrl] = useState(listing.videoUrl || "");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVideoUrl(listing.videoUrl || "");
  }, [listing.videoUrl]);

  const dirty = videoUrl !== (listing.videoUrl || "");

  async function handleVideoFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Video file is too large — max 2 MB");
      return;
    }
    setError(null);
    setUploadingVideo(true);
    try {
      const { url } = await uploadVendorImage(file, "listings");
      setVideoUrl(url);
      await onSaveVideo(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Video upload failed");
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handleSaveClick() {
    setSavingVideo(true);
    setError(null);
    try {
      await onSaveVideo(videoUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Failed to save video");
    } finally {
      setSavingVideo(false);
    }
  }

  async function handleRemove() {
    setVideoUrl("");
    setError(null);
    setSavingVideo(true);
    try {
      await onSaveVideo("");
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Failed to remove video");
    } finally {
      setSavingVideo(false);
    }
  }

  const hasUploadedVideo = videoUrl.match(/\.(mp4|mov|webm)/i) || videoUrl.includes("cloudinary");
  const allImages = [listing.posterImage, listing.bannerImage, ...(listing.universalImages ?? []), ...listing.images].filter(Boolean) as ListingImage[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">Video &amp; Media</h1>
        <p className="mt-0.5 text-xs text-ink-faint">
          Add a background video and manage the photos guests see on your event page.
        </p>
      </div>

      <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
        <p className="mb-1 text-sm font-semibold text-ink">Background Video</p>
        <p className="mb-4 text-xs text-ink-faint">Paste a YouTube/Vimeo link or upload an MP4 file (max 2 MB).</p>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-vibe-coral">{error}</div>
        )}

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setVideoInputType("paste")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              videoInputType === "paste" ? "bg-vibe-violet text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Paste YouTube/Vimeo Link
          </button>
          <button
            type="button"
            onClick={() => setVideoInputType("upload")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              videoInputType === "upload" ? "bg-vibe-violet text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Upload MP4 File
          </button>
        </div>

        {videoInputType === "paste" ? (
          <div className="max-w-lg space-y-2">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              className={videoInputClass}
            />
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={!dirty || savingVideo}
              className="inline-flex items-center gap-1.5 rounded-lg bg-vibe-violet px-4 py-2 text-xs font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-50"
            >
              {savingVideo && <Loader2 size={13} className="animate-spin" />}
              {savingVideo ? "Saving..." : "Save Video"}
            </button>
          </div>
        ) : (
          <div className="max-w-md space-y-2">
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/*"
              className="hidden"
              id="media-tab-video-input"
              onChange={(e) => {
                handleVideoFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {uploadingVideo ? (
              <div className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Uploading Video...
              </div>
            ) : hasUploadedVideo ? (
              <div className="flex h-10 items-center justify-between rounded-lg border border-vibe-violet/20 bg-vibe-violet/5 px-3">
                <span className="truncate text-xs font-semibold text-vibe-violet">Video file uploaded</span>
                <button type="button" onClick={handleRemove} className="text-xs text-vibe-coral underline hover:text-vibe-coral/80">
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => document.getElementById("media-tab-video-input")?.click()}
                className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-surface-border bg-cream-200/50 text-xs font-semibold text-ink hover:bg-cream-200 transition"
              >
                <Upload size={13} /> Select MP4 file
              </button>
            )}
          </div>
        )}

        {videoUrl && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Video Preview</p>
            <div className="aspect-video w-full max-w-lg overflow-hidden rounded-lg bg-black">
              {videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") ? (
                <iframe
                  src={getYouTubeEmbedUrl(videoUrl)}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : videoUrl.includes("vimeo.com") ? (
                <iframe src={getVimeoEmbedUrl(videoUrl)} className="h-full w-full border-0" allowFullScreen />
              ) : (
                <video src={videoUrl} controls className="h-full w-full" />
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold text-ink">Photos</p>
        <p className="mb-3 text-xs text-ink-faint">Poster, banner and gallery photos shown alongside your video.</p>
        <ImageGallery allImages={allImages} onReplace={onReplaceImage} />
      </div>
    </div>
  );
}

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-center rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition hover:shadow-md">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function ImageGallery({
  allImages,
  onReplace,
}: {
  allImages: ListingImage[];
  onReplace: (index: number, file: File) => void;
}) {
  const [active, setActive] = useState(0);
  const addInput = useRef<HTMLInputElement | null>(null);

  const activeImage = allImages[active] ?? allImages[0];

  const handlePrev = () => setActive((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  const handleNext = () => setActive((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));

  return (
    <div className="rounded-[1.25rem] border border-slate-100 bg-white p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row gap-3 sm:gap-4">
      {/* Main Large Image Slider */}
      <div className="relative w-full h-52 sm:h-64 sm:w-2/3 shrink-0 overflow-hidden rounded-xl bg-slate-50 shadow-inner group border border-slate-100">
        {activeImage ? (
          <>
            <img src={activeImage.url} alt={activeImage.label} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" decoding="async" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#110826]/70 via-transparent to-transparent pointer-events-none" />
            
            {/* Left/Right Controls */}
            {allImages.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 hover:bg-white/40 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 hover:bg-white/40 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Bottom Info: Label and Indicator */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
               <span className="bg-black/40 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-md border border-white/10 shadow-sm inline-flex">
                  {activeImage.label || "Gallery Photo"}
               </span>
               {allImages.length > 1 && (
                 <div className="flex gap-1 bg-black/40 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/10">
                   {allImages.map((_, i) => (
                     <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-3 bg-white" : "w-1.5 bg-white/40"}`} />
                   ))}
                 </div>
               )}
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Camera size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">No photos yet</p>
              <p className="mt-1 text-[11px] text-slate-500">Upload a poster or gallery images</p>
            </div>
          </div>
        )}
      </div>

      {/* Premium Small Thumbnails Row/Column */}
      <div className="flex sm:flex-col flex-1 gap-2 overflow-x-auto sm:overflow-y-auto pb-1 sm:pb-0 scrollbar-none items-start content-start">
        {allImages.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setActive(i)}
            className={`relative h-14 w-16 sm:h-16 sm:w-full shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-300 ${
              i === active ? "border-vibe-violet shadow-md ring-2 ring-vibe-violet/20 z-10" : "border-transparent opacity-60 hover:opacity-100 hover:scale-[0.98] bg-slate-50"
            }`}
          >
            <img src={img.url} alt={img.label} className="h-full w-full object-cover" loading="lazy" decoding="async" />
          </button>
        ))}
        <button
          onClick={() => addInput.current?.click()}
          className="flex h-14 w-16 sm:h-16 sm:w-full shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 text-slate-400 hover:border-vibe-violet/50 hover:bg-vibe-violet/5 hover:text-vibe-violet transition-colors shadow-sm"
          title="Add Photo"
        >
          <Plus size={18} />
          <span className="text-[9px] font-semibold mt-1 hidden sm:block">Add Photo</span>
        </button>
      </div>

      <input
        ref={addInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onReplace(active, file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function TagsCard({
  title,
  items,
  tone,
  pillStyle,
}: {
  title: string;
  items: string[];
  tone?: "success" | "danger";
  pillStyle?: boolean;
}) {
  const textTone = tone === "success" ? "text-vibe-limeDark" : tone === "danger" ? "text-vibe-coral" : "text-ink-soft";

  return (
    <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{title}</p>

      {pillStyle ? (
        <div className="flex flex-wrap gap-2">
          {items.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-vibe-violet/10 px-2.5 py-1 text-xs font-medium text-vibe-violet">
              {t}
            </span>
          ))}
          {items.length === 0 && <p className="text-xs text-ink-faint">Nothing added yet.</p>}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((t, i) => (
            <li key={i} className={`flex items-center gap-2 text-sm ${textTone}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {t}
            </li>
          ))}
          {items.length === 0 && <p className="text-xs text-ink-faint">Nothing added yet.</p>}
        </ul>
      )}
    </div>
  );
}

function ItineraryCard({ stops }: { stops: Listing["itinerary"] }) {
  return (
    <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Itinerary</p>
      <div className="space-y-3">
        {stops.map((s, i) => (
          <div key={i} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-vibe-violet/10 text-xs font-semibold text-vibe-violet">
              {s.day}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{s.title}</p>
              <p className="mt-0.5 text-xs text-ink-faint">{s.description}</p>
            </div>
          </div>
        ))}
        {stops.length === 0 && <p className="text-xs text-ink-faint">No itinerary added yet.</p>}
      </div>
    </div>
  );
}

function FaqCard({ faqs }: { faqs: Listing["faqs"] }) {
  return (
    <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">FAQs</p>
      <div className="space-y-4">
        {faqs.map((f, i) => (
          <div key={i}>
            <p className="text-sm font-semibold text-ink">{f.question}</p>
            <p className="mt-0.5 text-xs text-ink-faint">{f.answer}</p>
          </div>
        ))}
        {faqs.length === 0 && <p className="text-xs text-ink-faint">No FAQs added yet.</p>}
      </div>
    </div>
  );
}

function RegistrationsTab({ listing, bookings }: { listing: Listing; bookings: Booking[] }) {
  const [filterStatus, setFilterStatus] = useState<string>("All");

  const filtered = bookings.filter(b => filterStatus === "All" || b.status === filterStatus);
  const totalEarnings = bookings.filter(b => b.status !== "Cancelled").reduce((sum, b) => sum + b.totalAmount, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">Registrations</h1>
        <p className="mt-0.5 text-xs text-ink-faint">Manage all bookings for {listing.title}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total Bookings" value={bookings.length.toString()} hint="All time bookings" />
        <StatTile label="Confirmed" value={bookings.filter(b => b.status === "Confirmed").length.toString()} hint="Fully paid and confirmed" />
        <StatTile label="Part Paid" value={bookings.filter(b => b.status === "Part Paid" || b.paymentType === "partial").length.toString()} hint="Requires pending payment" />
        <StatTile label="Total Earnings" value={`₹${totalEarnings}`} hint="Total value generated" />
      </div>

      <div className="bg-white border border-slate-100 shadow-sm rounded-[1.25rem] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Booking History</h2>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:border-vibe-violet outline-none bg-white text-slate-700 font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Part Paid">Part Paid</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        
        {filtered.length === 0 ? (
           <div className="py-16 text-center text-xs text-slate-400">No bookings found for the selected filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider">Order ID</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider">Date & Time</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-right">Amount</th>
                  <th className="px-5 py-3 font-bold uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4 font-medium text-slate-800">{b.orderId}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">{b.customerName}</p>
                      <p className="text-slate-500 mt-0.5">{b.phone}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {new Date(b.dateTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-800">₹{b.totalAmount}</td>
                    <td className="px-5 py-4 text-center">
                      <Badge tone={b.status === "Confirmed" ? "success" : b.status === "Cancelled" ? "danger" : "pending"} className="mx-auto">
                        {b.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl2 border border-surface-border bg-white p-4 shadow-panel">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
      <p className="mt-1.5 font-display text-xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>
    </div>
  );
}

/* ─── AGENDA TAB COMPONENT ────────────────────────────────────── */
type SlotStatus = "Available" | "Booked" | "Part Paid" | "Offline Booked" | "Blocked" | "On Hold" | "Empty";

/** Vendor bookings carry a customerId the shared mock type doesn't model — it's set only
 * for bookings a registered customer made through the app, never for manual/walk-in ones. */
type ApiBooking = Booking & { customerId?: string | null };

function SeeBookingsButton({ onSeeBookings }: { onSeeBookings: () => void }) {
  return (
    <button onClick={onSeeBookings} className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-lg hover:bg-slate-800 transition">
      SEE ALL BOOKINGS
    </button>
  );
}
interface AgendaSlot {
  startTime: string;
  endTime: string;
  label: string;
  price: number;
  status: SlotStatus;
  bookingId?: string;
  customerName?: string;
  phone?: string;
}

function AgendaTab({ listing, onSeeBookings }: { listing: Listing; onSeeBookings: () => void }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [daypart, setDaypart] = useState<"Morning" | "Afternoon" | "Evening" | "Night" | "Mid Night" | null>(null);
  const [activeSlot, setActiveSlot] = useState<AgendaSlot | null>(null);
  const [groupedFilter, setGroupedFilter] = useState<SlotStatus | null>(null);
  const [localListing, setLocalListing] = useState<Listing>(listing);

  // Offline booking modal
  const [offlineModal, setOfflineModal] = useState(false);
  const [offlineName, setOfflineName] = useState("");
  const [offlinePhone, setOfflinePhone] = useState("");
  const [offlineSubmitting, setOfflineSubmitting] = useState(false);

  useEffect(() => {
    setLocalListing(listing);
  }, [listing]);

  useEffect(() => {
    setLoading(true);
    getVendorBookings({ limit: 500 })
      .then((b) => {
        setBookings(b.items as unknown as ApiBooking[]);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const dateOptions = useMemo(() => {
    const list: Date[] = [];
    const today = new Date();
    for (let i = -7; i <= 180; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const resolvedSlots = useMemo<AgendaSlot[]>(() => {
    const override = localListing.dateOverrides?.find((o) => o.date === selectedDate);
    const base = override
      ? override.isHoliday ? [] : (override.slots || [])
      : (localListing.slotsList || []);

    return base.map((slot) => {
      if (slot.blocked) {
        return {
          startTime: slot.startTime,
          endTime: slot.endTime,
          label: slot.label,
          price: slot.price,
          status: "Blocked" as SlotStatus,
        };
      }

      const match = bookings.find((bk) => {
        const bkDate = new Date(bk.dateTime).toISOString().slice(0, 10);
        const bkTime = new Date(bk.dateTime).toLocaleTimeString("en-US", {
          hour12: false, hour: "2-digit", minute: "2-digit",
        });
        return bk.listingId === localListing.id
          && bkDate === selectedDate
          && bkTime === slot.startTime;
      });

      let status: SlotStatus = "Available";
      let bookingId: string | undefined;
      let customerName: string | undefined;
      let phone: string | undefined;

      if (match) {
        bookingId = match.orderId;
        customerName = match.customerName ?? (match as any).customer;
        phone = match.phone;
        // Walk-in = no customerId (vendor typed it in manually) — not payment method,
        // since a real BYV customer can still choose to pay cash at the venue.
        const isWalkIn = !match.customerId;
        const isHold = customerName === "Hold";
        if (isHold && match.status === "Pending") status = "On Hold";
        else if (match.status === "Pending") status = "Part Paid";
        else if (match.status === "Confirmed" && isWalkIn) status = "Offline Booked";
        else status = "Booked";
      }

      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        label: slot.label,
        price: slot.price,
        status,
        bookingId,
        customerName,
        phone,
      };
    });
  }, [localListing, selectedDate, bookings]);

  const stats = useMemo(() => {
    const hrsFor = (status: SlotStatus) =>
      resolvedSlots.filter(s => s.status === status).reduce((s, sl) => s + durHrs(sl.startTime, sl.endTime), 0);
    const totalHrs = resolvedSlots.reduce((s, sl) => s + durHrs(sl.startTime, sl.endTime), 0);
    return {
      totalHrs,
      bookedHrs: hrsFor("Booked"),
      partPaidHrs: hrsFor("Part Paid"),
      offlineHrs: hrsFor("Offline Booked"),
      blockedHrs: hrsFor("Blocked"),
      onHoldHrs: hrsFor("On Hold"),
      availHrs: hrsFor("Available"),
    };
  }, [resolvedSlots]);

  const visibleSlots = useMemo(
    () => daypart ? resolvedSlots.filter(s => s.label === daypart) : resolvedSlots,
    [resolvedSlots, daypart]
  );

  const groupedSlots = useMemo(() => {
    if (!groupedFilter) return [];
    if (groupedFilter === "Booked") {
      return resolvedSlots.filter(s => s.status === "Booked" || s.status === "Offline Booked");
    }
    return resolvedSlots.filter(s => s.status === groupedFilter);
  }, [resolvedSlots, groupedFilter]);

  async function setSlotBlocked(slot: AgendaSlot, blocked: boolean) {
    try {
      const overrides = [...(localListing.dateOverrides || [])];
      const idx = overrides.findIndex(o => o.date === selectedDate);
      const currentSlots = idx > -1
        ? [...(overrides[idx].slots || [])]
        : [...(localListing.slotsList || [])];
      const next = currentSlots.map(s => s.startTime === slot.startTime ? { ...s, blocked } : s);
      const newOverride = { date: selectedDate, isHoliday: false, holidayName: "", slots: next };
      if (idx > -1) overrides[idx] = newOverride; else overrides.push(newOverride);
      const updated = { ...localListing, dateOverrides: overrides };
      const saved = await updateVendorListing(localListing.id, mockListingToApiInput(updated));
      setLocalListing(apiListingToMock(saved));
      setActiveSlot(null);
    } catch { alert(`Failed to ${blocked ? "block" : "unblock"} slot`); }
  }

  async function holdSlot(slot: AgendaSlot) {
    try {
      const dt = new Date(`${selectedDate}T${slot.startTime}:00`);
      await createVendorBooking({
        listingId: localListing.id,
        customerName: "Hold",
        phone: "9000000000", // placeholder — must match backend's Indian mobile format (^[6-9]\d{9}$)
        dateTime: dt.toISOString(),
        totalAmount: slot.price,
        payment: "Cash (Offline)",
        status: "Pending",
      });
      const fresh = await getVendorBookings({ limit: 500 });
      setBookings(fresh.items as unknown as ApiBooking[]);
      setActiveSlot(null);
    } catch { alert("Failed to hold slot"); }
  }

  async function submitOfflineBooking() {
    if (!activeSlot) return;
    if (!offlineName || !offlinePhone) { alert("Please fill name and phone"); return; }
    setOfflineSubmitting(true);
    try {
      const dt = new Date(`${selectedDate}T${activeSlot.startTime}:00`);
      await createVendorBooking({
        listingId: localListing.id,
        customerName: offlineName,
        phone: offlinePhone,
        dateTime: dt.toISOString(),
        totalAmount: activeSlot.price,
        payment: "Cash (Offline)",
        status: "Confirmed",
      });
      const fresh = await getVendorBookings({ limit: 500 });
      setBookings(fresh.items as unknown as ApiBooking[]);
      setOfflineModal(false);
      setActiveSlot(null);
      setOfflineName("");
      setOfflinePhone("");
    } catch { alert("Failed to create offline booking"); }
    setOfflineSubmitting(false);
  }

  const handleClockHour = async (hour: number) => {
    const startStr = `${String(hour).padStart(2, "0")}:00`;
    const slot = resolvedSlots.find(s => s.startTime === startStr);
    if (slot) setActiveSlot(slot);
  };

  const cardH = "h-14";
  const cardGrid = "grid-cols-4 sm:grid-cols-8";

  if (loading) return <div className="p-8 text-center text-xs text-ink-faint">Loading bookings...</div>;

  return (
    <div className="space-y-4">
      {/* View controls header */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-surface-border pb-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Today&apos;s Agenda</h2>
          <p className="text-[11px] text-slate-400 mt-1">{new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
      </div>

      {/* Date slider */}
      <div className="relative group -mx-2 sm:mx-0">
        <div className="flex gap-2 py-3 px-2 sm:px-0 overflow-x-auto scrollbar-none snap-x snap-mandatory">
          {dateOptions.map((d, i) => {
            const iso = d.toISOString().slice(0, 10);
            const isSel = iso === selectedDate;
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <button key={i} onClick={() => setSelectedDate(iso)}
                className={`flex flex-col items-center justify-center min-w-[52px] h-[64px] rounded-[14px] border transition-all shrink-0 snap-center ${
                  isSel 
                    ? "bg-gradient-to-br from-vibe-violet to-purple-800 border-transparent text-white shadow-md shadow-vibe-violet/30 scale-[1.03]" 
                    : "bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <span className={`text-[8px] font-bold uppercase tracking-wider ${isSel ? "text-purple-200" : "text-slate-400"}`}>
                  {isToday ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className={`text-lg font-black leading-none mt-1 ${isSel ? "text-white" : "text-slate-700"}`}>
                  {d.getDate()}
                </span>
                <span className={`text-[8px] font-bold uppercase tracking-wider mt-1 ${isSel ? "text-purple-200" : "text-slate-400"}`}>
                  {d.toLocaleDateString("en-US", { month: "short" })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hours stats row */}
      <div className="grid grid-cols-4 gap-2">
        <button onClick={() => setGroupedFilter(null)} className={`rounded-xl border p-2 text-center transition ${!groupedFilter ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white"}`}>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Cap.</p>
          <p className="text-lg font-extrabold text-slate-800">{stats.totalHrs}<span className="text-[9px] font-semibold text-slate-400 ml-0.5">h</span></p>
        </button>
        <button onClick={() => setGroupedFilter(groupedFilter === "Booked" ? null : "Booked")} className={`rounded-xl border p-2 text-center transition ${groupedFilter === "Booked" ? "border-rose-400 bg-rose-50" : "border-rose-100 bg-rose-50/50"}`}>
          <p className="text-[9px] font-bold uppercase tracking-wider text-rose-500">Booked</p>
          <p className="text-lg font-extrabold text-rose-600">{stats.bookedHrs + stats.offlineHrs}<span className="text-[9px] font-semibold text-rose-400 ml-0.5">h</span></p>
        </button>
        <button onClick={() => setGroupedFilter(groupedFilter === "Part Paid" ? null : "Part Paid")} className={`rounded-xl border p-2 text-center transition ${groupedFilter === "Part Paid" ? "border-amber-400 bg-amber-50" : "border-amber-100 bg-amber-50/50"}`}>
          <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">Part Paid</p>
          <p className="text-lg font-extrabold text-amber-600">{stats.partPaidHrs}<span className="text-[9px] font-semibold text-amber-400 ml-0.5">h</span></p>
        </button>
        <button onClick={() => setGroupedFilter(groupedFilter === "Available" ? null : "Available")} className={`rounded-xl border p-2 text-center transition ${groupedFilter === "Available" ? "border-emerald-400 bg-emerald-50" : "border-emerald-100 bg-emerald-50/50"}`}>
          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">Available</p>
          <p className="text-lg font-extrabold text-emerald-600">{stats.availHrs}<span className="text-[9px] font-semibold text-emerald-400 ml-0.5">h</span></p>
        </button>
      </div>

      {/* Grouped view or main agenda */}
      {groupedFilter ? (
        <GroupedSlotsList slots={groupedSlots} filter={groupedFilter} onClose={() => setGroupedFilter(null)} />
      ) : (
        <>
          {/* Dayparts tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
            {(["Morning", "Afternoon", "Evening", "Night", "Mid Night"] as const).map(dp => (
              <button key={dp} onClick={() => setDaypart(daypart === dp ? null : dp)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold shrink-0 transition ${daypart === dp ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                {dp}
              </button>
            ))}
          </div>

          <AgendaGrid slots={visibleSlots} cardH={cardH} cardGrid={cardGrid} daypart={daypart} onSlotClick={setActiveSlot} />
        </>
      )}

      {/* Bottom Floating "See Booking" button */}
      {!groupedFilter && (
        <div className="flex justify-center py-2">
          <SeeBookingsButton onSeeBookings={onSeeBookings} />
        </div>
      )}

      {/* Slot Modal */}
      {activeSlot && !offlineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setActiveSlot(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">{activeSlot.status === "Available" ? "Available Segment" : activeSlot.status}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{to12h(activeSlot.startTime)} - {to12h(activeSlot.endTime)} · ₹{activeSlot.price}</p>
              </div>
              <button onClick={() => setActiveSlot(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            </div>

            {activeSlot.status === "Available" ? (
              <div className="space-y-2">
                <ActionRow icon={<Ban size={16} className="text-rose-500" />} color="rose" title="Block Slot" sub="Mark as blocked for maintenance" onClick={() => setSlotBlocked(activeSlot, true)} />
                <ActionRow icon={<BookOpen size={16} className="text-emerald-600" />} color="emerald" title="Offline Booking" sub="Book manually for walk-in guest" onClick={() => setOfflineModal(true)} />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5">
                  {activeSlot.customerName && <div className="flex justify-between"><span className="text-slate-400">Customer</span><span className="font-bold">{activeSlot.customerName}</span></div>}
                  {activeSlot.phone && <div className="flex justify-between"><span className="text-slate-400">Phone</span><span className="font-bold">{activeSlot.phone}</span></div>}
                  <div className="flex justify-between"><span className="text-slate-400">Price</span><span className="font-bold">₹{activeSlot.price}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Duration</span><span className="font-bold">{durHrs(activeSlot.startTime, activeSlot.endTime)} hrs</span></div>
                </div>
                {activeSlot.status === "Blocked" && (
                  <ActionRow icon={<Check size={16} className="text-emerald-600" />} color="emerald" title="Unblock Slot" sub="Make this slot available again" onClick={() => setSlotBlocked(activeSlot, false)} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Offline Modal */}
      {offlineModal && activeSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setOfflineModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-extrabold text-slate-800 mb-3">Offline Booking</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Name</label>
                <input value={offlineName} onChange={e => setOfflineName(e.target.value)} placeholder="Rahul" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-vibe-violet" />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Phone</label>
                <input value={offlinePhone} onChange={e => setOfflinePhone(e.target.value)} placeholder="9876543210" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-vibe-violet" />
              </div>
              <button onClick={submitOfflineBooking} disabled={offlineSubmitting} className="w-full rounded-lg bg-emerald-600 text-white py-2 text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-60">
                {offlineSubmitting ? "Booking…" : "Confirm Booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function to12h(t: string) {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr) % 24; // "24:00" (midnight close) → 12:00 AM
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${ap}`;
}
function t24m(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function durHrs(start: string, end: string) {
  const d = t24m(end) - t24m(start);
  return d > 0 ? +(d / 60).toFixed(1) : 0;
}
function fmtDur(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function AgendaGrid({ slots, cardH, cardGrid, daypart, onSlotClick }: {
  slots: AgendaSlot[]; cardH: string; cardGrid: string; daypart: string | null; onSlotClick: (s: AgendaSlot) => void;
}) {
  const parts = daypart ? [daypart] : ["Morning", "Afternoon", "Evening", "Night", "Mid Night"];
  return (
    <div className="space-y-4">
      {parts.map(part => {
        const partSlots = slots.filter(s => s.label === part);
        if (partSlots.length === 0) return null;
        return (
          <div key={part}>
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">{part}</p>
            <div className={`grid ${cardGrid} gap-2`}>
              {partSlots.map((s, i) => {
                const colors: Record<SlotStatus, string> = {
                  Available: "bg-emerald-50/50 border-emerald-100 text-emerald-700",
                  Booked: "bg-rose-50/50 border-rose-100 text-rose-700",
                  "Part Paid": "bg-amber-50/50 border-amber-100 text-amber-700",
                  "Offline Booked": "bg-orange-50/50 border-orange-100 text-orange-700",
                  Blocked: "bg-slate-50 border-slate-200 text-slate-500",
                  "On Hold": "bg-purple-50/50 border-purple-100 text-purple-700",
                  Empty: "bg-slate-50 border-slate-200 text-slate-400",
                };
                
                const isAvail = s.status === "Available";
                return (
                  <button
                    key={i}
                    onClick={() => onSlotClick(s)}
                    className={`flex flex-col items-center justify-center ${cardH} rounded-xl border ${
                      isAvail
                        ? "border-emerald-200 bg-white hover:border-emerald-400 text-slate-700"
                        : `border-solid ${colors[s.status] || ""}`
                    } hover:shadow-sm transition-all relative overflow-hidden group px-1`}
                  >
                    {isAvail && <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />}
                    
                    <span className={`text-[10px] font-extrabold z-10 text-center leading-[1.2] tracking-tight ${isAvail ? "text-slate-700" : "font-semibold"}`}>
                      {to12h(s.startTime)} <br/> {to12h(s.endTime)}
                    </span>
                    
                    {isAvail ? (
                      <span className="text-[8px] font-black uppercase text-emerald-500 mt-0.5 tracking-[0.1em] z-10">AVAILABLE</span>
                    ) : (
                      <span className="text-[8px] font-extrabold mt-0.5 uppercase tracking-wider z-10 opacity-80">
                        {s.status}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GroupedSlotsList({ slots, filter, onClose }: { slots: AgendaSlot[]; filter: SlotStatus; onClose: () => void }) {
  const colorMap: Record<SlotStatus, { border: string; label: string; dot: string }> = {
    Available:        { border: "border-emerald-200", label: "text-emerald-700", dot: "bg-emerald-500" },
    Booked:           { border: "border-rose-200", label: "text-rose-700", dot: "bg-rose-500" },
    "Part Paid":      { border: "border-amber-200", label: "text-amber-700", dot: "bg-amber-500" },
    "Offline Booked": { border: "border-orange-200", label: "text-orange-700", dot: "bg-orange-500" },
    Blocked:          { border: "border-slate-200", label: "text-slate-600", dot: "bg-slate-400" },
    "On Hold":        { border: "border-purple-200", label: "text-purple-700", dot: "bg-purple-500" },
    Empty:            { border: "border-slate-200", label: "text-slate-500", dot: "bg-slate-300" },
  };
  const c = colorMap[filter] || colorMap.Available;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100">
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-800">{filter} Slots</h4>
        <button onClick={onClose} className="ml-auto p-1 rounded-full hover:bg-slate-100 text-slate-400"><X size={12} /></button>
      </div>
      {slots.length === 0 ? (
        <p className="p-6 text-center text-xs text-slate-400">No {filter} slots</p>
      ) : (
        <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
          {slots.map((s, i) => {
            const sc = colorMap[s.status] || c;
            return (
              <div key={i} className={`flex justify-between items-center px-4 py-2.5 text-xs border-l-2 ${sc.border}`}>
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">{s.label}</p>
                  <p className="font-bold text-slate-800">{to12h(s.startTime)} - <span className={sc.label}>{to12h(s.endTime)}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{s.status}</p>
                  <p className="font-extrabold text-slate-500">{durHrs(s.startTime, s.endTime)} hrs</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActionRow({ icon, title, sub, onClick, color }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50 text-left transition">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${color}-50 shrink-0`}>{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-800">{title}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
      </div>
    </button>
  );
}

