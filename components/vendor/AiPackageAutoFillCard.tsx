"use client";

import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Wand2 } from "lucide-react";
import { generateVendorPackageWithAi, VendorPackageAiResponse } from "@/lib/api/vendor";
import { ApiError } from "@/lib/api/client";

interface Props {
  packageName?: string;
  category?: string;
  type?: string;
  onApplyPackage: (data: VendorPackageAiResponse) => void;
}

export function AiPackageAutoFillCard({
  packageName,
  category,
  type = "Turf",
  onApplyPackage,
}: Props) {
  const [promptText, setPromptText] = useState(packageName || "");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    const topic = promptText.trim() || packageName?.trim() || category || "Vendor Package";
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const data = await generateVendorPackageWithAi({
        prompt: topic,
        packageName,
        category,
        type,
      });

      onApplyPackage(data);
      setSuccessMsg(`Generated complete offer details for "${data.packageName}"!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : "Failed to generate package. Please try again.");
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
                Generate Vendor Package with AI
              </h4>
              <span className="rounded-full bg-vibe-violet/15 px-2 py-0.5 text-[9px] font-bold text-vibe-violet uppercase tracking-wider">
                Dedicated Package AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Auto-fills Package Name, Description, Duration, Price, Inclusions, Exclusions, Highlights &amp; FAQs.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
        <div className="relative flex-1">
          <input
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Describe your package offer (e.g. Weekend Night Cricket Membership)..."
            className="w-full rounded-xl border border-purple-200/80 bg-white/90 px-3.5 py-2.5 text-xs text-slate-800 font-medium shadow-inner outline-none focus:border-vibe-violet focus:bg-white placeholder:text-slate-400"
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-vibe-violet px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-vibe-violetSoft disabled:opacity-60 cursor-pointer shrink-0"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Generating Package...</span>
            </>
          ) : (
            <>
              <Wand2 size={14} />
              <span>Generate Package with AI</span>
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
