"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Check,
  Clipboard,
  Crown,
  Download,
  Eye,
  Flame,
  MapPin,
  Medal,
  MessageCircle,
  Search,
  Send,
  Share2,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { useCustomerAuth } from "@/components/providers/CustomerAuthProvider";
import { LoginModal } from "@/components/home/modals/LoginModal";
import { SignupModal } from "@/components/home/modals/SignupModal";
import { browseVenues, getVenueAvailability } from "@/lib/api/venues";
import type { Listing } from "@/lib/api/types";
import { SPORT_CATEGORIES } from "@/lib/taxonomy";
import {
  createChallenge,
  listChallengePlayers,
  type Challenge,
  type ChallengeMatchStyle,
  type ChallengePlayer,
  type ChallengePlayersCount,
  type ChallengeSeries,
  type ChallengeStakeType,
  type ChallengeTeamMember,
} from "@/lib/api/challenges";

type Step = "sport" | "schedule" | "arena" | "teams" | "details" | "stakes" | "poster" | "share";
type Opponent = ChallengePlayer & { isInvite?: boolean };
/** A player added to a team roster in the Team 1 / Team 2 builder. */
type RosterMember = { id?: string; name: string; phone?: string };

const NO_PLAYERS: Opponent[] = [];

/** Assumed match length for checking whether a turf is free at the chosen time —
 * challenges aren't billed slots, so this is just a soft availability guide. */
const CHALLENGE_DURATION_MIN = 60;

function to24h(t12: string): string {
  const [time, ap] = t12.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  const aE = aEnd <= aStart ? aEnd + 1440 : aEnd;
  const bE = bEnd <= bStart ? bEnd + 1440 : bEnd;
  return aStart < bE && bStart < aE;
}

/** Next 8 real calendar days — replaces vague "Saturday/Sunday" labels with actual dates. */
function buildDateOptions(): { iso: string; label: string }[] {
  const opts: { iso: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label =
      i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
    opts.push({ iso, label });
  }
  return opts;
}

/** Every half-hour from 6 AM to 11 PM — generated, not a fixed handful of presets,
 * so the player can pick any realistic start time instead of just a few slots. */
function buildTimeOptions(): string[] {
  const times: string[] = [];
  for (let mins = 6 * 60; mins <= 23 * 60; mins += 30) {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const ap = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 || 12;
    times.push(`${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`);
  }
  return times;
}

const SPORTS = [
  { label: "Cricket", image: "/bat.png" },
  { label: "Badminton", image: "/badminton.png" },
  { label: "Table Tennis", image: "/tabletennis.png" },
  { label: "Pickleball", image: "/pickball.png" },
  { label: "Football", image: "/football.png" },
  { label: "Basketball", emoji: "🏀" },
  { label: "Pool", emoji: "8" },
  { label: "Gaming", emoji: "🎮" },
  { label: "Other Match", emoji: "+" },
] as const;

// Valid player-count options for each sport — only these show up, and the first is the default.
// Cricket is inherently a team match, so it alone gets the "team" format; every other
// sport/game is played 1v1 or 2v2.
const GAME_PLAYER_COUNT_OPTIONS: Record<string, ChallengePlayersCount[]> = {
  Cricket: ["team"],
  Badminton: ["1v1", "2v2"],
  "Table Tennis": ["1v1", "2v2"],
  Pickleball: ["1v1", "2v2"],
  Football: ["1v1", "2v2"],
  Basketball: ["1v1", "2v2"],
  Pool: ["1v1", "2v2"],
  Gaming: ["1v1", "2v2"],
  "Other Match": ["1v1", "2v2"],
};

// Best-of series only makes sense for game-based sports, not single-match team sports.
const GAME_SUPPORTS_SERIES = new Set(["Cricket", "Badminton", "Table Tennis", "Pickleball", "Pool"]);

// Venue listings store the taxonomy's category *id* (e.g. "cricket"), not its display
// label ("Cricket") — this maps the challenge's sport label to that id so venue
// filtering actually matches. Sports outside the venue taxonomy (Pool, Gaming, Other
// Match) have no id and fall back to showing every turf.
function sportCategoryId(sportLabel: string): string | undefined {
  return SPORT_CATEGORIES.find((c) => c.label === sportLabel)?.id;
}

const STAKES: { type: ChallengeStakeType; label: string; icon: string; copy: string }[] = [
  { type: "Treat", label: "Treat", icon: "🍕", copy: "Loser buys a treat (food, coffee, or snacks)" },
  { type: "Movie", label: "Movie", icon: "🎬", copy: "Loser buys movie tickets" },
  { type: "Cash", label: "Cash", icon: "💰", copy: "Loser pays the pool" },
  { type: "Trophy", label: "Trophy", icon: "🏆", copy: "Winner gets trophy rights" },
  { type: "Apology Post", label: "Apology Post", icon: "📸", copy: "Loser posts an apology on Instagram" },
  { type: "Reel", label: "Reel", icon: "😂", copy: "Loser makes a reel" },
];

const TIME_OPTIONS = buildTimeOptions();

const DETAILS = {
  playerCounts: ["1v1", "2v2", "team"] as ChallengePlayersCount[],
  series: ["BO1", "BO3", "BO5"] as ChallengeSeries[],
  styles: ["friendly", "competitive", "tournament"] as ChallengeMatchStyle[],
  fees: [0, 100, 250, 500],
};

const RECENT_CHALLENGES_KEY = "byv_recent_challenges";

function saveRecentChallenge(challenge: Challenge) {
  if (typeof window === "undefined") return;
  try {
    const existing: Challenge[] = JSON.parse(window.localStorage.getItem(RECENT_CHALLENGES_KEY) ?? "[]");
    const next = [challenge, ...existing.filter((c) => c.code !== challenge.code)].slice(0, 20);
    window.localStorage.setItem(RECENT_CHALLENGES_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable — skip persistence silently.
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function localChallenge(input: {
  challengerName: string;
  team1: RosterMember[];
  team2: RosterMember[];
  sport: string;
  venueName: string;
  scheduleLabel: string;
  playersCount: ChallengePlayersCount;
  series: ChallengeSeries;
  matchStyle: ChallengeMatchStyle;
  entryFee: number;
  stakeType: ChallengeStakeType;
  stakeText: string;
}): Challenge {
  const code = `CHAL${Math.floor(100 + Math.random() * 900)}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://bookyourvibe.com";
  const inviteUrl = `${origin}/challenge/${code}`;
  const opponent = input.team2[0];
  const shareMessage = [
    "You've been challenged!",
    `${input.challengerName} has challenged ${opponent.name} for a ${input.sport}.`,
    `Venue: ${input.venueName}`,
    `Time: ${input.scheduleLabel}`,
    `Bet: Loser buys ${input.stakeText}`,
    inviteUrl,
  ].join("\n");

  return {
    id: code,
    code,
    challenger: { id: "local", name: input.challengerName },
    opponent: { id: opponent.id, name: opponent.name, phone: opponent.phone },
    team1Members: input.team1,
    team2Members: input.team2,
    sport: input.sport,
    venueName: input.venueName,
    scheduleLabel: input.scheduleLabel,
    playersCount: input.playersCount,
    series: input.series,
    matchStyle: input.matchStyle,
    entryFee: input.entryFee,
    stakeType: input.stakeType,
    stakeText: input.stakeText,
    inviteUrl,
    shareMessage,
    status: "pending",
    createdAt: new Date().toISOString(),
    poster: { challengerInitials: initials(input.challengerName), opponentInitials: initials(opponent.name) },
  };
}

export function ChallengeFlow({ onClose }: { onClose: () => void }) {
  const { customer, status } = useCustomerAuth();
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<Step>("sport");
  const [players, setPlayers] = useState<Opponent[]>(NO_PLAYERS);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [search, setSearch] = useState("");
  // Team 1 / Team 2 roster builder — replaces the old single-opponent picker.
  const [team1, setTeam1] = useState<RosterMember[]>([]);
  const [team2, setTeam2] = useState<RosterMember[]>([]);
  const [sport, setSport] = useState("Other Match");
  const [venues, setVenues] = useState<Listing[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  // Booked ranges per venue for the chosen date — the source of truth for which start
  // times are really open. Availability for every time is worked out locally from this.
  const [venueRanges, setVenueRanges] = useState<Record<string, { startTime: string; endTime: string }[]>>({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [venueName, setVenueName] = useState("");
  // Set only when venueName came from a real listing — lets that venue's vendor verify
  // the challenge QR at the door. Free-text venues (none currently, but kept defensive) won't have one.
  const [venueId, setVenueId] = useState("");
  const dateOptions = useMemo(() => buildDateOptions(), []);
  const [dateIso, setDateIso] = useState(dateOptions[0].iso);
  // Default to the next half-hour mark so the picker opens on a realistic upcoming time.
  const [timeLabel, setTimeLabel] = useState(() => {
    const now = new Date();
    const roundedMins = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 30) * 30;
    return TIME_OPTIONS.find((t) => timeToMinutes(to24h(t)) >= roundedMins) ?? TIME_OPTIONS[0];
  });
  const [endTimeLabel, setEndTimeLabel] = useState("");

  const endTimeOptions = useMemo(() => {
    if (!timeLabel) return [];
    const startMins = timeToMinutes(to24h(timeLabel));
    const opts: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const mins = startMins + i * 30;
      const h24 = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      const ap = h24 >= 12 ? "PM" : "AM";
      const h12 = h24 % 12 || 12;
      opts.push(`${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`);
    }
    return opts;
  }, [timeLabel]);

  useEffect(() => {
    if (endTimeOptions.length > 0) {
      setEndTimeLabel(endTimeOptions[1] || endTimeOptions[0]);
    }
  }, [endTimeOptions]);

  const [playersCount, setPlayersCount] = useState<ChallengePlayersCount>("1v1");
  const [series, setSeries] = useState<ChallengeSeries>("BO1");
  const [matchStyle, setMatchStyle] = useState<ChallengeMatchStyle>("competitive");
  const [entryFee, setEntryFee] = useState(100);
  const [stakeType, setStakeType] = useState<ChallengeStakeType>("Custom");
  const [stakeText, setStakeText] = useState("I'll pay for dinner");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [sharingToIG, setSharingToIG] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    listChallengePlayers({ search, limit: 20 })
      .then((items) => {
        if (cancelled) return;
        setPlayers(items);
      })
      .catch(() => {
        if (!cancelled) setPlayers(NO_PLAYERS);
      })
      .finally(() => {
        if (!cancelled) setLoadingPlayers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, status]);

  // The challenger is always on Team 1 — seed it once their profile loads.
  useEffect(() => {
    if (!customer) return;
    setTeam1((prev) => (prev.length > 0 ? prev : [{ id: customer.id, name: customer.name, phone: customer.phone }]));
  }, [customer]);

  // Only venues that actually support the selected sport show up here — "Other Match"
  // has no fixed venue category, so it shows every active turf.
  useEffect(() => {
    let cancelled = false;
    setLoadingVenues(true);
    browseVenues({ type: "Turf", category: sportCategoryId(sport), limit: 24 })
      .then((res) => {
        if (cancelled) return;
        setVenues(res.items);
      })
      .catch(() => {
        if (!cancelled) setVenues([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingVenues(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sport]);

  // Booked ranges for every sport-matching venue on the chosen date. Each call returns
  // the whole day's bookings, so we fetch once per date and then work out availability
  // for *every* start time locally — no re-hitting the API on each time tap.
  useEffect(() => {
    if (venues.length === 0) {
      setVenueRanges({});
      return;
    }
    let cancelled = false;
    setCheckingAvailability(true);
    Promise.all(
      venues.map((v) =>
        getVenueAvailability(v._id, dateIso)
          .then((ranges) => ({ id: v._id, ranges }))
          // A failed check shouldn't block the step — treat that venue as fully open.
          .catch(() => ({ id: v._id, ranges: [] as { startTime: string; endTime: string }[] }))
      )
    )
      .then((results) => {
        if (cancelled) return;
        const map: Record<string, { startTime: string; endTime: string }[]> = {};
        for (const r of results) map[r.id] = r.ranges;
        setVenueRanges(map);
      })
      .finally(() => {
        if (!cancelled) setCheckingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
  }, [venues, dateIso]);

  /** True when a venue has a free match window starting at `startMin` (no booked overlap). */
  const isVenueFreeAt = useCallback(
    (id: string, startMin: number) => {
      const ranges = venueRanges[id] ?? [];
      const endMin = endTimeLabel ? timeToMinutes(to24h(endTimeLabel)) : startMin + 60;
      return !ranges.some((r) =>
        rangesOverlap(startMin, endMin, timeToMinutes(r.startTime), timeToMinutes(r.endTime))
      );
    },
    [venueRanges, endTimeLabel]
  );

  /** How many turfs are actually open at each start time — drives which chips are pickable. */
  const timeFreeCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of TIME_OPTIONS) {
      const startMin = timeToMinutes(to24h(t));
      m[t] = venues.filter((v) => isVenueFreeAt(v._id, startMin)).length;
    }
    return m;
  }, [venues, isVenueFreeAt]);

  /** Turfs free at the currently-selected time. */
  const availableVenues = useMemo(() => {
    if (!timeLabel) return [];
    const startMin = timeToMinutes(to24h(timeLabel));
    return venues.filter((v) => isVenueFreeAt(v._id, startMin));
  }, [venues, isVenueFreeAt, timeLabel]);

  // If the selected time has no open turf (e.g. the default landed on a booked hour),
  // move to the first time that does — the player never gets stuck on a dead time.
  useEffect(() => {
    if (venues.length === 0 || checkingAvailability) return;
    if (timeLabel && (timeFreeCount[timeLabel] ?? 0) > 0) return;
    const firstFree = TIME_OPTIONS.find((t) => (timeFreeCount[t] ?? 0) > 0);
    if (firstFree) {
      if (firstFree !== timeLabel) setTimeLabel(firstFree);
    } else {
      setTimeLabel("");
    }
  }, [timeFreeCount, timeLabel, venues.length, checkingAvailability]);

  // Keep the picked turf valid for the selected time; default to the first open one.
  useEffect(() => {
    if (venueName && availableVenues.some((v) => `${v.title}, ${v.city}` === venueName)) return;
    const first = availableVenues[0];
    setVenueId(first?._id ?? "");
    setVenueName(first ? `${first.title}, ${first.city}` : "");
  }, [availableVenues, venueName]);

  function selectSport(label: string) {
    setSport(label);
    const options = GAME_PLAYER_COUNT_OPTIONS[label];
    if (options?.length) setPlayersCount(options[0]);
    if (!GAME_SUPPORTS_SERIES.has(label)) setSeries("BO1");
  }

  const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : "https://bookyourvibe.com"}/?join=player`;
  const inviteMessage = `Hey! Join me on Book Your Vibe — sign up as a player and let's set up a match: ${inviteUrl}`;

  function shareInviteOnWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage)}`, "_blank", "noopener,noreferrer");
  }

  const rosteredIds = useMemo(() => new Set([...team1, ...team2].map((m) => m.id).filter(Boolean)), [team1, team2]);
  const filteredPlayers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const base = needle ? players.filter((player) => `${player.name} ${player.phone ?? ""}`.toLowerCase().includes(needle)) : players;
    return base.filter((player) => !rosteredIds.has(player.id));
  }, [players, search, rosteredIds]);

  function addToTeam(player: Opponent, team: "team1" | "team2") {
    const member: RosterMember = { id: player.id, name: player.name, phone: player.phone };
    if (team === "team1") setTeam1((prev) => [...prev, member]);
    else setTeam2((prev) => [...prev, member]);
  }
  function removeFromTeam(id: string | undefined, name: string, team: "team1" | "team2") {
    const match = (m: RosterMember) => (id ? m.id === id : m.name === name);
    if (team === "team1") setTeam1((prev) => prev.filter((m) => !match(m)));
    else setTeam2((prev) => prev.filter((m) => !match(m)));
  }

  if (status === "loading") {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-slate-600">Loading challenge arena...</div>
      </div>
    );
  }

  if (status === "guest") {
    return authView === "login" ? (
      <LoginModal onClose={onClose} onLoggedIn={() => {}} onSwitchToSignup={() => setAuthView("signup")} />
    ) : (
      <SignupModal onClose={onClose} onSignedUp={() => {}} onSwitchToLogin={() => setAuthView("login")} />
    );
  }

  const dateLabel = dateOptions.find((d) => d.iso === dateIso)?.label ?? dateIso;
  const scheduleLabel = endTimeLabel ? `${dateLabel}, ${timeLabel} – ${endTimeLabel}` : `${dateLabel}, ${timeLabel}`;
  const challengerName = customer?.name ?? "BYV Player";
  const opponent = team2[0] as RosterMember | undefined;

  async function generatePoster() {
    if (!opponent) return;
    setSubmitting(true);
    setNotice("");
    try {
      const created = await createChallenge({
        opponentId: opponent.id,
        opponentName: opponent.name,
        opponentPhone: opponent.phone,
        team1Members: team1.map((m) => ({ name: m.name, phone: m.phone, id: m.id })),
        team2Members: team2.map((m) => ({ name: m.name, phone: m.phone, id: m.id })),
        sport,
        venueName,
        venueId: venueId || undefined,
        scheduleLabel,
        playersCount,
        series,
        matchStyle,
        entryFee,
        stakeType,
        stakeText,
        inviteBaseUrl: window.location.origin,
      });
      setChallenge(created);
      saveRecentChallenge(created);
    } catch {
      const fallback = localChallenge({
        challengerName,
        team1,
        team2,
        sport,
        venueName,
        scheduleLabel,
        playersCount,
        series,
        matchStyle,
        entryFee,
        stakeType,
        stakeText,
      });
      setChallenge(fallback);
      saveRecentChallenge(fallback);
      setNotice("Challenge poster ready in preview mode. Backend save can happen after API deploy.");
    } finally {
      setSubmitting(false);
      setStep("poster");
    }
  }

  function shareOnWhatsApp() {
    if (!challenge) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(challenge.shareMessage)}`, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    if (!challenge) return;
    await navigator.clipboard?.writeText(challenge.inviteUrl);
    setNotice("Challenge link copied.");
  }

  /**
   * Renders the poster node to a PNG data URL, reliably.
   *
   * The poster kept coming out blank / half-drawn because capture ran before the
   * web fonts and the logo/sport/QR images had finished loading, and because
   * html-to-image is known to drop images on its very first pass. So we wait for
   * `document.fonts.ready` and every <img> inside the poster, then capture twice
   * (the first pass warms the image cache; the second renders correctly) at the
   * node's true 380×675 size.
   */
  async function capturePoster(backgroundColor: string): Promise<string> {
    const node = posterRef.current;
    if (!node) throw new Error("poster not mounted");

    if (typeof document !== "undefined" && document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        /* fonts API unavailable — fall through and capture anyway */
      }
    }
    // Wait for the logo / sport icon / QR images to finish decoding.
    await Promise.all(
      Array.from(node.querySelectorAll("img")).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            })
      )
    );

    const options = {
      backgroundColor,
      pixelRatio: 2,
      cacheBust: true,
      width: node.offsetWidth || 380,
      height: node.offsetHeight || 675,
    };
    // Warm-up pass — its result is intentionally discarded.
    await toPng(node, options).catch(() => "");
    return toPng(node, options);
  }

  async function downloadPoster() {
    if (downloading || !posterRef.current || !challenge) return;
    setDownloading(true);
    setNotice("");
    try {
      const node = posterRef.current;
      const dataUrl = await capturePoster("#02060d");
      const width = node.offsetWidth || 380;
      const height = node.offsetHeight || 675;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [width, height],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
      pdf.save(`byv-challenge-${challenge.code}.pdf`);
    } catch {
      setNotice("Couldn't generate the poster PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function shareToInstagramStory() {
    if (sharingToIG || !posterRef.current || !challenge) return;
    setSharingToIG(true);
    setNotice("");
    try {
      const dataUrl = await capturePoster("#090f19");
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `byv-challenge-${challenge.code}.png`, { type: "image/png" });

      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "BYV Vibe Challenge",
          text: "I just threw a Vibe Challenge — check it out!",
        });
        setNotice("Poster shared — pick Instagram in the share sheet and add it to your Story.");
      } else {
        const link = document.createElement("a");
        link.download = file.name;
        link.href = dataUrl;
        link.click();
        setNotice("Poster saved to your device — open Instagram, tap + for a new Story, and pick this image from your gallery.");
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setNotice("Couldn't prepare the poster for Instagram. Please try again.");
      }
    } finally {
      setSharingToIG(false);
    }
  }

  function goBack() {
    const order: Step[] = ["sport", "schedule", "arena", "teams", "details", "stakes", "poster", "share"];
    const index = order.indexOf(step);
    if (index <= 0) onClose();
    else setStep(order[index - 1]);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/75 backdrop-blur-sm sm:items-center">
      <div className="relative flex h-full w-full max-w-[440px] flex-col overflow-hidden bg-[#071018] text-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-[2rem]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(249,115,22,0.22),transparent_28%),radial-gradient(circle_at_60%_100%,rgba(16,185,129,0.16),transparent_34%)] pointer-events-none" />
        <div className="relative flex flex-1 flex-col overflow-y-auto px-5 py-6 pb-32">
          <div className="mb-5 flex items-center justify-between">
            <button type="button" onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-slate-300">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-300">
              <Flame className="h-3.5 w-3.5" /> Live Challenge
            </div>
            <button type="button" onClick={onClose} aria-label="Close challenge" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-slate-300">
              <X className="h-4 w-4" />
            </button>
          </div>

          {step === "sport" && (
            <StepShell eyebrow="Step 01 / Match format" title="Choose the battle type" subtitle="Pick the sport or keep it as a custom vibe challenge.">
              <div className="grid grid-cols-2 gap-3">
                {SPORTS.map((item) => (
                  <button key={item.label} type="button" onClick={() => selectSport(item.label)} className={`relative flex aspect-square flex-col items-center justify-center gap-3 rounded-[1.6rem] border text-center transition ${sport === item.label ? "border-orange-500 bg-orange-500/10 text-white" : "border-white/10 bg-white/7 text-slate-300"}`}>
                    {sport === item.label && <Check className="absolute right-4 top-4 h-5 w-5 rounded-full bg-orange-500 p-1 text-slate-950" />}
                    {"image" in item ? (
                      <Image src={item.image} alt={item.label} width={48} height={48} unoptimized className="h-12 w-12 object-contain" />
                    ) : (
                      <span className={`flex h-12 w-12 items-center justify-center text-4xl font-black ${item.emoji === "8" ? "rounded-full bg-slate-200 text-slate-900 text-xl" : ""}`}>{item.emoji}</span>
                    )}
                    <span className="text-xs font-extrabold uppercase tracking-wide">{item.label}</span>
                  </button>
                ))}
              </div>
              <BottomBar label="Selected match" value={sport} onNext={() => setStep("schedule")} />
            </StepShell>
          )}

          {step === "schedule" && (
            <StepShell eyebrow="Step 02 / Date & Time" title="When are you playing?" subtitle="Pick a date, start time, and end time for your match.">
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-400">Date</p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {dateOptions.map((d) => (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => setDateIso(d.iso)}
                    className={`shrink-0 rounded-xl px-3.5 py-2.5 text-xs font-extrabold whitespace-nowrap transition ${
                      dateIso === d.iso ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-white/7 text-slate-300"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <div className="mb-2 mt-5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-400">Start time</p>
                <span className="text-[10px] font-semibold text-slate-500">
                  {checkingAvailability ? "Checking availability…" : "Only available slots shown"}
                </span>
              </div>
              <p className="mb-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-300">
                Note: Already booked slots are hidden. Only available slots are shown below.
              </p>
              <div className="grid max-h-36 grid-cols-4 gap-2 overflow-y-auto pr-1">
                {TIME_OPTIONS.filter((t) => checkingAvailability || (timeFreeCount[t] ?? 0) > 0).map((t) => {
                  const selected = timeLabel === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTimeLabel(t)}
                      className={`rounded-xl px-2 py-2 text-[11px] font-extrabold transition ${
                        selected
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                          : "bg-white/7 text-slate-200 hover:bg-white/12"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              {/* End Time Selection */}
              {timeLabel && endTimeOptions.length > 0 && (
                <>
                  <div className="mb-2 mt-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-400">End time</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {endTimeOptions.map((t) => {
                      const selected = endTimeLabel === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEndTimeLabel(t)}
                          className={`rounded-xl px-2 py-2 text-[11px] font-extrabold transition ${
                            selected
                              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                              : "bg-white/7 text-slate-200 hover:bg-white/12"
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <BottomBar
                label="Selected slot"
                value={timeLabel ? `${dateLabel} · ${timeLabel} – ${endTimeLabel}` : "No slots available"}
                onNext={() => setStep("arena")}
                disabled={!timeLabel || !endTimeLabel}
              />
            </StepShell>
          )}

          {step === "arena" && (
            <StepShell
              eyebrow="Step 03 / Pick Available Turf"
              title="Select Turf Arena"
              subtitle={`Turfs supporting ${sport} that are free on ${dateLabel} from ${timeLabel} to ${endTimeLabel}.`}
            >
              {loadingVenues || checkingAvailability ? (
                <p className="py-10 text-center text-xs font-semibold text-slate-500">Fetching available turfs...</p>
              ) : availableVenues.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center">
                  <p className="text-xs font-semibold text-slate-400">
                    No {sport} turfs are free at {timeLabel} on {dateLabel}. Try going back to pick another time.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {availableVenues.map((v) => {
                    const label = `${v.title}, ${v.city}`;
                    const selected = venueName === label;
                    return (
                      <button
                        key={v._id}
                        type="button"
                        onClick={() => {
                          setVenueName(label);
                          setVenueId(v._id);
                        }}
                        className={`relative flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition ${
                          selected ? "border-orange-500 bg-orange-500/10" : "border-white/10 bg-white/7"
                        }`}
                      >
                        {selected && <Check className="absolute right-3 top-3 h-4 w-4 rounded-full bg-orange-500 p-0.5 text-slate-950" />}
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-orange-400">
                          <MapPin className="h-5 w-5" />
                        </span>
                        <span className="mt-1 line-clamp-1 text-sm font-extrabold text-white">{v.title}</span>
                        <span className="text-xs font-semibold text-slate-400">{v.city}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <BottomBar
                label="Selected turf"
                value={venueName || "Pick a turf"}
                onNext={() => setStep("teams")}
                disabled={!venueName}
              />
            </StepShell>
          )}

          {step === "teams" && (
            <StepShell eyebrow="Step 03 / Build the squads" title="Team 1 vs Team 2" subtitle="Search BYV players and add them to a side, or invite friends via WhatsApp.">
              <div className="grid grid-cols-2 gap-3">
                <TeamRoster label="Team 1" tone="orange" members={team1} selfId={customer?.id} onRemove={(id, name) => removeFromTeam(id, name, "team1")} />
                <TeamRoster label="Team 2" tone="emerald" members={team2} onRemove={(id, name) => removeFromTeam(id, name, "team2")} />
              </div>

              <div className="mt-5 flex items-center gap-2">
                <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/7 px-4 py-3.5">
                  <Search className="h-5 w-5 text-slate-500" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search username, name, or phone..." className="w-full bg-transparent text-sm font-semibold text-slate-200 outline-none placeholder:text-slate-500" />
                </div>
                <button
                  type="button"
                  onClick={shareInviteOnWhatsApp}
                  aria-label="Invite friends via WhatsApp"
                  title="Invite friends via WhatsApp"
                  className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 transition active:scale-95"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>

              <p className="mb-2 mt-5 text-[11px] font-extrabold uppercase tracking-[0.22em] text-orange-400">BYV players</p>
              <div className="space-y-2.5">
                {loadingPlayers ? (
                  <p className="py-6 text-center text-xs font-semibold text-slate-500">Loading BYV players...</p>
                ) : filteredPlayers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-center">
                    <p className="text-xs font-semibold text-slate-400">No players found{search ? ` for "${search}"` : " yet"}.</p>
                    <button type="button" onClick={shareInviteOnWhatsApp} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-[11px] font-extrabold uppercase text-white">
                      <Share2 className="h-3.5 w-3.5" /> Invite a friend on WhatsApp
                    </button>
                  </div>
                ) : (
                  filteredPlayers.map((player) => (
                    <div key={player.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/60 to-slate-700 text-xs font-black text-white">
                        {player.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-white">{player.name}</p>
                        <p className="truncate text-xs font-semibold text-slate-400">{player.relation}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToTeam(player, "team1")}
                        className="shrink-0 rounded-lg border border-orange-500/40 px-2.5 py-1.5 text-[10px] font-black uppercase text-orange-400 transition active:scale-95"
                      >
                        + Team 1
                      </button>
                      <button
                        type="button"
                        onClick={() => addToTeam(player, "team2")}
                        className="shrink-0 rounded-lg border border-emerald-500/40 px-2.5 py-1.5 text-[10px] font-black uppercase text-emerald-400 transition active:scale-95"
                      >
                        + Team 2
                      </button>
                    </div>
                  ))
                )}
              </div>
              <BottomBar
                label="Team 2"
                value={team2.length > 0 ? team2.map((m) => m.name).join(", ") : "Add at least one opponent"}
                onNext={() => setStep("details")}
                disabled={team2.length === 0}
              />
            </StepShell>
          )}

          {step === "details" && (
            <StepShell eyebrow="Step 04 / Match metrics" title="Set challenge details" subtitle="Lock down the format and rules for the match.">
              {playersCount === "team" ? (
                // Cricket is always team-vs-team — nothing to actually choose, so show
                // the two sides as labels rather than a single combined selector button.
                <div className="mb-5">
                  <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-400">
                    Players count (for {sport})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="rounded-xl bg-orange-500 px-3 py-3 text-center text-xs font-extrabold uppercase text-white shadow-lg shadow-orange-500/20">
                      Team 1
                    </span>
                    <span className="rounded-xl bg-orange-500 px-3 py-3 text-center text-xs font-extrabold uppercase text-white shadow-lg shadow-orange-500/20">
                      Team 2
                    </span>
                  </div>
                </div>
              ) : (
                <Segmented
                  label={`Players count (for ${sport})`}
                  value={playersCount}
                  options={GAME_PLAYER_COUNT_OPTIONS[sport] ?? DETAILS.playerCounts}
                  onChange={setPlayersCount}
                />
              )}
              {GAME_SUPPORTS_SERIES.has(sport) && (
                <Segmented label="Best of series" value={series} options={DETAILS.series} onChange={setSeries} />
              )}
              <Segmented label="Match styling" value={matchStyle} options={DETAILS.styles} onChange={setMatchStyle} wide />
              <Segmented label="Optional entry fee / co-pay" value={entryFee} options={DETAILS.fees} onChange={setEntryFee} formatter={(value) => (value === 0 ? "Free" : `₹${value}`)} wide />
              <BottomBar label="Schedule" value={scheduleLabel} onNext={() => setStep("stakes")} />
            </StepShell>
          )}

          {step === "stakes" && (
            <StepShell eyebrow="Step 05 / Stakes & bet" title="What happens if you lose?" subtitle="Lock down the food treat or punishment for bragging rights.">
              <div className="grid grid-cols-3 gap-3">
                {STAKES.map((item) => (
                  <button key={item.type} type="button" onClick={() => { setStakeType(item.type); setStakeText(item.copy); }} className={`rounded-[1.4rem] border p-4 text-center transition ${stakeType === item.type ? "border-orange-500 bg-orange-500/10" : "border-white/10 bg-white/7"}`}>
                    <span className="text-3xl">{item.icon}</span>
                    <span className="mt-2 block text-[11px] font-extrabold uppercase tracking-wide text-slate-200">{item.label}</span>
                  </button>
                ))}
              </div>
              <label className="mt-7 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-400">Custom stake / punishment</label>
              <input value={stakeText} onChange={(event) => { setStakeText(event.target.value); setStakeType("Custom"); }} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/7 px-4 py-4 text-sm font-bold text-white outline-none focus:border-orange-500" />
              <div className="mt-4 flex flex-wrap gap-2">
                {["I'll wear opponent jersey", "I'll pay for dinner", "I'll buy protein shake", "Loser buys sports grip"].map((copy) => (
                  <button key={copy} type="button" onClick={() => { setStakeText(copy); setStakeType("Custom"); }} className="rounded-full bg-white/8 px-3 py-2 text-[11px] font-semibold text-slate-300">
                    + {copy}
                  </button>
                ))}
              </div>
              <BottomBar label="The stakes" value={stakeText} actionLabel={submitting ? "Generating..." : "Generate poster"} onNext={generatePoster} disabled={submitting || stakeText.trim().length < 2} />
            </StepShell>
          )}

          {(step === "poster" || step === "share") && challenge && (
            <StepShell eyebrow={step === "poster" ? "Final review" : "Deep link ready"} title={step === "poster" ? "Your cinematic poster" : "The gauntlet is thrown!"} subtitle={step === "poster" ? "Review your generated duel flyer." : `Share the challenge with ${opponent?.name ?? "your opponent"} on WhatsApp.`}>
              <div className={step === "poster" ? "relative w-full max-w-[280px] mx-auto h-[380px] overflow-hidden rounded-none border border-white/10 bg-slate-950/60 shadow-2xl flex items-center justify-center mb-4" : "pointer-events-none absolute left-[-9999px] top-0"}>
                <div 
                  style={step === "poster" ? { 
                    transform: 'scale(0.53)', 
                    transformOrigin: 'center center',
                    width: '380px',
                    height: '675px',
                    position: 'absolute'
                  } : {
                    width: '380px',
                    height: '675px'
                  }}
                >
                  <div ref={posterRef} className="w-[380px] h-[675px] text-white">
                    <Poster challenge={challenge} />
                  </div>
                </div>
              </div>
              {step === "poster" && (
                <button
                  type="button"
                  onClick={downloadPoster}
                  disabled={downloading}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/7 py-3.5 text-xs font-black uppercase tracking-wide text-slate-200 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> {downloading ? "Saving..." : "Download poster (PDF)"}
                </button>
              )}
              {step === "share" && (
                <SharePanel
                  challenge={challenge}
                  onWhatsApp={shareOnWhatsApp}
                  onCopy={copyLink}
                  onDownload={downloadPoster}
                  downloading={downloading}
                  onShareInstagram={shareToInstagramStory}
                  sharingToIG={sharingToIG}
                />
              )}
              {notice && <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs font-semibold text-emerald-300">{notice}</p>}
              {step === "poster" ? (
                <BottomBar label="Invite link" value={challenge.code} actionLabel="Issue challenge" onNext={() => setStep("share")} />
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setStep("poster")} className="rounded-2xl border border-white/10 bg-white/7 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-300">
                    View poster
                  </button>
                  <button type="button" onClick={onClose} className="rounded-2xl bg-orange-500 py-3 text-xs font-extrabold uppercase tracking-wide text-white">
                    Done
                  </button>
                </div>
              )}
            </StepShell>
          )}
        </div>
      </div>
    </div>
  );
}

function StepShell({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-orange-400">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-black uppercase leading-tight tracking-normal text-white">{title}</h2>
      <p className="mt-3 text-sm font-medium leading-relaxed text-slate-400">{subtitle}</p>
      <div className="mt-7 flex-1">{children}</div>
    </div>
  );
}

/** One side's roster in the Team 1 / Team 2 builder. The challenger's own entry
 * (matched by selfId) can't be removed — everyone else can be. */
function TeamRoster({
  label,
  tone,
  members,
  selfId,
  onRemove,
}: {
  label: string;
  tone: "orange" | "emerald";
  members: RosterMember[];
  selfId?: string;
  onRemove: (id: string | undefined, name: string) => void;
}) {
  const isOrange = tone === "orange";
  return (
    <div className={`rounded-2xl border p-3 ${isOrange ? "border-orange-500/30 bg-orange-500/5" : "border-emerald-500/30 bg-emerald-500/5"}`}>
      <p className={`text-[10px] font-extrabold uppercase tracking-[0.18em] ${isOrange ? "text-orange-400" : "text-emerald-400"}`}>{label}</p>
      {members.length === 0 ? (
        <p className="mt-2 text-xs font-semibold text-slate-500">No one yet</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {members.map((m) => {
            const isSelf = !!selfId && m.id === selfId;
            return (
              <div key={m.id ?? m.name} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
                <span className="truncate text-xs font-bold text-white">{isSelf ? "You" : m.name}</span>
                {!isSelf && (
                  <button type="button" onClick={() => onRemove(m.id, m.name)} className="shrink-0 text-slate-400 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Segmented<T extends string | number>({ label, value, options, onChange, formatter, wide }: { label: string; value: T; options: readonly T[]; onChange: (value: T) => void; formatter?: (value: T) => string; wide?: boolean }) {
  const cols = wide ? 3 : Math.min(Math.max(options.length, 1), 3);
  const gridColsClass = cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div className="mb-5">
      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-400">{label}</p>
      <div className={`grid gap-2 ${gridColsClass}`}>
        {options.map((option) => (
          <button key={String(option)} type="button" onClick={() => onChange(option)} className={`rounded-xl px-3 py-3 text-xs font-extrabold uppercase transition ${value === option ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-white/7 text-slate-400"}`}>
            {formatter ? formatter(option) : String(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

function BottomBar({ label, value, actionLabel = "Next step", onNext, disabled }: { label: string; value: string; actionLabel?: string; onNext: () => void; disabled?: boolean }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] px-4 pb-5 pt-3 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
      <div className="mx-auto max-w-[440px]">
        <div className="flex items-center gap-3 rounded-2xl border border-orange-500/35 bg-[#0c1a26]/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-md">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-sm font-black text-white">{value.slice(0, 2).toUpperCase()}</span>
          <span className="min-w-0 flex-1 overflow-hidden">
            <span className="block text-[10px] font-extrabold uppercase tracking-wide text-orange-400">{label}</span>
            <span className="block truncate text-sm font-extrabold text-white">{value}</span>
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={onNext}
            className="shrink-0 whitespace-nowrap rounded-2xl bg-orange-500 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-white shadow-lg shadow-orange-500/25 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Deterministic rank generator based on name hash
function getDeterministicRank(name: string, defaultVal: number): number {
  if (!name) return defaultVal;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 18) + 3; // Returns consistent rank between 3 and 20
}

// Sport-specific high fidelity SVG components
const ShuttlecockSvg = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="currentColor">
    <path d="M40 75 C40 85, 60 85, 60 75 Z" />
    <path d="M40 75 L22 25 C22 20, 78 20, 78 25 L60 75 Z" opacity="0.25" />
    <line x1="42" y1="73" x2="26" y2="25" stroke="currentColor" strokeWidth="2.5" />
    <line x1="46" y1="74" x2="38" y2="25" stroke="currentColor" strokeWidth="2.5" />
    <line x1="50" y1="75" x2="50" y2="25" stroke="currentColor" strokeWidth="2.5" />
    <line x1="54" y1="74" x2="62" y2="25" stroke="currentColor" strokeWidth="2.5" />
    <line x1="58" y1="73" x2="74" y2="25" stroke="currentColor" strokeWidth="2.5" />
    <path d="M32 48 Q50 53 68 48" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M28 35 Q50 40 72 35" fill="none" stroke="currentColor" strokeWidth="2.5" />
  </svg>
);

const CricketBallSvg = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="currentColor">
    <circle cx="50" cy="50" r="40" />
    <path d="M50 10 Q62 50 50 90" fill="none" stroke="#111827" strokeWidth="4" strokeDasharray="3,2" />
    <path d="M50 10 Q38 50 50 90" fill="none" stroke="#111827" strokeWidth="4" strokeDasharray="3,2" />
    <path d="M50 10 L50 90" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.3" />
  </svg>
);

const SoccerBallSvg = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="currentColor">
    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="4" />
    <polygon points="50,40 58,46 55,55 45,55 42,46" />
    <line x1="50" y1="40" x2="50" y2="20" stroke="currentColor" strokeWidth="4" />
    <line x1="58" y1="46" x2="75" y2="35" stroke="currentColor" strokeWidth="4" />
    <line x1="55" y1="55" x2="68" y2="70" stroke="currentColor" strokeWidth="4" />
    <line x1="45" y1="55" x2="32" y2="70" stroke="currentColor" strokeWidth="4" />
    <line x1="42" y1="46" x2="25" y2="35" stroke="currentColor" strokeWidth="4" />
    <polygon points="50,20 62,15 75,25 75,35 58,46 50,40" fill="none" stroke="currentColor" strokeWidth="3" />
    <polygon points="75,35 88,45 82,60 68,70 55,55 58,46" fill="none" stroke="currentColor" strokeWidth="3" />
    <polygon points="68,70 60,85 40,85 32,70 45,55 55,55" fill="none" stroke="currentColor" strokeWidth="3" />
    <polygon points="32,70 18,60 12,45 25,35 42,46 45,55" fill="none" stroke="currentColor" strokeWidth="3" />
    <polygon points="25,35 25,25 38,15 50,20 42,46 50,40" fill="none" stroke="currentColor" strokeWidth="3" />
  </svg>
);

const TableTennisSvg = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="currentColor">
    <circle cx="45" cy="45" r="28" />
    <rect x="42" y="68" width="8" height="24" rx="2" transform="rotate(-45 46 80)" />
    <circle cx="75" cy="30" r="10" />
  </svg>
);

const BasketballSvg = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="currentColor">
    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="4" />
    <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="4" />
    <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="4" />
    <path d="M20 25 Q50 50 20 75" fill="none" stroke="currentColor" strokeWidth="4" />
    <path d="M80 25 Q50 50 80 75" fill="none" stroke="currentColor" strokeWidth="4" />
  </svg>
);

const PoolBallSvg = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="currentColor">
    <circle cx="50" cy="50" r="40" />
    <circle cx="50" cy="50" r="18" fill="#fff" />
    <text x="50" y="58" fontFamily="sans-serif" fontSize="24" fontWeight="900" textAnchor="middle" fill="#000">8</text>
  </svg>
);

const GameControllerSvg = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="currentColor">
    <path d="M20 30h60a15 15 0 0 1 15 15v20a15 15 0 0 1-15 15l-10-5H30l-10 5A15 15 0 0 1 5 65V45A15 15 0 0 1 20 30z" />
    <path d="M23 46h4v4h-4zm4 4h4v4h-4zm-4 4h4v4h-4zm-4-4h4v4h-4z" fill="#000" />
    <circle cx="68" cy="48" r="4" fill="#000" />
    <circle cx="76" cy="56" r="4" fill="#000" />
    <circle cx="68" cy="64" r="4" fill="#000" />
  </svg>
);

const TrophySvg = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="currentColor">
    <path d="M30 20h40v30c0 10-8 18-18 20v10h12v6H36v-6h12V70c-10-2-18-10-18-20V20z" />
    <path d="M20 25h10v15H20c-5 0-8-3-8-8v-2c0-5 3-5 8-5zm60 0h-10v15h10c5 0 8-3 8-8v-2c0-5-3-5-8-5z" />
  </svg>
);

function GoldTrophySvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19,2H5V5H2V10C2,13.5 4.5,16.5 8,17.2V19H5V22H19V19H16V17.2C19.5,16.5 22,13.5 22,10V5H19V2M4,7H5V12H4V7M20,12H19V7H20V12Z" />
    </svg>
  );
}

function GreenTrophySvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19,2H5V5H2V10C2,13.5 4.5,16.5 8,17.2V19H5V22H19V19H16V17.2C19.5,16.5 22,13.5 22,10V5H19V2M4,7H5V12H4V7M20,12H19V7H20V12Z" />
    </svg>
  );
}

function PlayerSilhouetteSvg({ sport }: { sport: string }) {
  const commonClasses = "absolute right-0.5 bottom-0.5 w-24 h-24 text-emerald-500/10 pointer-events-none filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]";
  if (sport === "Badminton") {
    return (
      <svg viewBox="0 0 100 100" className={commonClasses} fill="currentColor">
        <path d="M50 15 C53 15, 55 12, 55 10 C55 8, 53 5, 50 5 C47 5, 45 8, 45 10 C45 12, 47 15, 50 15 Z M48 20 L35 30 L25 22 L20 25 L32 38 L35 55 L42 75 L48 85 L52 85 L48 70 L52 50 L58 45 L68 55 L75 75 L80 75 L72 50 L62 35 L52 20 Z" />
      </svg>
    );
  }
  if (sport === "Cricket") {
    return (
      <svg viewBox="0 0 100 100" className={commonClasses} fill="currentColor">
        <path d="M45 15 C48 15, 50 12, 50 10 C50 8, 48 5, 45 5 C42 5, 40 8, 40 10 C40 12, 42 15, 45 15 Z M42 20 L30 35 L20 40 L15 38 L28 28 L38 20 Z M45 20 L50 35 L55 55 L62 75 L68 85 L72 85 L65 70 L58 50 L52 35 Z M35 40 L40 60 L45 75 L48 85 L52 85 L42 70 L38 55 Z" />
      </svg>
    );
  }
  if (sport === "Football") {
    return (
      <svg viewBox="0 0 100 100" className={commonClasses} fill="currentColor">
        <path d="M40 15 C43 15, 45 12, 45 10 C45 8, 43 5, 40 5 C37 5, 35 8, 35 10 C35 12, 37 15, 40 15 Z M38 20 L25 30 L15 25 L10 28 L22 38 L28 55 L35 70 L45 80 L50 78 L40 68 L35 50 L42 40 L52 48 L65 52 Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" className={commonClasses} fill="currentColor">
      <path d="M50 12 C53 12, 55 10, 55 7 C55 4, 53 2, 50 2 C47 2, 45 4, 45 7 C45 10, 47 12, 50 12 Z M45 18 L32 25 L22 20 L18 24 L28 32 L32 45 L38 60 L42 78 L46 78 L40 60 L38 48 L46 38 L54 44 L64 42 L60 36 L52 32 Z" />
    </svg>
  );
}

function FlamingSportIcon({ sport, tone, className }: { sport: string; tone: "orange" | "green"; className: string }) {
  const isOrange = tone === "orange";
  
  const renderSvg = () => {
    switch (sport) {
      case "Badminton":
        return <ShuttlecockSvg className="w-8 h-8 text-white/95" />;
      case "Cricket":
        return <CricketBallSvg className="w-8 h-8 text-white/95" />;
      case "Football":
        return <SoccerBallSvg className="w-8 h-8 text-white/95" />;
      case "Table Tennis":
        return <TableTennisSvg className="w-8 h-8 text-white/95" />;
      case "Basketball":
        return <BasketballSvg className="w-8 h-8 text-white/95" />;
      case "Pool":
        return <PoolBallSvg className="w-8 h-8 text-white/95" />;
      case "Gaming":
        return <GameControllerSvg className="w-8 h-8 text-white/95" />;
      default:
        return <TrophySvg className="w-8 h-8 text-white/95" />;
    }
  };

  const glowShadow = isOrange 
    ? "shadow-[0_0_20px_#f97316]" 
    : "shadow-[0_0_20px_#10b981]";
    
  return (
    <div className={`relative flex items-center justify-center p-2.5 rounded-full bg-slate-950 border-2 ${isOrange ? 'border-orange-500' : 'border-emerald-500'} ${glowShadow} ${className}`}>
      <span className={`absolute w-full h-full rounded-full ${isOrange ? 'bg-orange-500/20' : 'bg-emerald-500/20'} blur-md -z-10`} />
      {renderSvg()}
    </div>
  );
}

function Poster({ challenge }: { challenge: Challenge }) {
  const sportMeta = SPORTS.find((s) => s.label === challenge.sport);
  const stakeMeta = STAKES.find((s) => s.type === challenge.stakeType);

  // Real, scannable QR — the venue's vendor scans this at the door to verify + check the
  // challenge in as "arrived" (same idea as the booking ticket QR, see lib/ticket.ts).
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(JSON.stringify({ challengeCode: challenge.code }), {
      margin: 0,
      width: 120,
      color: { dark: "#0f172a", light: "#00000000" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [challenge.code]);

  return (
    <div className="relative w-[380px] h-[675px] overflow-hidden rounded-none border-[3px] border-orange-500/35 bg-[#02060d] p-5 shadow-[0_0_50px_rgba(249,115,22,0.15)] flex flex-col justify-between select-none">
      {/* Stadium Grid Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />

      {/* Ambient corner glows */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-orange-500/20 blur-[80px]" />
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-500/20 blur-[80px]" />

      {/* Stadium spotlights */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-white/[0.08] rounded-full blur-2xl" />
      
      {/* Floodlights */}
      <div className="absolute top-4 left-5 flex gap-1 bg-slate-950/75 px-1.5 py-0.5 rounded border border-white/5 opacity-80">
        <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_4px_#fff]" />
        <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_4px_#fff]" />
        <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_4px_#fff]" />
        <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_4px_#fff]" />
      </div>
      <div className="absolute top-4 right-5 flex gap-1 bg-slate-950/75 px-1.5 py-0.5 rounded border border-white/5 opacity-80">
        <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_4px_#fff]" />
        <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_4px_#fff]" />
        <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_4px_#fff]" />
        <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_4px_#fff]" />
      </div>

      {/* Brand header */}
      <div className="relative flex flex-col items-center">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 shrink-0 overflow-hidden rounded-lg bg-white p-0.5">
            <img src="/logo.jpg" alt="" className="h-full w-full object-contain"
            loading="lazy"
            decoding="async"
          />
          </div>
          <p className="text-xs font-black tracking-tight text-white uppercase">
            BOOK <span className="text-orange-500">YOUR VIBE</span>
          </p>
        </div>

        <h1 className="mt-4 text-center leading-[0.95] tracking-tight">
          <span className="block text-2xl font-black uppercase italic text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">CHALLENGE</span>
          <span className="block text-3xl font-black uppercase italic bg-gradient-to-r from-orange-400 via-yellow-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)]">YOUR FRIEND</span>
        </h1>

        {/* Flaming sports balls floating in the header */}
        <div className="absolute left-1 top-8 rotate-[25deg]">
          <FlamingSportIcon sport={challenge.sport} tone="orange" className="" />
        </div>
        <div className="absolute right-1 top-8 -rotate-[25deg]">
          <FlamingSportIcon sport={challenge.sport} tone="green" className="" />
        </div>

        <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.25)]">
          ★ Official Athletic Matchup ★
        </span>
      </div>

      {/* VS block */}
      <div className="relative mt-2.5 flex items-center justify-between px-1">
        <PlayerBadge
          initials={challenge.poster.challengerInitials}
          name={challenge.challenger?.name ?? "Challenger"}
          extraMembers={challenge.team1Members?.slice(1).map((m) => m.name)}
          label="Challenger"
          tone="orange"
        />

        {/* VS slash and element */}
        <div className="relative flex items-center justify-center h-14 w-12 shrink-0">
          <div className="absolute w-[2.5px] h-14 bg-gradient-to-b from-orange-500 via-white to-emerald-500 rotate-[22deg] opacity-75 shadow-[0_0_6px_#fff]" />
          <div className="absolute w-6 h-6 rounded-full bg-orange-500/15 blur-sm -translate-x-2" />
          <div className="absolute w-6 h-6 rounded-full bg-emerald-500/15 blur-sm translate-x-2" />
          <span className="relative z-10 text-xl font-black italic tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] scale-100">VS</span>
        </div>

        <PlayerBadge
          initials={challenge.poster.opponentInitials}
          name={challenge.opponent?.name ?? "Opponent"}
          extraMembers={challenge.team2Members?.slice(1).map((m) => m.name)}
          label="Opponent"
          tone="emerald"
        />
      </div>

      {/* One match / one goal / bragging rights strip */}
      <div className="relative mt-1.5 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-[7.5px] font-extrabold uppercase tracking-wide text-slate-300">
        <span className="flex items-center gap-1 whitespace-nowrap">
          <Flame className="h-3 w-3 shrink-0 text-orange-400" /> One Match
        </span>
        <span className="h-3 w-px shrink-0 bg-white/10" />
        <span className="flex items-center gap-1 whitespace-nowrap">
          <Target className="h-3 w-3 shrink-0 text-emerald-400" /> One Goal
        </span>
        <span className="h-3 w-px shrink-0 bg-white/10" />
        <span className="flex items-center gap-1 whitespace-nowrap">
          <Crown className="h-3 w-3 shrink-0 text-orange-300" /> Bragging Rights
        </span>
      </div>

      {/* Sport card */}
      <div className="relative mt-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 overflow-hidden flex flex-col justify-between min-h-[105px]">
        {/* Glowing sports silhouette */}
        <PlayerSilhouetteSvg sport={challenge.sport} />
        
        <div className="relative z-10 flex items-center gap-2">
          <div 
            className="w-8 h-8 bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0" 
            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
          >
            {sportMeta && "image" in sportMeta ? (
              <img src={sportMeta.image} alt="" className="h-4 w-4 object-contain filter invert brightness-200"
            loading="lazy"
            decoding="async"
          />
            ) : (
              <span className="text-sm">{sportMeta?.emoji ?? "🏆"}</span>
            )}
          </div>
          <p className="text-sm font-black uppercase tracking-wide text-white leading-none">{challenge.sport}</p>
        </div>

        <div className="relative z-10 mt-1.5 grid grid-cols-2 gap-2 border-t border-white/10 pt-1.5">
          <div>
            <p className="text-[8.5px] uppercase tracking-wider font-extrabold text-orange-400">Venue</p>
            <p className="mt-0.5 text-[10.5px] font-bold text-white line-clamp-2 leading-tight">{challenge.venueName}</p>
          </div>
          <div>
            <p className="text-[8.5px] uppercase tracking-wider font-extrabold text-emerald-400">Schedule</p>
            <div className="mt-0.5 flex items-start gap-1">
              <svg className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <div className="text-[10.5px] leading-tight font-bold text-white">
                {(() => {
                  const parts = challenge.scheduleLabel.split(", ");
                  const dateStr = parts[0] || "Today";
                  const startStr = parts[1] || "08:00 AM";

                  let rangeStr = startStr;
                  if (!startStr.includes("-") && !startStr.includes("–")) {
                    const [t, ap] = startStr.split(" ");
                    if (t && ap) {
                      let [h, m] = t.split(":").map(Number);
                      let endH = (h % 12) + 1;
                      let endAp = ap;
                      if (h === 11 && ap === "AM") endAp = "PM";
                      else if (h === 11 && ap === "PM") endAp = "AM";
                      rangeStr = `${startStr} – ${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${endAp}`;
                    }
                  }
                  return (
                    <>
                      <p className="font-extrabold text-white">{dateStr}</p>
                      <p className="text-emerald-400 font-extrabold">{rangeStr}</p>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-1.5 flex flex-wrap gap-1">
          <span className="rounded bg-white/8 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-slate-300">{challenge.playersCount}</span>
          {GAME_SUPPORTS_SERIES.has(challenge.sport) && (
            <span className="rounded bg-white/8 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-slate-300">{challenge.series}</span>
          )}
          <span className="rounded bg-white/8 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-slate-300">{challenge.matchStyle}</span>
        </div>
      </div>

      {/* Stakes */}
      <div className="relative mt-2 text-center">
        <div className="flex items-center gap-2">
          <span className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent to-orange-500/50" />
          <p className="shrink-0 text-[9.5px] font-black uppercase tracking-[0.2em] text-orange-400">The Stakes</p>
          <span className="h-[1.5px] flex-1 bg-gradient-to-l from-transparent to-orange-500/50" />
        </div>
        <div className="mt-1.5 flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/5 px-3.5 py-2.5 text-left shadow-[0_0_15px_rgba(249,115,22,0.1)]">
          <span className="shrink-0 text-2xl filter drop-shadow-[0_0_6px_rgba(249,115,22,0.5)]">{stakeMeta?.icon ?? "🎯"}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-black uppercase text-white tracking-wide">{challenge.stakeType} Stakes</p>
            <p className="truncate text-[10px] font-semibold text-slate-300">{challenge.stakeText}</p>
          </div>
        </div>
      </div>

      {/* Compact 2-Button Action Row — prevents bottom clipping */}
      <div className="relative mt-2 grid grid-cols-2 gap-2">
        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-2 text-[9.5px] font-black uppercase text-white shadow-md">
          <Share2 className="h-3 w-3 shrink-0" /> Share Match
        </div>
        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 py-2 text-[9.5px] font-black uppercase text-white shadow-md">
          <Send className="h-3 w-3 shrink-0" /> Challenge
        </div>
      </div>

      {/* Verification QR — the venue scans this to check the players in as arrived */}
      <div className="relative mt-2.5 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="" className="h-full w-full object-contain"
            loading="lazy"
            decoding="async"
          />
          ) : (
            <div className="h-full w-full animate-pulse rounded bg-slate-200" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9.5px] font-black uppercase tracking-wide text-white">Scan to verify arrival</p>
          <p className="mt-0.5 text-[8.5px] font-semibold text-slate-400 leading-tight">Show this at the venue to check in</p>
          <p className="mt-0.5 font-mono text-[9.5px] font-bold text-orange-400">{challenge.code}</p>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="relative mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-[7px] font-black uppercase tracking-wider text-slate-500">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-2.5 w-2.5 shrink-0 text-emerald-400" /> Climb the Ranks
        </span>
        <span className="flex items-center gap-1">
          <Medal className="h-2.5 w-2.5 shrink-0 text-orange-400" /> Earn Bragging Rights
        </span>
        <span className="flex items-center gap-1">
          <Flame className="h-2.5 w-2.5 shrink-0 text-emerald-400" /> Play. Win. Repeat.
        </span>
      </div>
    </div>
  );
}

function PlayerBadge({
  initials,
  name,
  label,
  tone,
  extraMembers,
}: {
  initials: string;
  name: string;
  label: string;
  tone: "orange" | "emerald";
  /** Rest of the roster beyond the primary name — shown as a small list for team matches. */
  extraMembers?: string[];
}) {
  const isOrange = tone === "orange";
  const borderColors = isOrange
    ? "border-orange-500 bg-orange-950/20 shadow-orange-500/20"
    : "border-emerald-500 bg-emerald-950/20 shadow-emerald-500/20";

  const rank = getDeterministicRank(name, isOrange ? 12 : 18);

  return (
    <div className="min-w-0 flex-1 flex flex-col items-center">
      <div className={`flex h-[45px] w-[45px] items-center justify-center rounded-xl border-[2.5px] text-sm font-black text-white shadow-lg ${borderColors}`}>
        {initials || "P"}
      </div>
      <p className="mt-1.5 w-full truncate px-1 text-center text-[11px] font-black uppercase tracking-wide text-white leading-tight">
        {name}
      </p>
      {extraMembers && extraMembers.length > 0 && (
        <p className="mt-0.5 w-full truncate px-1 text-center text-[8px] font-semibold text-slate-400">
          + {extraMembers.join(", ")}
        </p>
      )}
      <div>
        <span className={`inline-block mt-0.5 text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${isOrange ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
          {label}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1 text-[8.5px] font-bold text-slate-400">
        {isOrange ? <GoldTrophySvg className="w-3 h-3 text-amber-400" /> : <GreenTrophySvg className="w-3 h-3 text-emerald-400" />}
        <span className="text-[7.5px] uppercase tracking-wider font-extrabold text-slate-500">Rank</span>
        <span className="font-black text-white">{rank}</span>
      </div>
    </div>
  );
}

function SharePanel({
  challenge,
  onWhatsApp,
  onCopy,
  onDownload,
  downloading,
  onShareInstagram,
  sharingToIG,
}: {
  challenge: Challenge;
  onWhatsApp: () => void;
  onCopy: () => void;
  onDownload: () => void;
  downloading: boolean;
  onShareInstagram: () => void;
  sharingToIG: boolean;
}) {
  return (
    <div>
      <div className="rounded-2xl border border-white/10 bg-white/7 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-400">Preview share message</p>
          <span className="text-[11px] font-bold text-emerald-300">Deep Link Ready</span>
        </div>
        <pre className="whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-300">{challenge.shareMessage}</pre>
      </div>
      <button type="button" onClick={onWhatsApp} className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 py-4 text-sm font-black uppercase tracking-wide text-white">
        <MessageCircle className="h-5 w-5" /> Share on WhatsApp
      </button>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" onClick={onCopy} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/7 py-4 text-xs font-black uppercase tracking-wide text-slate-200">
          <Clipboard className="h-4 w-4" /> Copy link
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/7 py-4 text-xs font-black uppercase tracking-wide text-slate-200 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> {downloading ? "Saving..." : "Download PDF"}
        </button>
        <button
          type="button"
          onClick={onShareInstagram}
          disabled={sharingToIG}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/7 py-4 text-xs font-black uppercase tracking-wide text-slate-200 disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> {sharingToIG ? "Preparing..." : "IG Story"}
        </button>
        <a href={challenge.inviteUrl} className="flex items-center justify-center gap-2 rounded-2xl border border-orange-500/35 bg-orange-500/10 py-4 text-xs font-black uppercase tracking-wide text-orange-400">
          <Eye className="h-4 w-4" /> View Landing
        </a>
      </div>
    </div>
  );
}
