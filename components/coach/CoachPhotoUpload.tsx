"use client";

import { useRef, useState } from "react";
import { Camera, LoaderCircle, UserRoundCog } from "lucide-react";
import { uploadVendorImage } from "@/lib/api/uploads";
import { ApiError } from "@/lib/api/client";

/**
 * WhatsApp-Business style circular avatar with a camera badge. Uploads to the
 * vendor uploads endpoint and returns the hosted URL via `onChange`.
 */
export function CoachPhotoUpload({
  value,
  onChange,
  size = 96,
}: {
  value?: string;
  onChange: (url: string) => void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const { url } = await uploadVendorImage(file, "coaches");
      onChange(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative shrink-0 rounded-full ring-2 ring-[#5c3a21]/20 transition hover:ring-[#5c3a21]/40"
        style={{ height: size, width: size }}
        aria-label="Upload coach photo"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Coach" className="h-full w-full rounded-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-full bg-[#5c3a21]/10 text-[#5c3a21]">
            <UserRoundCog size={size * 0.38} />
          </span>
        )}
        <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#5c3a21] text-white shadow">
          {uploading ? <LoaderCircle size={15} className="animate-spin" /> : <Camera size={15} />}
        </span>
      </button>
      <p className="text-[11px] font-medium text-ink-faint">{uploading ? "Uploading…" : "Tap to add photo"}</p>
      {error && <p className="text-[11px] font-semibold text-vibe-coral">{error}</p>}
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
