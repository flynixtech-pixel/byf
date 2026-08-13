"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, X, RefreshCw } from "lucide-react";
import { suggestEventNamesWithAi } from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";

interface Props {
  onSelectName: (name: string) => void;
  category?: string;
  venue?: string;
  type?: string;
}

export function AiNameSuggestBot({ onSelectName, category, venue, type = "Event" }: Props) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
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

  async function generateNames(customKw?: string) {
    const kw = customKw !== undefined ? customKw : keyword;
    setLoading(true);
    setError(null);
    try {
      const results = await suggestEventNamesWithAi({
        category,
        venue,
        keyword: kw,
        type,
      });
      setSuggestions(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Failed to generate names");
    } finally {
      setLoading(false);
    }
  }

  function handleToggleOpen() {
    if (!open && suggestions.length === 0) {
      generateNames("");
    }
    setOpen((prev) => !prev);
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={handleToggleOpen}
        className="inline-flex items-center gap-1 rounded-full bg-vibe-violet/10 hover:bg-vibe-violet/20 px-2.5 py-0.5 text-[10px] font-bold text-vibe-violet transition-colors cursor-pointer"
        title="Use AI Bot to generate catchy event names"
      >
        <Sparkles size={11} className="animate-pulse" />
        <span>Need AI Name?</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-72 sm:w-80 rounded-xl border border-purple-200 bg-white p-3 shadow-xl backdrop-blur-md space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-vibe-violet">
              <Sparkles size={13} />
              <span>Grok AI Name Assistant</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={12} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  generateNames();
                }
              }}
              placeholder="Topic / Keyword (e.g. Marathon, DJ, Trek)"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs outline-none focus:border-vibe-violet placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => generateNames()}
              disabled={loading}
              className="shrink-0 rounded-lg bg-vibe-violet px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-vibe-violetSoft disabled:opacity-50"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            </button>
          </div>

          {error && <p className="text-[10px] text-rose-500 font-medium">{error}</p>}

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {loading ? "Generating Catchy Names..." : "Click to select a name:"}
            </p>

            {loading ? (
              <div className="flex h-16 items-center justify-center gap-2 text-xs font-medium text-slate-400">
                <Loader2 size={14} className="animate-spin text-vibe-violet" /> AI is thinking...
              </div>
            ) : suggestions.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {suggestions.map((name, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onSelectName(name);
                      setOpen(false);
                    }}
                    className="w-full rounded-lg border border-purple-100 bg-purple-50/50 px-2.5 py-1.5 text-left text-xs font-medium text-slate-800 hover:border-vibe-violet hover:bg-vibe-violet/10 hover:text-vibe-violet transition-all flex items-center justify-between group"
                  >
                    <span>{name}</span>
                    <span className="text-[10px] text-vibe-violet opacity-0 group-hover:opacity-100 font-semibold transition-opacity">
                      Use ↵
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Type a keyword above and click generate.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
