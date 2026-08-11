"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Pencil, Trash2, Send } from "lucide-react";
import { Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { createBanner, deleteBanner, listBanners, updateBanner } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { AdBanner } from "@/lib/api/types";
import { readFileAsDataUrl } from "@/lib/files";

const MAX_ACTIVE = 5;

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<AdBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    listBanners()
      .then(setBanners)
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load banners"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activeCount = banners.filter((b) => b.isActive && b._id !== editingId).length;

  function resetForm() {
    setEditingId(null);
    setImageUrl(undefined);
    setTitle("");
    setLinkUrl("");
    setOrder(0);
    setIsActive(true);
  }

  async function handleImage(file: File | undefined) {
    if (!file) return;
    setImageUrl(await readFileAsDataUrl(file));
  }

  async function handleSave() {
    if (!imageUrl) {
      setToast("Upload a banner image first.");
      return;
    }
    setSaving(true);
    try {
      const input = { imageUrl, title: title.trim() || undefined, linkUrl: linkUrl.trim() || undefined, order, isActive };
      if (editingId) {
        await updateBanner(editingId, input);
        setToast("Banner updated");
      } else {
        await createBanner(input);
        setToast("Banner created");
      }
      resetForm();
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to save banner");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(banner: AdBanner) {
    setEditingId(banner._id);
    setImageUrl(banner.imageUrl);
    setTitle(banner.title ?? "");
    setLinkUrl(banner.linkUrl ?? "");
    setOrder(banner.order);
    setIsActive(banner.isActive);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this banner?")) return;
    try {
      await deleteBanner(id);
      setToast("Banner deleted");
      refresh();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to delete banner");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-vibe-violet">Ad Banners</p>
          <h1 className="font-display text-xl font-semibold text-ink">{editingId ? "Edit Banner" : "Add New Banner"}</h1>
          <p className="mt-1 text-xs text-ink-faint">
            Shown in rotation on the customer home page and vendor dashboard. Only the {MAX_ACTIVE} highest-priority active
            banners are shown at a time.
          </p>
        </div>
        <div className="flex gap-2">
          {editingId && (
            <button onClick={resetForm} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-cream-300">
              Cancel Edit
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-vibe-violet px-4 py-2 text-sm font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
          >
            <Send size={14} /> {saving ? "Saving..." : editingId ? "Update Banner" : "Save Banner"}
          </button>
        </div>
      </div>

      {activeCount >= MAX_ACTIVE && isActive && (
        <p className="rounded-lg border border-vibe-amber/40 bg-vibe-amber/10 px-4 py-2 text-xs font-semibold text-vibe-amber">
          {MAX_ACTIVE} banners are already active. Saving this as active will push the lowest-priority one out of rotation.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl2 border border-surface-border bg-white p-5 shadow-panel">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Banner Image</p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files?.[0])} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-40 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed border-surface-border bg-cream-200/40 hover:bg-cream-200"
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="banner" className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
            ) : (
              <>
                <ImagePlus size={20} className="text-ink-faint" />
                <span className="text-xs text-ink-faint">Click to upload banner image (Max 5MB)</span>
              </>
            )}
          </button>

          <label className="mb-1.5 mt-4 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Title (optional)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Summer Slam Tournament"
            className="w-full rounded-lg border border-surface-border bg-cream-200/40 px-3 py-2.5 text-sm outline-none focus:border-vibe-violet"
          />

          <label className="mb-1.5 mt-4 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Link URL (optional)</label>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-surface-border bg-cream-200/40 px-3 py-2.5 text-sm outline-none focus:border-vibe-violet"
          />

          <div className="mt-4 flex items-center gap-6">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Order</label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-24 rounded-lg border border-surface-border bg-cream-200/40 px-3 py-2.5 text-sm outline-none focus:border-vibe-violet"
              />
            </div>
            <label className="mt-5 flex items-center gap-2 text-sm font-semibold text-ink-soft">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded" />
              Active
            </label>
          </div>
        </div>

        <div className="rounded-xl2 bg-vibe-violet p-5 text-white">
          <p className="text-sm font-bold">How this works</p>
          <ul className="mt-2 space-y-1.5 text-xs text-white/85">
            <li>• Only active banners are shown, up to {MAX_ACTIVE} at a time.</li>
            <li>• Lower &ldquo;Order&rdquo; numbers show first in the rotation.</li>
            <li>• Add a Link URL to make a banner clickable, or leave it blank for a static image.</li>
            <li>• The same banners appear on the customer home page and the vendor dashboard.</li>
          </ul>
        </div>
      </div>

      <div>
        <div className="mb-3">
          <p className="font-display font-semibold text-ink">Manage Banners</p>
          <p className="text-xs text-ink-faint">
            {banners.filter((b) => b.isActive).length} active of {banners.length} total.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner) => (
            <div key={banner._id} className="overflow-hidden rounded-xl2 border border-surface-border bg-white shadow-panel">
              <div className="relative h-32 bg-cream-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={banner.imageUrl} alt={banner.title ?? "Banner"} className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
                <div className="absolute right-2 top-2 flex gap-1.5">
                  <button onClick={() => handleEdit(banner)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-vibe-violet shadow">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(banner._id)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-vibe-coral shadow">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <Badge tone={banner.isActive ? "success" : "neutral"}>{banner.isActive ? "ACTIVE" : "INACTIVE"}</Badge>
                  <span className="text-[11px] text-ink-faint">Order {banner.order}</span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-ink">{banner.title || "Untitled banner"}</p>
              </div>
            </div>
          ))}
          {loading && <p className="col-span-full py-6 text-center text-sm text-ink-faint">Loading banners...</p>}
          {!loading && banners.length === 0 && <p className="col-span-full py-6 text-center text-sm text-ink-faint">No banners yet.</p>}
        </div>
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
