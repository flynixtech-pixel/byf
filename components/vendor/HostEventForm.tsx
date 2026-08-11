"use client";

import { useState } from "react";
import { PageHero, SectionCard } from "@/components/vendor/ui";
import { createVendorListing } from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import { TimeField } from "./TimeField";
import { Listing } from "@/lib/api/types";

interface Props {
  onClose: () => void;
  onSaved: (listing: Listing) => void;
}

function emptyState() {
  return {
    title: "",
    category: "",
    description: "",
    city: "",
    state: "",
    address: "",
    coverImage: "",
    eventDate: "",
    reportingStartTime: "",
    reportingEndTime: "",
    price: "",
    capacity: "",
  };
}

/** A trimmed create form for a one-off event — unlike PackageStudio it skips
 * price tiers, add-ons, itinerary and every other turf-only field. */
export function HostEventForm({ onClose, onSaved }: Props) {
  const [form, setForm] = useState(emptyState());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  function update<K extends keyof ReturnType<typeof emptyState>>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Give your event a name.";
    if (!form.category.trim()) e.category = "What kind of event is this?";
    if (!form.description.trim()) e.description = "Add a short description.";
    if (!form.city.trim()) e.city = "City is required.";
    if (!form.state.trim()) e.state = "State is required.";
    if (!form.address.trim()) e.address = "Venue address is required.";
    if (!form.eventDate) e.eventDate = "Pick a date.";
    const price = Number(form.price);
    if (!form.price || price < 0) e.price = "Enter a valid ticket price (0 for free).";
    if (form.capacity && (!/^\d+$/.test(form.capacity) || Number(form.capacity) <= 0)) {
      e.capacity = "Capacity must be a positive whole number.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const eventDay = new Date(`${form.eventDate}T00:00:00`);
      const created = await createVendorListing({
        title: form.title.trim(),
        type: "Event",
        categories: [form.category.trim()],
        description: form.description.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        address: form.address.trim(),
        coverImage: form.coverImage.trim() || undefined,
        reportingStartTime: form.reportingStartTime || undefined,
        reportingEndTime: form.reportingEndTime || undefined,
        price: Number(form.price),
        capacity: form.capacity ? Number(form.capacity) : undefined,
        availableFrom: eventDay.toISOString(),
        availableTill: eventDay.toISOString(),
        slotsPerDay: 1,
      });
      onSaved(created);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.describe() : "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Host an Event"
        title="Any event — not just turf time"
        description="Marathons, tournaments, workshops, corporate offsites. Attendees RSVP and check in exactly like a booking."
      />

      <SectionCard title="Event details" description="Only what's needed to publish — you can edit it later.">
        <form onSubmit={handleSubmit} className="space-y-4">
          {loadError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-vibe-coral">{loadError}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Event Name" error={errors.title}>
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                className={inputClass(!!errors.title)}
                placeholder="City Half Marathon"
              />
            </FormField>
            <FormField label="Event Category *" error={errors.category}>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className={inputClass(!!errors.category)}
              >
                <option value="">Select Event Category...</option>
                <option value="Alcoholic Party">🍾 Alcoholic Party</option>
                <option value="Non-Alcoholic Party">🥤 Non-Alcoholic Party</option>
                <option value="Business">💼 Business</option>
                <option value="Sports">🏆 Sports</option>
                <option value="Performance">🎭 Performance</option>
              </select>
            </FormField>
          </div>

          <FormField label="Description" error={errors.description}>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className={inputClass(!!errors.description)}
              rows={3}
              placeholder="What should attendees know before they RSVP?"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="City" error={errors.city}>
              <input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className={inputClass(!!errors.city)}
                placeholder="Udaipur"
              />
            </FormField>
            <FormField label="State" error={errors.state}>
              <input
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                className={inputClass(!!errors.state)}
                placeholder="Rajasthan"
              />
            </FormField>
            <FormField label="Venue Address" error={errors.address}>
              <input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className={inputClass(!!errors.address)}
                placeholder="Fatehsagar Lake Front"
              />
            </FormField>
          </div>

          <FormField label="Cover Image URL">
            <input
              value={form.coverImage}
              onChange={(e) => update("coverImage", e.target.value)}
              className={inputClass(false)}
              placeholder="https://..."
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Event Date" error={errors.eventDate}>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => update("eventDate", e.target.value)}
                className={inputClass(!!errors.eventDate)}
              />
            </FormField>
            <FormField label="Reporting Start Time">
              <TimeField
                value={form.reportingStartTime || "09:00"}
                onChange={(next) => update("reportingStartTime", next)}
              />
            </FormField>
            <FormField label="Reporting End Time">
              <TimeField
                value={form.reportingEndTime || "17:00"}
                onChange={(next) => update("reportingEndTime", next)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Ticket Price (₹)" error={errors.price}>
              <input
                value={form.price}
                onChange={(e) => update("price", e.target.value.replace(/\D/g, ""))}
                className={inputClass(!!errors.price)}
                placeholder="0 for free entry"
              />
            </FormField>
            <FormField label="Capacity (optional)" error={errors.capacity}>
              <input
                value={form.capacity}
                onChange={(e) => update("capacity", e.target.value.replace(/\D/g, ""))}
                className={inputClass(!!errors.capacity)}
                placeholder="Max attendees"
              />
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-cream-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-vibe-violet px-4 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violet/90 disabled:opacity-60"
            >
              {submitting ? "Publishing..." : "Publish Event"}
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border ${
    hasError ? "border-vibe-coral" : "border-surface-border"
  } px-3 py-2.5 text-sm outline-none focus:border-vibe-violet`;
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-soft mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-vibe-coral">{error}</p>}
    </div>
  );
}
