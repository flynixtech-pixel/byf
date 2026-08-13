"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, X, Plus, Check } from "lucide-react";
import { suggestAddOnsWithAi, SuggestedAddOnItem } from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";

interface Props {
  onAddAddOn: (item: SuggestedAddOnItem) => void;
  category?: string;
  eventTitle?: string;
  venue?: string;
  type?: string;
}

export function AiAddOnSuggestBot({ onAddAddOn, category, eventTitle, venue, type = "Event" }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedAddOnItem[]>([]);
  const [addedLabels, setAddedLabels] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function fetchAddOns() {
    setLoading(true);
    setError(null);
    try {
      const results = await suggestAddOnsWithAi({
        category,
        eventTitle,
        venue,
        type,
      });
      setSuggestions(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Failed to generate add-on suggestions");
    } finally {
      setLoading(false);
    }
  }

  function handleToggleOpen() {
    if (!open && suggestions.length === 0) {
      fetchAddOns();
    }
    setOpen((prev) => !prev);
  }

  function handleAdd(item: SuggestedAddOnItem) {
    onAddAddOn(item);
    setAddedLabels((prev) => ({ ...prev, [item.label]: true }));
    setTimeout(() => {
      setAddedLabels((prev) => ({ ...prev, [item.label]: false }));
    }, 2000);
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={handleToggleOpen}
        className="inline-flex items-center gap-1 rounded-full bg-vibe-violet/10 hover:bg-vibe-violet/20 px-2.5 py-1 text-xs font-bold text-vibe-violet transition-colors cursor-pointer"
        title="Use AI Bot to suggest popular add-on extras"
      >
        <Sparkles size={12} className="animate-pulse" />
        <span>AI Suggest Add-ons</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 sm:w-80 rounded-xl border border-purple-200 bg-white p-3 shadow-xl backdrop-blur-md space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-vibe-violet">
              <Sparkles size={13} />
              <span>Recommended Add-ons</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>

          {error && <p className="text-[10px] text-rose-500 font-medium">{error}</p>}

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {loading ? "Generating Ideas..." : "1-Click Add Extras:"}
            </p>

            {loading ? (
              <div className="flex h-20 items-center justify-center gap-2 text-xs font-medium text-slate-400">
                <Loader2 size={14} className="animate-spin text-vibe-violet" /> Finding popular extras...
              </div>
            ) : suggestions.length > 0 ? (
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-0.5">
                {suggestions.map((item, idx) => {
                  const isAdded = !!addedLabels[item.label];
                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-purple-100 bg-purple-50/40 p-2 text-xs flex items-center justify-between gap-2 hover:bg-purple-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 truncate">{item.label}</p>
                        <p className="text-[11px] font-medium text-vibe-violet">₹{item.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAdd(item)}
                        disabled={isAdded}
                        className={`inline-flex items-center gap-1 shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                          isAdded
                            ? "bg-emerald-600 text-white"
                            : "bg-vibe-violet text-white hover:bg-vibe-violetSoft"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check size={11} /> Added!
                          </>
                        ) : (
                          <>
                            <Plus size={11} /> Add
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No suggestions available right now.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
