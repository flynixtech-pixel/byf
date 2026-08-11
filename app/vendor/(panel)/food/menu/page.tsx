"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Camera,
  ChevronDown,
  FileSpreadsheet,
  Image as ImageIcon,
  LoaderCircle,
  Pencil,
  Plus,
  Store,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { PageHero, SectionCard, Badge } from "@/components/vendor/ui";
import { Toast } from "@/components/admin/Toast";
import { VariantPricingEditor } from "@/components/food/VariantPricingEditor";
import { CategoryPrepTimeEditor } from "@/components/food/CategoryPrepTimeEditor";
import { MENU_CATEGORY_PRESETS } from "@/lib/foodTaxonomy";
import { uploadVendorImage } from "@/lib/api/uploads";
import {
  bulkUploadMenuItems,
  createVendorMenuItem,
  deleteVendorMenuItem,
  listVendorMenu,
  listVendorOutlets,
  updateVendorMenuItem,
  type MenuItemInput,
} from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";
import type { FoodOutlet, MenuItem, PriceVariant } from "@/lib/api/types";

interface ItemDraft {
  name: string;
  category: string;
  customCategory: string;
  price: string;
  description: string;
  photo: string;
  prepTimeMins: string;
  priceVariants: PriceVariant[];
}

const emptyItem: ItemDraft = {
  name: "",
  category: MENU_CATEGORY_PRESETS[0]!,
  customCategory: "",
  price: "",
  description: "",
  photo: "",
  prepTimeMins: "",
  priceVariants: [],
};

const CUSTOM_CATEGORY = "__custom__";

export default function VendorFoodMenuPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-sm text-ink-faint">Loading menu…</p>}>
      <MenuPageContent />
    </Suspense>
  );
}

function MenuPageContent() {
  const searchParams = useSearchParams();
  const [outlets, setOutlets] = useState<FoodOutlet[]>([]);
  const [outletId, setOutletId] = useState<string>("");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<ItemDraft>(emptyItem);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; errors: { row: number; reason: string }[] } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);

  // Load outlets once; auto-select single outlet or honour ?outlet= param.
  useEffect(() => {
    listVendorOutlets()
      .then((list) => {
        setOutlets(list);
        const param = searchParams.get("outlet");
        if (param && list.some((o) => o._id === param)) setOutletId(param);
        else if (list.length >= 1) setOutletId(list[0]!._id);
        else setLoading(false);
      })
      .catch((err) => {
        setToast(err instanceof ApiError ? err.describe() : "Failed to load restaurants");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshItems = useCallback(() => {
    if (!outletId) return;
    listVendorMenu({ outletId })
      .then(setItems)
      .catch((err) => setToast(err instanceof ApiError ? err.describe() : "Failed to load menu"))
      .finally(() => setLoading(false));
  }, [outletId]);

  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  const activeOutlet = outlets.find((o) => o._id === outletId) ?? null;
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.category || "General"));
    return Array.from(set).sort();
  }, [items]);

  function set<K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function resolvedCategory(): string {
    return draft.category === CUSTOM_CATEGORY ? draft.customCategory.trim() : draft.category;
  }

  function reset() {
    setDraft(emptyItem);
    setEditingId(null);
  }

  function startEdit(item: MenuItem) {
    setEditingId(item._id);
    const isPreset = MENU_CATEGORY_PRESETS.includes(item.category);
    setDraft({
      name: item.name,
      category: isPreset ? item.category : CUSTOM_CATEGORY,
      customCategory: isPreset ? "" : item.category,
      price: item.priceVariants.length > 0 ? "" : String(item.price),
      description: item.description ?? "",
      photo: item.photo ?? "",
      prepTimeMins: item.prepTimeMins ? String(item.prepTimeMins) : "",
      priceVariants: item.priceVariants ?? [],
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handlePhoto(file: File) {
    setPhotoUploading(true);
    try {
      const { url } = await uploadVendorImage(file, "menu");
      set("photo", url);
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Photo upload failed");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleSubmit() {
    if (!outletId) return setToast("Create a restaurant profile first.");
    if (draft.name.trim().length < 2) return setToast("Enter the dish name.");
    const category = resolvedCategory();
    if (!category) return setToast("Pick or type a category.");
    const hasVariants = draft.priceVariants.length > 0;
    if (hasVariants && draft.priceVariants.some((v) => !v.label.trim() || v.price <= 0)) {
      return setToast("Every size needs a name and a price.");
    }
    if (!hasVariants && (!draft.price || Number(draft.price) <= 0)) {
      return setToast("Enter a price (or add size-wise pricing).");
    }

    const payload: MenuItemInput = {
      outletId,
      name: draft.name.trim(),
      category,
      price: hasVariants ? Math.min(...draft.priceVariants.map((v) => v.price)) : Number(draft.price),
      description: draft.description.trim() || undefined,
      photo: draft.photo || undefined,
      prepTimeMins: draft.prepTimeMins ? Number(draft.prepTimeMins) : undefined,
      priceVariants: draft.priceVariants,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateVendorMenuItem(editingId, payload);
        setToast(`"${draft.name}" updated`);
      } else {
        await createVendorMenuItem(payload);
        setToast(`"${draft.name}" added`);
      }
      reset();
      refreshItems();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStock(item: MenuItem) {
    try {
      await updateVendorMenuItem(item._id, { inStock: !item.inStock });
      refreshItems();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to update item");
    }
  }

  async function handleDelete(item: MenuItem) {
    if (!window.confirm(`Remove "${item.name}" from the menu?`)) return;
    try {
      await deleteVendorMenuItem(item._id);
      setToast(`Removed ${item.name}`);
      refreshItems();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to remove item");
    }
  }

  async function handleSheet(file: File) {
    if (!outletId) return setToast("Create a restaurant profile first.");
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const result = await bulkUploadMenuItems(outletId, file);
      setBulkResult(result);
      setToast(`${result.created} item(s) added from the sheet`);
      refreshItems();
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Bulk upload failed");
    } finally {
      setBulkUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Food Owner"
        title="Menu Management"
        description="Pick a restaurant, then build its menu — categories, dishes, photos & size-wise pricing."
        right={
          <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold">
            <UtensilsCrossed size={16} /> {items.length} Item(s)
          </span>
        }
      />

      {/* Restaurant selector */}
      {outlets.length === 0 && !loading ? (
        <SectionCard title="No restaurant yet" description="Create a restaurant profile first — the menu lives inside it.">
          <Link
            href="/vendor/food/profile"
            className="inline-flex items-center gap-2 rounded-lg bg-vibe-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft"
          >
            <Store size={16} /> Create Restaurant Profile
          </Link>
        </SectionCard>
      ) : (
        outlets.length > 1 && (
          <div className="flex items-center gap-3 rounded-xl2 border border-surface-border bg-surface-card p-4 shadow-panel">
            <Store size={18} className="shrink-0 text-vibe-violet" />
            <div className="relative flex-1">
              <select
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-surface-border bg-white px-3 py-2.5 pr-9 text-sm font-semibold outline-none focus:border-vibe-violet"
              >
                {outlets.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.name}
                    {o.location?.city ? ` — ${o.location.city}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            </div>
          </div>
        )
      )}

      {activeOutlet && (
        <>
          {/* Add / edit item */}
          <SectionCard
            title={editingId ? "Edit Dish" : `Add Dish — ${activeOutlet.name}`}
            description="Thumbnail, name & price. Add size-wise pricing for items like juices (Standard/Medium/Large)."
          >
            <div className="flex flex-col gap-4 sm:flex-row">
              {/* Thumbnail */}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-dashed border-surface-border text-ink-faint transition hover:border-vibe-violet hover:text-vibe-violet"
              >
                {draft.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.photo} alt="Dish" className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
                ) : (
                  <span className="flex h-full w-full flex-col items-center justify-center gap-1">
                    {photoUploading ? <LoaderCircle size={20} className="animate-spin" /> : <Camera size={20} />}
                    <span className="text-[10px] font-semibold">{photoUploading ? "Uploading…" : "Thumbnail"}</span>
                  </span>
                )}
                {draft.photo && (
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    Change
                  </span>
                )}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handlePhoto(f);
                  e.target.value = "";
                }}
              />

              <div className="grid flex-1 gap-4 sm:grid-cols-2">
                <Field label="Dish name" placeholder="Paneer Tikka Roll" value={draft.name} onChange={(v) => set("name", v)} />
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Category</label>
                  <div className="relative">
                    <select
                      value={draft.category}
                      onChange={(e) => set("category", e.target.value)}
                      className="w-full appearance-none rounded-lg border border-surface-border bg-white px-3 py-2.5 pr-9 text-sm outline-none focus:border-vibe-violet"
                    >
                      {MENU_CATEGORY_PRESETS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value={CUSTOM_CATEGORY}>Other — type my own…</option>
                    </select>
                    <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                  </div>
                  {draft.category === CUSTOM_CATEGORY && (
                    <input
                      value={draft.customCategory}
                      onChange={(e) => set("customCategory", e.target.value)}
                      placeholder="e.g. Mexican"
                      className="mt-2 w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet placeholder:text-ink-faint"
                    />
                  )}
                </div>
                {draft.priceVariants.length === 0 && (
                  <Field
                    label="Price ₹"
                    placeholder="120"
                    value={draft.price}
                    onChange={(v) => set("price", v.replace(/\D/g, ""))}
                  />
                )}
                <Field
                  label="Prep time (mins, optional)"
                  placeholder="15"
                  value={draft.prepTimeMins}
                  onChange={(v) => set("prepTimeMins", v.replace(/\D/g, ""))}
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Description (optional)"
                    placeholder="Short description customers will see"
                    value={draft.description}
                    onChange={(v) => set("description", v)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-surface-border pt-4">
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Size-wise pricing (optional)
              </label>
              <VariantPricingEditor value={draft.priceVariants} onChange={(v) => set("priceVariants", v)} />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-vibe-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-60"
              >
                <Plus size={16} /> {saving ? "Saving..." : editingId ? "Save Changes" : "Add Dish"}
              </button>
              {editingId && (
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-5 py-2.5 text-sm font-semibold text-ink-faint hover:bg-surface-hover"
                >
                  <X size={16} /> Cancel
                </button>
              )}
            </div>
          </SectionCard>

          {/* Bulk Excel upload */}
          <SectionCard
            title="Bulk Upload via Excel"
            description={'Upload a sheet with columns "Item Name", "Price", optional "Category" & "Description" — all rows get added at once.'}
          >
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => sheetInputRef.current?.click()}
                disabled={bulkUploading}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-surface-border px-5 py-3 text-sm font-semibold text-ink-soft transition hover:border-vibe-violet hover:text-vibe-violet disabled:opacity-60"
              >
                {bulkUploading ? <LoaderCircle size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                {bulkUploading ? "Uploading…" : "Choose Excel / CSV file"}
              </button>
              <p className="text-xs text-ink-faint">.xlsx, .xls or .csv · max 500 rows</p>
            </div>
            <input
              ref={sheetInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleSheet(f);
                e.target.value = "";
              }}
            />
            {bulkResult && (
              <div className="mt-4 rounded-lg bg-cream-200/60 p-4 text-sm">
                <p className="font-semibold text-ink">{bulkResult.created} item(s) added.</p>
                {bulkResult.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-semibold text-vibe-coral">{bulkResult.errors.length} row(s) skipped:</p>
                    {bulkResult.errors.slice(0, 8).map((e) => (
                      <p key={e.row} className="text-xs text-ink-faint">Row {e.row}: {e.reason}</p>
                    ))}
                    {bulkResult.errors.length > 8 && (
                      <p className="text-xs text-ink-faint">…and {bulkResult.errors.length - 8} more</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Per-category prep times — these drive the player's checkout ETA */}
          <CategoryPrepTimeEditor
            outlet={activeOutlet}
            categories={categories}
            onSaved={(updated) => setOutlets((list) => list.map((o) => (o._id === updated._id ? updated : o)))}
            onToast={setToast}
          />

          {/* Menu grouped by category */}
          <SectionCard title={`Menu — ${activeOutlet.name}`} description="Grouped by category. Tap the stock badge to mark items unavailable.">
            {loading ? (
              <p className="py-8 text-center text-sm text-ink-faint">Loading menu…</p>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-faint">No dishes yet — add your first one above.</p>
            ) : (
              <div className="space-y-6">
                {categories.map((cat) => (
                  <div key={cat}>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-vibe-violet">
                      {cat} · {items.filter((i) => (i.category || "General") === cat).length}
                    </p>
                    <div className="divide-y divide-surface-border rounded-xl border border-surface-border">
                      {items
                        .filter((i) => (i.category || "General") === cat)
                        .map((item) => (
                          <div key={item._id} className="flex flex-wrap items-center gap-3 p-3">
                            {item.photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.photo} alt={item.name} className="h-14 w-14 shrink-0 rounded-lg object-cover"
            loading="lazy"
            decoding="async"
          />
                            ) : (
                              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-cream-200 text-ink-faint">
                                <ImageIcon size={18} />
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                              <p className="text-xs text-ink-faint">
                                {item.priceVariants.length > 0
                                  ? item.priceVariants.map((v) => `${v.label} ₹${v.price}`).join(" · ")
                                  : `₹${item.price}`}
                                {item.prepTimeMins ? ` · ~${item.prepTimeMins} min` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleToggleStock(item)} title="Toggle stock">
                                <Badge tone={item.inStock ? "success" : "neutral"}>{item.inStock ? "In Stock" : "Out of Stock"}</Badge>
                              </button>
                              <button
                                onClick={() => startEdit(item)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-vibe-violet hover:bg-vibe-violet/10"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-vibe-coral hover:bg-vibe-coral/10"
                                title="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-vibe-violet placeholder:text-ink-faint"
      />
    </div>
  );
}
