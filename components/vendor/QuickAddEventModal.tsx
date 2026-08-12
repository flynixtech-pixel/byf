"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Ticket, Upload, X, Zap } from "lucide-react";
import { TimeField } from "./TimeField";
import { uploadVendorImage } from "@/lib/api/uploads";
import { ApiError } from "@/lib/api/client";
import { Listing } from "@/lib/types";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function calculateEndTime(startTime: string): string {
  if (!startTime) return "11:00";
  const [hStr, mStr] = startTime.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return "11:00";
  h = (h + 1) % 24;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const inputClass =
  "w-full rounded-lg border border-surface-border bg-cream-200/40 px-3 py-2.5 text-sm outline-none focus:border-vibe-violet placeholder:text-ink-faint";

const fieldLabelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint";

/**
 * A lightweight, single-screen alternative to the 5-step EventStudio wizard —
 * just the fields a vendor needs to get an event live fast. Everything else
 * (description, tickets, itinerary...) can be filled in later from Manage Event.
 */
export function QuickAddEventModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (listing: Listing) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [endTimeTouched, setEndTimeTouched] = useState(false);

  const [venueInput, setVenueInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [venue, setVenue] = useState<{ address: string; city: string; state: string } | null>(null);
  const venueRef = useRef<HTMLDivElement>(null);

  const [posterUrl, setPosterUrl] = useState("");
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const posterInput = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("Sports");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    if (venueInput.length < 3 || venue) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      setLoadingSuggestions(true);
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          venueInput
        )}&countrycodes=in&limit=5&addressdetails=1`,
        // Referer must be forced or Nominatim silently 403s — see project convention.
        { headers: { "Accept-Language": "en" }, referrerPolicy: "origin" }
      )
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => Array.isArray(data) ? setSuggestions(data) : setSuggestions([]))
        .catch(() => setSuggestions([]))
        .finally(() => setLoadingSuggestions(false));
    }, 400);
    return () => clearTimeout(t);
  }, [venueInput, venue]);

  function pickSuggestion(item: any) {
    const addr = item.address || {};
    const city = addr.city || addr.town || addr.village || addr.suburb || "";
    const state = addr.state || "";
    setVenue({ address: item.display_name, city, state });
    setVenueInput(item.display_name);
    setSuggestions([]);
  }

  async function handlePosterFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploadingPoster(true);
    try {
      const { url } = await uploadVendorImage(file, "listings");
      setPosterUrl(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Image upload failed");
    } finally {
      setUploadingPoster(false);
    }
  }

  async function handleCreate() {
    if (!title.trim()) {
      setError("Give your event a name.");
      return;
    }
    const finalAddress = venue ? venue.address : venueInput.trim();
    if (!finalAddress) {
      setError("Enter a venue address.");
      return;
    }
    const priceNum = price === "" ? 0 : Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Enter a valid price.");
      return;
    }
    if (!date) {
      setError("Pick an event date.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const now = new Date();
      const listing: Listing = {
        id: `byv-${now.getTime()}`,
        title: title.trim(),
        type: "Event",
        categories: [category, "Events"],
        subCategories: [],
        price: priceNum,
        listedOn: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        status: "Active",
        trending: false,
        isPrivate: false,
        access: "Vendor Owned",
        coverImage: posterUrl,
        images: posterUrl ? [{ id: `img-${now.getTime()}`, url: posterUrl, label: "Poster" }] : [],
        country: "India",
        city: venue?.city || "",
        state: venue?.state || "",
        cityMode: "single",
        cities: [],
        address: venue?.address || venueInput.trim(),
        reportingStartTime: startTime,
        reportingEndTime: endTime,
        description: `More event details coming soon for ${title.trim()}.`,
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
        availableFrom: date,
        availableTill: date,
        slotsPerDay: 1,
        dateOverrides: [
          {
            date,
            isHoliday: false,
            holidayName: "",
            slots: [
              {
                startTime,
                endTime,
                label: JSON.stringify({ slots: 10, note: "" }),
                price: 0,
                blocked: false,
              },
            ],
          },
        ],
      };
      await onCreate(listing);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-vibe-indigo via-vibe-violet to-vibe-violetSoft px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <Zap size={18} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">Fast track</p>
              <h2 className="font-display text-lg font-semibold">Quick Add Event</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/10 p-2 hover:bg-white/20">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <p className="text-xs text-ink-faint">
            Just the essentials — photo, price and time — to publish instantly. Add description, tickets and itinerary
            anytime from Manage Event.
          </p>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-vibe-coral">{error}</div>
          )}

          <div>
            <label className={fieldLabelClass}>Event Photo</label>
            <input
              ref={posterInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handlePosterFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {uploadingPoster ? (
              <div className="flex h-32 items-center justify-center gap-2 rounded-lg border border-dashed border-surface-border bg-cream-200/50 text-xs font-semibold text-ink-faint">
                <Loader2 size={16} className="animate-spin" /> Uploading...
              </div>
            ) : posterUrl ? (
              <div className="relative h-32 overflow-hidden rounded-lg bg-cream-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={posterUrl} alt="Event poster" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => posterInput.current?.click()}
                  className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-black/75"
                >
                  Replace
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => posterInput.current?.click()}
                className="flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-surface-border bg-cream-200/50 hover:bg-cream-200"
              >
                <Upload size={18} className="text-vibe-violet" />
                <span className="text-xs font-semibold text-ink">Upload photo</span>
                <span className="text-[10px] text-ink-faint">Optional · JPG, PNG, max 5MB</span>
              </button>
            )}
          </div>

          <div>
            <label className={fieldLabelClass}>Event Name *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunday Trek Meetup"
              className={inputClass}
            />
          </div>

          <div>
            <label className={fieldLabelClass}>Event Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              <option value="Alcoholic Party">🍾 Alcoholic Party</option>
              <option value="Non-Alcoholic Party">🥤 Non-Alcoholic Party</option>
              <option value="Business">💼 Business</option>
              <option value="Sports">🏆 Sports</option>
              <option value="Performance">🎭 Performance</option>
            </select>
          </div>

          <div ref={venueRef} className="relative">
            <label className={fieldLabelClass}>Venue *</label>
            <div className="relative">
              <MapPin size={14} className="pointer-events-none absolute left-3 top-3.5 text-ink-faint" />
              <input
                value={venueInput}
                onChange={(e) => {
                  setVenueInput(e.target.value);
                  setVenue(null);
                }}
                placeholder="Search venue, area or city..."
                className={`${inputClass} pl-9`}
              />
              {loadingSuggestions && (
                <span className="absolute right-3 top-3.5 text-[10px] font-bold text-ink-faint animate-pulse">Searching...</span>
              )}
            </div>
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => pickSuggestion(item)}
                    className="w-full px-3.5 py-2 text-left text-xs leading-tight text-slate-700 hover:bg-slate-50"
                  >
                    {item.display_name}
                  </button>
                ))}
              </div>
            )}
            {venue && <p className="mt-1.5 text-[11px] font-medium text-vibe-limeDark">✓ Venue set — {venue.city || venue.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={fieldLabelClass}>Price (₹) *</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0 for free entry"
                className={inputClass}
              />
            </div>
            <div>
              <label className={fieldLabelClass}>Event Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={fieldLabelClass}>Start Time *</label>
              <TimeField
                value={startTime}
                onChange={(next) => {
                  setStartTime(next);
                  if (!endTimeTouched) setEndTime(calculateEndTime(next));
                }}
              />
            </div>
            <div>
              <label className={fieldLabelClass}>End Time</label>
              <TimeField
                value={endTime}
                onChange={(next) => {
                  setEndTime(next);
                  setEndTimeTouched(true);
                }}
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-surface-border bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-cream-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-vibe-violet px-5 py-2 text-sm font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Ticket size={14} />}
            {submitting ? "Creating..." : "Create Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
