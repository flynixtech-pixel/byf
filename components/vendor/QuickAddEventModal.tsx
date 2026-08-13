"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Plus, Sparkles, Ticket, Trash2, Upload, X, Zap } from "lucide-react";
import { TimeField } from "./TimeField";
import { uploadVendorImage } from "@/lib/api/uploads";
import { ApiError } from "@/lib/api/client";
import { Listing, ListingImage } from "@/lib/types";
import { parseEventPromptWithAi } from "@/lib/api/vendor";

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
  const [capacity, setCapacity] = useState("100");
  const [tagline, setTagline] = useState("");
  const [date, setDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [endTimeTouched, setEndTimeTouched] = useState(false);

  const [venueInput, setVenueInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [venue, setVenue] = useState<{ address: string; city: string; state: string } | null>(null);
  const venueRef = useRef<HTMLDivElement>(null);

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const posterInput = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("Sports");

  const [aiPrompt, setAiPrompt] = useState("");
  const [parsingAi, setParsingAi] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

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
        { headers: { "Accept-Language": "en" }, referrerPolicy: "origin" }
      )
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => (Array.isArray(data) ? setSuggestions(data) : setSuggestions([])))
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

  async function handlePhotoFiles(filesList: FileList | null) {
    if (!filesList || filesList.length === 0) return;
    setError(null);

    const files = Array.from(filesList);
    const totalSizeBytes = files.reduce((acc, f) => acc + f.size, 0);
    const maxBytes = 6 * 1024 * 1024; // 6 MB total size limit

    if (totalSizeBytes > maxBytes) {
      const totalMB = (totalSizeBytes / (1024 * 1024)).toFixed(1);
      setError(`Selected images total ${totalMB} MB, which exceeds the 6MB limit. Please select smaller files.`);
      return;
    }

    setUploadingImages(true);
    try {
      const uploadPromises = files.map((file) => uploadVendorImage(file, "listings"));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map((r) => r.url);
      setImageUrls((prev) => [...prev, ...newUrls]);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Image upload failed");
    } finally {
      setUploadingImages(false);
    }
  }

  function removeImage(index: number) {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== index));
  }

function parseCityAndState(address: string, userCity?: string, userState?: string) {
  let city = userCity?.trim() || "";
  let state = userState?.trim() || "";

  if (!city || !state) {
    const text = address.toLowerCase();
    const cityMap: Array<{ city: string; state: string; pattern: RegExp }> = [
      { city: "Udaipur", state: "Rajasthan", pattern: /\budaipur\b/i },
      { city: "Jaipur", state: "Rajasthan", pattern: /\bjaipur\b/i },
      { city: "Jodhpur", state: "Rajasthan", pattern: /\bjodhpur\b/i },
      { city: "Kota", state: "Rajasthan", pattern: /\bkota\b/i },
      { city: "Ajmer", state: "Rajasthan", pattern: /\bajmer\b/i },
      { city: "Mumbai", state: "Maharashtra", pattern: /\bmumbai\b/i },
      { city: "Pune", state: "Maharashtra", pattern: /\bpune\b/i },
      { city: "Delhi", state: "Delhi", pattern: /\bdelhi\b/i },
      { city: "Bangalore", state: "Karnataka", pattern: /\b(bangalore|bengaluru)\b/i },
      { city: "Ahmedabad", state: "Gujarat", pattern: /\bahmedabad\b/i },
    ];

    for (const item of cityMap) {
      if (item.pattern.test(text)) {
        if (!city) city = item.city;
        if (!state) state = item.state;
        break;
      }
    }
  }

  if (!city) city = "Udaipur";
  if (!state) state = "Rajasthan";

  return { city, state };
}

  async function handleAiFill(textToParse?: string) {
    const targetPrompt = textToParse || aiPrompt;
    if (!targetPrompt.trim()) {
      setError("Type an event prompt or click a sample to fill with Grok AI.");
      return;
    }
    setError(null);
    setAiSuccessMsg(null);
    setParsingAi(true);
    try {
      const data = await parseEventPromptWithAi(targetPrompt.trim());
      if (data.title) setTitle(data.title);
      if (data.category) setCategory(data.category);
      if (data.venue) {
        setVenueInput(data.venue);
        const loc = parseCityAndState(data.venue);
        setVenue({ address: data.venue, city: loc.city, state: loc.state });
      }
      if (data.price !== undefined) setPrice(String(data.price));
      if (data.capacity !== undefined) setCapacity(String(data.capacity));
      if (data.date) setDate(data.date);
      if (data.startTime) setStartTime(data.startTime);
      if (data.endTime) setEndTime(data.endTime);
      if (data.tagline) setTagline(data.tagline);

      setAiSuccessMsg(`✨ Form auto-filled by Grok AI in ${data.durationMs || 100}ms!`);
      setTimeout(() => setAiSuccessMsg(null), 5000);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Grok AI failed to parse prompt.");
    } finally {
      setParsingAi(false);
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
    const capacityNum = capacity.trim() === "" ? 100 : Number(capacity);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      setError("Enter valid seat capacity.");
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
      const primaryCover = imageUrls[0] || "";
      const listingImages: ListingImage[] = imageUrls.map((url, idx) => ({
        id: `img-${now.getTime()}-${idx}`,
        url,
        label: idx === 0 ? "Cover Poster" : `Photo ${idx + 1}`,
      }));

      const loc = parseCityAndState(finalAddress, venue?.city, venue?.state);

      const listing: Listing = {
        id: `byv-${now.getTime()}`,
        title: title.trim(),
        type: "Event",
        categories: [category, "Events"],
        subCategories: [],
        price: priceNum,
        capacity: capacityNum,
        listedOn: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        status: "Active",
        trending: false,
        isPrivate: false,
        access: "Vendor Owned",
        coverImage: primaryCover,
        posterImage: primaryCover ? { id: `poster-${now.getTime()}`, url: primaryCover, label: "Poster" } : undefined,
        images: listingImages,
        country: "India",
        city: loc.city,
        state: loc.state,
        cityMode: "single",
        cities: [],
        address: venue?.address || venueInput.trim(),
        reportingStartTime: startTime,
        reportingEndTime: endTime,
        description: tagline.trim() || `More event details coming soon for ${title.trim()}.`,
        highlights: tagline.trim() ? [tagline.trim()] : [],
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
                label: JSON.stringify({ slots: capacityNum, note: tagline.trim() }),
                price: priceNum,
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

        <div className="space-y-4 p-5">
          {/* Grok AI Auto-Fill Container */}
          <div className="rounded-xl border border-vibe-violet/30 bg-gradient-to-br from-vibe-indigo/5 via-vibe-violet/5 to-purple-500/10 p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-vibe-violet font-semibold text-xs">
                <Sparkles size={14} className="animate-pulse" />
                <span>Fill Form with Grok AI</span>
              </div>
              <span className="text-[9px] font-bold tracking-wider uppercase bg-vibe-violet/10 text-vibe-violet px-2 py-0.5 rounded-full">
                AI Powered
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={aiPrompt ?? ""}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAiFill();
                  }
                }}
                placeholder="e.g. Sunset acoustic concert at Saheliyon ki Bari, ₹499, 150 seats, 7 PM to 10 PM this Saturday"
                className="w-full rounded-lg border border-vibe-violet/30 bg-white px-3 py-2 text-xs outline-none focus:border-vibe-violet placeholder:text-ink-faint shadow-sm"
              />
              <button
                type="button"
                onClick={() => handleAiFill()}
                disabled={parsingAi || !aiPrompt.trim()}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-vibe-indigo to-vibe-violet px-3.5 py-2 text-xs font-semibold text-white shadow hover:opacity-95 disabled:opacity-50 transition-all"
              >
                {parsingAi ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {parsingAi ? "AI Thinking..." : "Fill with AI"}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="text-[10px] text-ink-faint self-center">Try:</span>
              <button
                type="button"
                onClick={() => {
                  const p = "Fateh Sagar Lake Marathon, 200 seats, ₹299, 6 AM to 9 AM on 20th August";
                  setAiPrompt(p);
                  handleAiFill(p);
                }}
                className="rounded-md border border-purple-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-vibe-violet/10 hover:text-vibe-violet transition-colors"
              >
                🏃‍♂️ 10km Marathon
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = "Sunset Acoustic Night at Saheliyon ki Bari, ₹499, 150 seats, 7 PM to 10 PM this Saturday";
                  setAiPrompt(p);
                  handleAiFill(p);
                }}
                className="rounded-md border border-purple-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-vibe-violet/10 hover:text-vibe-violet transition-colors"
              >
                🎸 Acoustic Night
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = "Night Box Cricket Tournament, ₹500, 50 seats, 8 PM to 11 PM";
                  setAiPrompt(p);
                  handleAiFill(p);
                }}
                className="rounded-md border border-purple-200 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-vibe-violet/10 hover:text-vibe-violet transition-colors"
              >
                🏏 Box Cricket
              </button>
            </div>

            {aiSuccessMsg && (
              <p className="text-[11px] font-semibold text-emerald-600 animate-fade-in">
                {aiSuccessMsg}
              </p>
            )}
          </div>

          <p className="text-xs text-ink-faint">
            Just the essentials — photo, price, seats and time — to publish instantly. Add tickets and itinerary anytime from Manage Event.
          </p>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-vibe-coral">{error}</div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={fieldLabelClass}>Event Photos (Multiple)</label>
              <span className="text-[10px] font-semibold text-ink-faint">Max 6MB combined</span>
            </div>
            <input
              ref={posterInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handlePhotoFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {uploadingImages ? (
              <div className="flex h-24 items-center justify-center gap-2 rounded-lg border border-dashed border-surface-border bg-cream-200/50 text-xs font-semibold text-ink-faint">
                <Loader2 size={16} className="animate-spin text-vibe-violet" /> Uploading images...
              </div>
            ) : imageUrls.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative h-20 overflow-hidden rounded-lg bg-cream-300 border border-slate-200 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Event photo ${idx + 1}`} className="h-full w-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 rounded bg-vibe-violet px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wider">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-rose-600 transition-colors"
                        title="Remove photo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => posterInput.current?.click()}
                    className="flex h-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-surface-border bg-cream-200/50 hover:bg-cream-200 text-ink-faint hover:text-vibe-violet transition-colors"
                  >
                    <Plus size={16} />
                    <span className="text-[10px] font-semibold">Add more</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => posterInput.current?.click()}
                className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-surface-border bg-cream-200/50 hover:bg-cream-200"
              >
                <Upload size={18} className="text-vibe-violet" />
                <span className="text-xs font-semibold text-ink">Upload photos</span>
                <span className="text-[10px] text-ink-faint">Select multiple photos · Max 6MB combined</span>
              </button>
            )}
          </div>

          <div>
            <label className={fieldLabelClass}>Event Name *</label>
            <input
              value={title ?? ""}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunday Sunset Acoustic Night"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={fieldLabelClass}>Event Category *</label>
              <select
                value={category ?? "Sports"}
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
                  value={venueInput ?? ""}
                  onChange={(e) => {
                    setVenueInput(e.target.value);
                    setVenue(null);
                  }}
                  placeholder="Search venue or city..."
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={fieldLabelClass}>Price (₹) *</label>
              <input
                type="number"
                min="0"
                value={price ?? ""}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setPrice(e.target.value.replace(/^0+(?=\d)/, ""))}
                placeholder="0 for free entry"
                className={inputClass}
              />
            </div>
            <div>
              <label className={fieldLabelClass}>Total Seats / Capacity *</label>
              <input
                type="number"
                min="1"
                value={capacity ?? ""}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g. 100"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={fieldLabelClass}>Event Date *</label>
              <input type="date" value={date ?? ""} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={fieldLabelClass}>Start Time *</label>
              <TimeField
                value={startTime ?? "10:00"}
                onChange={(next) => {
                  setStartTime(next);
                  if (!endTimeTouched) setEndTime(calculateEndTime(next));
                }}
              />
            </div>
            <div>
              <label className={fieldLabelClass}>End Time</label>
              <TimeField
                value={endTime ?? "11:00"}
                onChange={(next) => {
                  setEndTime(next);
                  setEndTimeTouched(true);
                }}
              />
            </div>
          </div>

          <div>
            <label className={fieldLabelClass}>Quick Tagline / Highlight (Optional)</label>
            <input
              value={tagline ?? ""}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. 10km morning run around Fateh Sagar Lake"
              className={inputClass}
            />
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
