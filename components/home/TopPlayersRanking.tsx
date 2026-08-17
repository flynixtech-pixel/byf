"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Trophy, User, ChevronDown, Check, ArrowRight, Crown, Medal, Award } from "lucide-react";
import { getTopPlayersLeaderboard, type RankedPlayer } from "@/lib/api/leaderboard";
import { restoreCustomerSession, type CustomerProfile } from "@/lib/api/auth";
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
/** Gold / silver / bronze for podium, plain slate below it. */
function rankBadgeStyle(rank: number | string) {
  if (rank === 1) return { style: "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 font-black shadow-md", icon: <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 drop-shadow-sm" />, wrapperStyle: "bg-gradient-to-r from-amber-50 to-white border-amber-200 shadow-[0_4px_12px_-4px_rgba(251,191,36,0.3)]" };
  if (rank === 2) return { style: "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 font-black shadow-sm", icon: <Medal className="h-3.5 w-3.5 sm:h-4 sm:w-4 drop-shadow-sm" />, wrapperStyle: "bg-gradient-to-r from-slate-50 to-white border-slate-200 shadow-sm" };
  if (rank === 3) return { style: "bg-gradient-to-br from-orange-300 to-orange-500 text-orange-950 font-black shadow-sm", icon: <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 drop-shadow-sm" />, wrapperStyle: "bg-gradient-to-r from-orange-50/30 to-white border-orange-200 shadow-sm" };
  if (typeof rank === "string") return { style: "bg-slate-100 text-slate-500 font-bold text-[10px]", wrapperStyle: "bg-brand-50 border-brand-200 shadow-sm" };
  return { style: "bg-slate-100 text-slate-600 font-bold" };
}

function usePlayerRankings(area: string) {
  const [data, setData] = useState<{ items: RankedPlayer[]; areas: string[]; loadedKey: string }>({
    items: [],
    areas: DEFAULT_AREAS,
    loadedKey: "",
  });
  const [currentUser, setCurrentUser] = useState<CustomerProfile | null>(null);
  const requestKey = area;

  useEffect(() => {
    restoreCustomerSession().then(setCurrentUser);
  }, []);

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

  return { items: data.items, areas: data.areas, loading: data.loadedKey !== requestKey, currentUser };
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
  isMe,
}: {
  player: RankedPlayer | any;
  compact?: boolean;
  onOpen?: () => void;
  isMe?: boolean;
}) {
  const tags = useMemo(() => areaHashtagsFor(player as any), [player]);
  const badge = rankBadgeStyle(player.rank);

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      className={`group flex w-full items-center gap-2 sm:gap-2.5 rounded-xl border p-1.5 sm:p-2 text-left transition duration-200 ${
        isMe ? "border-brand-300 bg-gradient-to-r from-brand-50/80 to-white shadow-sm shadow-brand-500/10" : "border-slate-100 bg-white hover:border-brand-200 hover:shadow-sm active:scale-[0.99]"
      } ${badge.wrapperStyle || ""} ${!onOpen ? "cursor-default" : ""}`}
    >
      <span
        className={`flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg text-[9px] sm:text-[10px] ${badge.style}`}
      >
        {badge.icon || (typeof player.rank === 'number' ? `#${player.rank}` : player.rank)}
      </span>

      <span
        className={`relative shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 ${
          compact ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10"
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
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase() || <User className="h-4 w-4 text-white" />}
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate">
          <span className="truncate text-[13px] sm:text-[15px] font-display italic font-bold text-slate-900 group-hover:text-brand-600 transition-colors drop-shadow-sm">
            {player.name}
          </span>
          {player.username && (
            <span className="truncate text-[9px] sm:text-[10px] font-medium text-slate-400">{player.username}</span>
          )}
        </span>

        <span className="mt-0.5 flex items-center gap-1 truncate text-[10px] sm:text-[11px] font-medium text-slate-500">
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
        <span className="block text-xs sm:text-sm font-black text-slate-900">{player.completedBookings}</span>
        <span className="block text-[8px] sm:text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {player.completedBookings === 1 ? "BOOKING" : "BOOKINGS"}
        </span>
      </span>
    </button>
  );
}

export function TopPlayersRanking({
  variant = "desktop",
  fullPage = false,
}: {
  /** "mobile" drops section chrome down to compact home-feed styling. */
  variant?: "desktop" | "mobile";
  fullPage?: boolean;
}) {
  const router = useRouter();
  const [area, setArea] = useState(ALL_AREAS);
  const { items, areas, loading, currentUser } = usePlayerRankings(area);

  const openPlayerProfile = (player: RankedPlayer) => router.push(`/players/${player.playerId}`);

  const top3 = items.slice(0, 3);
  const displayItems = fullPage ? items : top3;

  const userRankData = currentUser ? items.find(p => p.playerId === currentUser.id) : null;
  const meInTop3 = userRankData && top3.some((p) => p.playerId === userRankData.playerId);
  const me: RankedPlayer | null = currentUser
    ? (userRankData || {
        playerId: currentUser.id,
        name: currentUser.name || "You",
        profileImage: currentUser.avatarUrl,
        city: "",
        completedBookings: 0,
        rank: items.length > 0 ? "Unranked" : "-",
      } as any)
    : null;

  const showPinnedMe = me && (!fullPage ? !meInTop3 : !userRankData);
  const hasMore = items.length > 3;

  const boardContent = (
    <div className="flex flex-col">
      <div className="space-y-1.5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[52px] animate-pulse rounded-xl bg-slate-100" />
          ))
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
            <p className="text-sm font-semibold text-slate-600">No player rankings available yet.</p>
            <p className="mt-1 text-xs text-slate-400">Complete bookings on BYV to rank on the leaderboard!</p>
          </div>
        ) : (
          displayItems.map((player) => (
            <PlayerRankRow
              key={player.playerId}
              player={player}
              compact={variant === "mobile"}
              onOpen={() => openPlayerProfile(player)}
            />
          ))
        )}
      </div>

      {showPinnedMe && !loading && items.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2 px-1">Your Ranking</p>
          <PlayerRankRow
            player={me!}
            compact={variant === "mobile"}
            isMe={true}
            onOpen={currentUser && userRankData ? () => openPlayerProfile(me as RankedPlayer) : undefined}
          />
        </div>
      )}

      {hasMore && !loading && !fullPage && (
        <div className="mt-4 flex justify-center">
          <Link
            href="/leaderboard"
            className="flex items-center gap-1.5 rounded-full bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 active:scale-95"
          >
            View All Players
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
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
    <section className="mx-auto max-w-7xl px-3 py-4 sm:py-8 mt-2 sm:mt-4 sm:px-6 lg:px-8">
      <div className="hidden sm:block">
        <SectionHeading
          eyebrow="Hall of Fame"
          title="Top Players 🏅"
          subtitle="The elite. Top 20 most active players based on bookings."
        />
      </div>
      <div className="w-full rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-3.5 sm:p-5 shadow-sm">
        <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2 sm:gap-3">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-slate-400">
            Ranked by completed bookings
          </p>
          <CustomAreaDropdown value={area} options={areas} onChange={setArea} />
        </div>
        {boardContent}
      </div>
    </section>
  );
}
