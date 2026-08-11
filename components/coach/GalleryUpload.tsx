"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { uploadVendorImage } from "@/lib/api/uploads";
import { ApiError } from "@/lib/api/client";

/**
 * Multi-image gallery uploader for a coach profile. Uploads each picked file to
 * the vendor uploads endpoint and appends the hosted URLs to `value`.
 */
export function GalleryUpload({
  value,
  onChange,
  max = 30,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    setError(null);
    setUploading(true);
    const room = Math.max(0, max - value.length);
    const picked = Array.from(files).slice(0, room);
    try {
      const uploaded = await Promise.all(picked.map((f) => uploadVendorImage(f, "coaches")));
      onChange([...value, ...uploaded.map((u) => u.url)]);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((url) => (
          <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-surface-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Gallery" className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
            <button
              type="button"
              onClick={() => remove(url)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-surface-border text-ink-faint transition hover:border-[#5c3a21] hover:text-[#5c3a21]"
          >
            {uploading ? <LoaderCircle size={20} className="animate-spin" /> : <ImagePlus size={20} />}
            <span className="text-[10px] font-semibold">{uploading ? "Uploading…" : "Add photo"}</span>
          </button>
        )}
      </div>

      {error && <p className="text-[11px] font-semibold text-vibe-coral">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
