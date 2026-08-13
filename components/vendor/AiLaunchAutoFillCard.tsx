"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Wand2 } from "lucide-react";
import { generateLaunchDetailsWithAi, GeneratedLaunchDetails } from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";

interface Props {
  eventTitle: string;
  category?: string;
  venue?: string;
  type?: string;
  onApplyLaunchDetails: (data: GeneratedLaunchDetails) => void;
}

export function AiLaunchAutoFillCard({
  eventTitle,
  category,
  venue,
  type = "Event",
  onApplyLaunchDetails,
}: Props) {
  const [promptTitle, setPromptTitle] = useState(eventTitle || "");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Synchronize promptTitle when eventTitle updates initially
  useEffect(() => {
    if (eventTitle && !promptTitle) {
      setPromptTitle(eventTitle);
    }
  }, [eventTitle]);

  async function handleFillWithAi() {
    const titleToUse = promptTitle.trim() || eventTitle.trim() || "Special Event";
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const data = await generateLaunchDetailsWithAi({
        eventTitle: titleToUse,
        category,
        venue,
        type,
      });

      onApplyLaunchDetails(data);
      setSuccessMsg(`Generated & auto-filled description, inclusions, highlights, tags & FAQs for "${titleToUse}"!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Failed to generate details. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-purple-200/80 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-vibe-violet/10 p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-vibe-violet text-white shadow-sm">
            <Sparkles size={15} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                Auto-Fill Launch Details with Grok AI
              </h4>
              <span className="rounded-full bg-vibe-violet/15 px-2 py-0.5 text-[9px] font-bold text-vibe-violet uppercase tracking-wider">
                AI Powered
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Fetched your event name by default. Edit or click Fill with AI to auto-generate Description, Inclusions, Highlights &amp; Tags.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
        <div className="relative flex-1">
          <input
            value={promptTitle}
            onChange={(e) => setPromptTitle(e.target.value)}
            placeholder="Event name or topic..."
            className="w-full rounded-xl border border-purple-200/80 bg-white/90 px-3.5 py-2.5 text-xs text-slate-800 font-medium shadow-inner outline-none focus:border-vibe-violet focus:bg-white placeholder:text-slate-400"
          />
          {promptTitle && (
            <span className="absolute right-3 top-3 text-[10px] text-slate-400 font-semibold uppercase tracking-wider hidden sm:inline">
              Event Title
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleFillWithAi}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-vibe-violet px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-vibe-violetSoft disabled:opacity-60 cursor-pointer shrink-0"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Generating Copy...</span>
            </>
          ) : (
            <>
              <Wand2 size={14} />
              <span>Fill with AI</span>
            </>
          )}
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-medium text-emerald-800 animate-in fade-in duration-200">
          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-800 animate-in fade-in duration-200">
          <AlertCircle size={14} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
