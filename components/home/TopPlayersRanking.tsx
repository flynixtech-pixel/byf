"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MapPin, Trophy, User, ChevronDown, Check } from "lucide-react";
import { getTopPlayersLeaderboard, type RankedPlayer } from "@/lib/api/leaderboard";
import { SectionHeading } from "./ui";

const ALL_AREAS = "All areas";
const DEFAULT_AREAS = [
  "All areas",
  "Fatehpura",
  "Sukher",
  "Hiran Magri",
  "Panchwati",
  "Shobhagpura",
  "Bhuwana",
  "Madri",
];
const TOP_N = 20;

/** Convert player's location into hashtag tags e.g. "#Fatehpura", "#Udaipur". */
function areaHashtagsFor(player: RankedPlayer): string[] {
  const areaList = player.areas && player.areas.length > 0 ? player.areas : [player.area || "Fatehpura", player.city || "Udaipur"];
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const a of areaList) {
    if (!a) continue;
    const tag = `#${a.replace(/[^a-zA-Z0-9]/g, "")}`;
    if (tag.length < 2 || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
  }
  return tags.slice(0, 3);
}

/** Gold / silver / bronze for podium, plain slate below it. */
function rankBadgeStyle(rank: number): { style: string; emoji?: string } {
  if (rank === 1) return { style: "bg-amber-400 text-amber-950 font-black shadow-2xs", emoji: "🥇" };
  if (rank === 2) return { style: "bg-slate-300 text-slate-800 font-black shadow-2xs", emoji: "🥈" };
  if (rank === 3) return { style: "bg-amber-600/20 text-amber-900 font-black border border-amber-500/30", emoji: "🥉" };
  return { style: "bg-slate-100 text-slate-600 font-bold" };
}

function usePlayerRankings(area: string) {
  const [data, setData] = useState<{ items: RankedPlayer[]; areas: string[]; loadedKey: string }>({
    items: [],
    areas: DEFAULT_AREAS,
    loadedKey: "",
  });
  const requestKey = area;

  useEffect(() => {
    let cancelled = false;
    getTopPlayersLeaderboard({ area: area === ALL_AREAS ? undefined : area, limit: TOP_N })
      .then((result) => {
        if (cancelled) return;
        setData((prev) => ({
          items: Array.isArray(result?.items) ? result.items : [],
          areas: Array.isArray(result?.areas) && result.areas.length > 0 ? result.areas : prev.areas,
          loadedKey: requestKey,
        }));
      })
      .catch(() => {
        if (!cancelled) setData((prev) => ({ items: [], areas: prev.areas, loadedKey: requestKey }));
      });

    return () => {
      cancelled = true;
    };
  }, [area, requestKey]);

  return { items: data.items, areas: data.areas, loading: data.loadedKey !== requestKey };
}

function CustomAreaDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".custom-area-dropdown")) {
        setOpen(false);
      }
    }
    if (open) {
      window.addEventListener("click", handleClickOutside);
      return () => window.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative inline-block custom-area-dropdown">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-extrabold text-slate-800 shadow-2xs hover:border-brand-400 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
      >
        <MapPin className="h-3.5 w-3.5 text-brand-600 shrink-0" />
        <span>{value}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95">
          <div className="max-h-56 overflow-y-auto space-y-0.5 [scrollbar-width:thin]">
            {options.map((opt) => {
              const isSelected = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-brand-50 text-brand-700 font-black"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-brand-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerRankRow({
  player,
  compact,
  onOpen,
}: {
  player: RankedPlayer;
  compact?: boolean;
  onOpen: () => void;
}) {
  const tags = useMemo(() => areaHashtagsFor(player), [player]);
  const badge = rankBadgeStyle(player.rank);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-2.5 text-left transition duration-200 hover:border-brand-300 hover:shadow-md active:scale-[0.99]"
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs ${badge.style}`}
      >
        {badge.emoji || `#${player.rank}`}
      </span>

      <span
        className={`relative shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 ${
          compact ? "h-11 w-11" : "h-12 w-12"
        }`}
      >
        {player.profileImage ? (
          <Image
            src={player.profileImage}
            alt={player.name}
            fill
            sizes="48px"
            unoptimized
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-600 text-white font-extrabold text-xs">
            {player.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase() || <User className="h-4 w-4 text-white" />}
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate">
          <span className="truncate text-sm font-extrabold text-slate-900 group-hover:text-brand-600 transition-colors">
            {player.name}
          </span>
          {player.username && (
            <span className="truncate text-xs font-medium text-slate-400">{player.username}</span>
          )}
        </span>

        <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-medium text-slate-500">
          <MapPin className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
          {player.area || "Fatehpura"}, {player.city || "Udaipur"}
        </span>

        {tags.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-600 border border-brand-100/60"
              >
                {tag}
              </span>
            ))}
          </span>
        )}
      </span>

      <span className="shrink-0 text-right pr-1">
        <span className="block text-sm font-black text-slate-900">{player.completedBookings}</span>
        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {player.completedBookings === 1 ? "BOOKING" : "BOOKINGS"}
        </span>
      </span>
    </button>
  );
}

export function TopPlayersRanking({
  variant = "desktop",
}: {
  /** "mobile" drops section chrome down to compact home-feed styling. */
  variant?: "desktop" | "mobile";
}) {
  const router = useRouter();
  const [area, setArea] = useState(ALL_AREAS);
  const { items, areas, loading } = usePlayerRankings(area);

  const openPlayerProfile = (player: RankedPlayer) => router.push(`/players/${player.playerId}`);

  const boardContent = (
    <div className="max-h-[20rem] space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-slate-100" />
        ))
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-slate-600">No player rankings available yet.</p>
          <p className="mt-1 text-xs text-slate-400">Complete bookings on BYV to rank on the leaderboard!</p>
        </div>
      ) : (
        items.map((player) => (
          <PlayerRankRow
            key={player.playerId}
            player={player}
            compact={variant === "mobile"}
            onOpen={() => openPlayerProfile(player)}
          />
        ))
      )}
    </div>
  );

  if (variant === "mobile") {
    return (
      <section>
        <div className="rounded-3xl border border-slate-100 bg-white p-3.5 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5">
              Top Players Ranking 🏅
            </h2>
            <CustomAreaDropdown value={area} options={areas} onChange={setArea} />
          </div>

          <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto pb-2 pt-0.5 scrollbar-none mb-1">
            {areas.map((a) => {
              const isSelected = a === area;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setArea(a)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-brand-600 text-white shadow-xs ring-2 ring-brand-300"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {a}
                </button>
              );
            })}
          </div>

          <p className="mb-3 text-[11px] font-medium text-slate-500">
            Top 20 most active players based on completed bookings.
          </p>
          {boardContent}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="BYV Leaderboard"
        title="Top Players Ranking 🏅"
        subtitle="Top 20 most active players based on completed bookings."
        icon={Trophy}
      />
      <div className="w-full rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Ranked by completed bookings
          </p>
          <CustomAreaDropdown value={area} options={areas} onChange={setArea} />
        </div>
        {boardContent}
      </div>
    </section>
  );
}
