"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { uploadVendorImage } from "@/lib/api/uploads";
import { ApiError } from "@/lib/api/client";

/** Single-image upload box (logo / banner / poster) for a restaurant profile. */
export function OutletImageUpload({
  label,
  hint,
  value,
  onChange,
  aspect = "aspect-[2/1]",
}: {
  label: string;
  hint: string;
  value?: string;
  onChange: (url: string) => void;
  /** Tailwind aspect class controlling the preview box shape. */
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const { url } = await uploadVendorImage(file, "food-outlets");
      onChange(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
      {value ? (
        <div className={`group relative w-full overflow-hidden rounded-xl border border-surface-border ${aspect}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label={`Remove ${label}`}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-surface-border text-ink-faint transition hover:border-vibe-violet hover:text-vibe-violet ${aspect}`}
        >
          {uploading ? <LoaderCircle size={22} className="animate-spin" /> : <ImagePlus size={22} />}
          <span className="text-xs font-semibold">{uploading ? "Uploading…" : `Upload ${label.toLowerCase()}`}</span>
        </button>
      )}
      <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>
      {error && <p className="mt-1 text-[11px] font-semibold text-vibe-coral">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
