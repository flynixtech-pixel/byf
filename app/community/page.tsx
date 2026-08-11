"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Users, Calendar, MapPin, Check, X, MessageSquare, Shield, Bell, Trophy, Clock } from "lucide-react";
import { SiteHeader } from "../../components/site-header";
import { MobileCard, MobileTopBar } from "@/components/mobile/ui";
import { Toast } from "@/components/admin/Toast";
import { HostMatchModal } from "@/components/community/HostMatchModal";
import { HostManageModal } from "@/components/community/HostManageModal";
import { PlayerJoinModal } from "@/components/community/PlayerJoinModal";
import { RequestsDrawer } from "@/components/community/RequestsDrawer";
import { ReviewRequestModal } from "@/components/community/ReviewRequestModal";
import { getOpenHostedMatches, getHostedMatchDetails } from "@/lib/api/hostedMatches";
import type { HostedMatch, CustomerNotification } from "@/lib/api/types";
import { useCustomerAuth } from "@/components/providers/CustomerAuthProvider";

interface Match {
  id: string;
  title: string;
  place: string;
  time: string;
  spotsLeft: number;
  sport: string;
}

interface Club {
  id: string;
  name: string;
  members: number;
  sport: string;
  place: string;
}

const INITIAL_MATCHES: Match[] = [
  { id: "m-1", title: "Friday night badminton run", place: "Shobhagpura Arena", time: "8:00 PM", spotsLeft: 3, sport: "Badminton" },
  { id: "m-2", title: "Weekend cricket squad", place: "Bhawani Nagar Turf", time: "7:00 AM", spotsLeft: 2, sport: "Cricket" },
  { id: "m-3", title: "Pickleball social mix-in", place: "Hiran Magri Court", time: "6:30 PM", spotsLeft: 8, sport: "Pickleball" },
];

const INITIAL_CLUBS: Club[] = [
  { id: "c-1", name: "Udaipur Smashers Badminton Club", members: 142, sport: "Badminton", place: "Shobhagpura" },
  { id: "c-2", name: "Mewar Turf Cricket Association", members: 89, sport: "Cricket", place: "Bhawani Nagar" },
  { id: "c-3", name: "Hiran Magri TT Spinners", members: 54, sport: "Table Tennis", place: "Hiran Magri" },
];

const TESTIMONIALS = [
  {
    quote: "I found a team in minutes, not days. The page makes it easy to see what is actually open.",
    name: "Aman Sharma",
  },
  {
    quote: "The flow feels calm and direct. I knew where to go next on the first try.",
    name: "Riya Verma",
  },
  {
    quote: "Great for getting people from chat into an actual booking without friction.",
    name: "CA Yashank R.",
  },
];

export default function CommunityPage() {
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);
  const [realHostedMatches, setRealHostedMatches] = useState<HostedMatch[]>([]);
  const [clubs, setClubs] = useState<Club[]>(INITIAL_CLUBS);
  const [joinedMatches, setJoinedMatches] = useState<string[]>([]);
  const [joinedClubs, setJoinedClubs] = useState<string[]>([]);
  const [hostNotices, setHostNotices] = useState<{ id: string; matchTitle: string; playerName: string; time: string; status: string }[]>([]);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Real Hosted Match Modals state
  const [hostMatchModalOpen, setHostMatchModalOpen] = useState(false);
  const [managingMatch, setManagingMatch] = useState<HostedMatch | null>(null);
  const [joiningMatch, setJoiningMatch] = useState<HostedMatch | null>(null);
  const [requestsDrawerOpen, setRequestsDrawerOpen] = useState(false);
  const [reviewNotif, setReviewNotif] = useState<CustomerNotification | null>(null);

  // Legacy Modals state
  const [lobbyModalOpen, setLobbyModalOpen] = useState(false);
  const [clubModalOpen, setClubModalOpen] = useState(false);
  const [selectedJoinMatch, setSelectedJoinMatch] = useState<Match | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form states
  const [lobbyTitle, setLobbyTitle] = useState("");
  const [lobbyPlace, setLobbyPlace] = useState("");
  const [lobbyTime, setLobbyTime] = useState("");
  const [lobbySport, setLobbySport] = useState("Badminton");
  const [lobbySpots, setLobbySpots] = useState(4);

  const [clubName, setClubName] = useState("");
  const [clubSport, setClubSport] = useState("Badminton");
  const { customer } = useCustomerAuth();
  const [clubPlace, setClubPlace] = useState("");

  const openJoinModal = (match: Match) => {
    setSelectedJoinMatch(match);
    setCopiedLink(false);
  };

  function getMatchButtonState(m: HostedMatch, userCustomerId?: string, savedPhone?: string) {
    const isHost = (userCustomerId && m.hostCustomerId === userCustomerId) || (savedPhone && m.hostPhone === savedPhone);
    const myParticipant = m.participants.find(
      (p) => (userCustomerId && p.customerId === userCustomerId) || (savedPhone && p.phone === savedPhone)
    );

    const confirmedCount = m.participants.filter((p) => p.status === "Confirmed").length;
    const isFull = confirmedCount >= m.maxPlayers;

    if (isHost) {
      return {
        text: "You are Hosting",
        isHost: true,
        disabled: false,
        className: "bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm",
      };
    }

    if (myParticipant) {
      if (myParticipant.status === "Pending Approval") {
        return {
          text: "Request Sent (Pending)",
          isHost: false,
          disabled: false,
          className: "bg-amber-100 text-amber-900 border border-amber-300 font-bold",
        };
      }
      if (myParticipant.status === "Payment Pending") {
        return {
          text: `Pay Entry Fee (₹${m.entryFeePerPlayer})`,
          isHost: false,
          disabled: false,
          className: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold shadow-md animate-pulse",
        };
      }
      if (myParticipant.status === "Confirmed") {
        return {
          text: "Confirmed ✓",
          isHost: false,
          disabled: false,
          className: "bg-emerald-100 text-emerald-800 border border-emerald-300 font-black",
        };
      }
      if (myParticipant.status === "Rejected") {
        return {
          text: "Declined",
          isHost: false,
          disabled: false,
          className: "bg-rose-100 text-rose-700 border border-rose-200 font-semibold",
        };
      }
    }

    if (isFull) {
      return {
        text: "Lobby Full",
        isHost: false,
        disabled: true,
        className: "bg-slate-200 text-slate-500 cursor-not-allowed",
      };
    }

    return {
      text: m.entryFeePerPlayer === 0 ? "Request to Join (Free)" : "Request to Join",
      isHost: false,
      disabled: false,
      className: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs",
    };
  }

  const handleMatchClick = (m: HostedMatch) => {
    let savedPhone = "";
    try {
      savedPhone = localStorage.getItem("byv_player_phone") || "";
    } catch (e) {}

    const cId = (customer as any)?._id || customer?.id;
    const isHost = (cId && m.hostCustomerId === cId) || (savedPhone && m.hostPhone === savedPhone);

    if (isHost) {
      setManagingMatch(m);
    } else {
      setJoiningMatch(m);
    }
  };

  const handleSelectNotification = async (notif: CustomerNotification) => {
    if (notif.type === "join_request") {
      setReviewNotif(notif);
      return;
    }
    if (!notif.matchId) return;
    try {
      const m = await getHostedMatchDetails(notif.matchId);
      let savedPhone = "";
      try {
        savedPhone = localStorage.getItem("byv_player_phone") || "";
      } catch (e) {}

      const cId = (customer as any)?._id || customer?.id;
      const isHost = (cId && m.hostCustomerId === cId) || (savedPhone && m.hostPhone === savedPhone);
      if (isHost) {
        setManagingMatch(m);
      } else {
        setJoiningMatch(m);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load real open hosted matches & persisted joined matches on mount
  useEffect(() => {
    let cancelled = false;
    getOpenHostedMatches()
      .then((data) => {
        if (!cancelled) setRealHostedMatches(data);
      })
      .catch(() => {});

    try {
      const savedMatches = localStorage.getItem("byv_joined_matches");
      if (savedMatches) setJoinedMatches(JSON.parse(savedMatches));
      const savedClubs = localStorage.getItem("byv_joined_clubs");
      if (savedClubs) setJoinedClubs(JSON.parse(savedClubs));
      const savedNotices = localStorage.getItem("byv_host_notifications");
      if (savedNotices) setHostNotices(JSON.parse(savedNotices));

      // Merge created lobbies
      const createdLobbiesStr = localStorage.getItem("byv_created_lobbies");
      if (createdLobbiesStr) {
        const createdLobbies = JSON.parse(createdLobbiesStr);
        setMatches((prev) => {
          const ids = new Set(createdLobbies.map((l: any) => l.id));
          return [...createdLobbies, ...prev.filter((l) => !ids.has(l.id))];
        });
      }

      // Merge created clubs
      const createdClubsStr = localStorage.getItem("byv_created_clubs");
      if (createdClubsStr) {
        const createdClubs = JSON.parse(createdClubsStr);
        setClubs((prev) => {
          const ids = new Set(createdClubs.map((c: any) => c.id));
          const formattedCreated = createdClubs.map((c: any) => ({
            id: c.id,
            name: c.name,
            members: c.members,
            sport: c.sport,
            place: c.place,
          }));
          return [...formattedCreated, ...prev.filter((c) => !ids.has(c.id))];
        });
      }
    } catch (e) {
      console.error(e);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const handleJoinMatch = (id: string, title: string) => {
    const matchObj = matches.find((m) => m.id === id);
    let nextJoined: string[] = [];
    let nextJoinedDetailed: any[] = [];
    try {
      const savedDetailed = localStorage.getItem("byv_joined_matches_detailed");
      if (savedDetailed) nextJoinedDetailed = JSON.parse(savedDetailed);
    } catch (_) {}

    if (joinedMatches.includes(id)) {
      nextJoined = joinedMatches.filter((mid) => mid !== id);
      setJoinedMatches(nextJoined);
      nextJoinedDetailed = nextJoinedDetailed.filter((m) => m.matchId !== id);
      setMatches((prev) =>
        prev.map((m) => (m.id === id ? { ...m, spotsLeft: m.spotsLeft + 1 } : m))
      );
      setToast(`Left the match lobby: ${title}`);
    } else {
      nextJoined = [...joinedMatches, id];
      setJoinedMatches(nextJoined);
      if (matchObj) {
        nextJoinedDetailed.push({
          matchId: id,
          title: matchObj.title,
          place: matchObj.place,
          time: matchObj.time,
          sport: matchObj.sport,
          joinedAt: new Date().toISOString(),
          status: id.startsWith("m-1") ? "Pending Approval" : "Approved",
        });
      }
      setMatches((prev) =>
        prev.map((m) => (m.id === id ? { ...m, spotsLeft: Math.max(0, m.spotsLeft - 1) } : m))
      );
      
      // Push notification for the match host
      const newNotice = {
        id: `notice-${Date.now()}`,
        matchTitle: title,
        playerName: "Player (You)",
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        status: "Unread",
      };
      const updatedNotices = [newNotice, ...hostNotices];
      setHostNotices(updatedNotices);
      localStorage.setItem("byv_host_notifications", JSON.stringify(updatedNotices));

      setToast(`Joined match lobby! Host notified.`);
    }
    localStorage.setItem("byv_joined_matches", JSON.stringify(nextJoined));
    localStorage.setItem("byv_joined_matches_detailed", JSON.stringify(nextJoinedDetailed));
  };

  const handleJoinClub = (id: string, name: string) => {
    const clubObj = clubs.find((c) => c.id === id);
    let nextClubs: string[] = [];
    let nextClubsDetailed: any[] = [];
    try {
      const savedDetailed = localStorage.getItem("byv_joined_clubs_detailed");
      if (savedDetailed) nextClubsDetailed = JSON.parse(savedDetailed);
    } catch (_) {}

    if (joinedClubs.includes(id)) {
      nextClubs = joinedClubs.filter((cid) => cid !== id);
      setJoinedClubs(nextClubs);
      nextClubsDetailed = nextClubsDetailed.filter((c) => c.clubId !== id);
      setClubs((prev) =>
        prev.map((c) => (c.id === id ? { ...c, members: c.members - 1 } : c))
      );
      setToast(`Left club: ${name}`);
    } else {
      nextClubs = [...joinedClubs, id];
      setJoinedClubs(nextClubs);
      if (clubObj) {
        nextClubsDetailed.push({
          clubId: id,
          name: clubObj.name,
          sport: clubObj.sport,
          place: clubObj.place,
          joinedAt: new Date().toISOString(),
          status: id.startsWith("c-2") ? "Pending Approval" : "Approved",
        });
      }
      setClubs((prev) =>
        prev.map((c) => (c.id === id ? { ...c, members: c.members + 1 } : c))
      );
      setToast(`Joined ${name}! Welcome to the community.`);
    }
    localStorage.setItem("byv_joined_clubs", JSON.stringify(nextClubs));
    localStorage.setItem("byv_joined_clubs_detailed", JSON.stringify(nextClubsDetailed));
  };

  const handleCreateLobbySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lobbyTitle || !lobbyPlace || !lobbyTime) {
      setToast("Please fill in all match lobby details.");
      return;
    }
    const newLobby: Match = {
      id: `m-${Date.now()}`,
      title: lobbyTitle,
      place: lobbyPlace,
      time: lobbyTime,
      spotsLeft: Number(lobbySpots),
      sport: lobbySport,
    };
    setMatches((prev) => [newLobby, ...prev]);

    // Persist created lobby
    let createdLobbies: any[] = [];
    try {
      const savedLobbies = localStorage.getItem("byv_created_lobbies");
      if (savedLobbies) createdLobbies = JSON.parse(savedLobbies);
    } catch (_) {}
    createdLobbies.unshift(newLobby);
    localStorage.setItem("byv_created_lobbies", JSON.stringify(createdLobbies));

    setLobbyTitle("");
    setLobbyPlace("");
    setLobbyTime("");
    setLobbyModalOpen(false);
    setToast("New Match Lobby created successfully!");
  };

  const handleCreateClubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubName || !clubPlace) {
      setToast("Please fill in all club details.");
      return;
    }
    const newClub: Club = {
      id: `c-${Date.now()}`,
      name: clubName,
      members: 1, // Creator is first member
      sport: clubSport,
      place: clubPlace,
    };
    setClubs((prev) => [newClub, ...prev]);

    // Add to joined detailed as Approved (since they created it)
    let nextClubsDetailed: any[] = [];
    try {
      const savedDetailed = localStorage.getItem("byv_joined_clubs_detailed");
      if (savedDetailed) nextClubsDetailed = JSON.parse(savedDetailed);
    } catch (_) {}
    nextClubsDetailed.push({
      clubId: newClub.id,
      name: newClub.name,
      sport: newClub.sport,
      place: newClub.place,
      joinedAt: new Date().toISOString(),
      status: "Approved",
    });
    localStorage.setItem("byv_joined_clubs_detailed", JSON.stringify(nextClubsDetailed));

    const updatedJoinedClubs = [...joinedClubs, newClub.id];
    setJoinedClubs(updatedJoinedClubs);
    localStorage.setItem("byv_joined_clubs", JSON.stringify(updatedJoinedClubs));

    // Persist created club in created list with mock join requests
    let createdClubs: any[] = [];
    try {
      const savedClubs = localStorage.getItem("byv_created_clubs");
      if (savedClubs) createdClubs = JSON.parse(savedClubs);
    } catch (_) {}

    const mockRequests = [
      {
        id: `req-${Date.now()}-1`,
        playerName: "Arjun Mehta",
        joinedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: `req-${Date.now()}-2`,
        playerName: "Rohan Verma",
        joinedAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ];

    createdClubs.unshift({
      ...newClub,
      adminStatus: "Pending Admin Review",
      requests: mockRequests,
      approvedMembers: ["Player (You)"],
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("byv_created_clubs", JSON.stringify(createdClubs));

    setClubName("");
    setClubPlace("");
    setClubModalOpen(false);
    setToast(`Created and joined your new club: ${clubName}!`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef2ff,_#f8fafc_45%,_#ffffff_80%)] pb-16">
      <div className="hidden sm:block">
        <SiteHeader />
      </div>

      <div className="sm:hidden">
        <div className="px-4 pt-4">
          <MobileTopBar />
        </div>
        <main className="flex flex-col gap-5 px-4 py-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Community</p>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
              Find players, matches, and clubs.
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Active matches, trusted feedback, and direct community creation tools.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setHostMatchModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-brand-600 py-3 text-xs font-bold text-white shadow-md shadow-brand-500/20"
            >
              <Plus className="h-4 w-4" /> Host Match
            </button>
            <button
              onClick={() => setClubModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 shadow-sm"
            >
              <Users className="h-4 w-4 text-brand-500" /> Start Club
            </button>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900">Open Match Lobbies</h2>
              <button
                type="button"
                onClick={() => setRequestsDrawerOpen(true)}
                className="relative flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                <Bell className="h-3.5 w-3.5 text-brand-600" />
                <span>Requests</span>
                {hostNotices.length > 0 && (
                  <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                    {hostNotices.length}
                  </span>
                )}
              </button>
            </div>

            {/* REAL LIVE HOSTED MATCHES FEED (MOBILE) */}
            {realHostedMatches.length > 0 && (
              <div className="mb-4 space-y-3">
                {realHostedMatches.map((m) => {
                  const turfTitle = typeof m.listingId === "object" ? m.listingId.title : "Sports Venue";
                  const turfLocation = typeof m.listingId === "object" ? `${m.listingId.city || ""}` : "";
                  const confirmedCount = m.participants.filter((p) => p.status === "Confirmed").length;
                  const spotsAvailable = Math.max(0, m.maxPlayers - confirmedCount);

                  let savedPhone = "";
                  try {
                    savedPhone = localStorage.getItem("byv_player_phone") || "";
                  } catch (e) {}

                  const btnState = getMatchButtonState(m, (customer as any)?._id || customer?.id, savedPhone);

                  return (
                    <MobileCard key={m._id} className="flex flex-col gap-2.5 border-emerald-100 bg-gradient-to-br from-emerald-50/30 to-white">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-extrabold text-brand-700 uppercase tracking-wider">
                          {m.sport}
                        </span>
                        {m.entryFeePerPlayer === 0 ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                            FREE JOIN
                          </span>
                        ) : (
                          <span className="text-xs font-black text-emerald-700">
                            ₹{m.entryFeePerPlayer} / player
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 leading-snug">{turfTitle}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" /> {turfLocation || "Venue Location"} • Host: <span className="font-bold text-slate-700">{m.hostName}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-brand-500" /> {m.startTime} – {m.endTime}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700">
                            {spotsAvailable} / {m.maxPlayers} Spots Left
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={btnState.disabled}
                          onClick={() => handleMatchClick(m)}
                          className={`rounded-full px-4 py-1.5 text-xs transition ${btnState.className}`}
                        >
                          {btnState.text}
                        </button>
                      </div>
                    </MobileCard>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-3">
              {matches.map((match) => {
                const isJoined = joinedMatches.includes(match.id);
                return (
                  <MobileCard key={match.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">
                        {match.sport} Match
                      </p>
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-bold text-sky-700">
                        {match.time}
                      </span>
                    </div>
                    <h2 className="text-base font-extrabold text-slate-950">{match.title}</h2>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {match.place}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-500">
                        {match.spotsLeft > 0 ? `${match.spotsLeft} spots left` : "Lobby Full"}
                      </span>
                      <button
                        onClick={() => openJoinModal(match)}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                          isJoined
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-950 text-white"
                        }`}
                      >
                        {isJoined ? "Joined ✓" : "Join Match"}
                      </button>
                    </div>
                  </MobileCard>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-base font-extrabold text-slate-900">Sports Clubs & Groups</h2>
            <div className="flex flex-col gap-3">
              {clubs.map((club) => {
                const isJoined = joinedClubs.includes(club.id);
                return (
                  <MobileCard key={club.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-600">
                        {club.sport} Club
                      </p>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <Users className="h-3 w-3" /> {club.members}
                      </span>
                    </div>
                    <h2 className="text-base font-extrabold text-slate-950">{club.name}</h2>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {club.place}
                    </p>
                    <button
                      onClick={() => handleJoinClub(club.id, club.name)}
                      className={`mt-2 w-full rounded-xl py-2 text-xs font-bold transition ${
                        isJoined
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {isJoined ? "Member ✓" : "Join Club"}
                    </button>
                  </MobileCard>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-base font-extrabold text-slate-900">What players say</h2>
            <div className="flex flex-col gap-3">
              {TESTIMONIALS.map((item) => (
                <MobileCard key={item.name}>
                  <p className="text-sm leading-6 text-slate-700">&ldquo;{item.quote}&rdquo;</p>
                  <p className="mt-3 text-sm font-bold text-slate-950">{item.name}</p>
                </MobileCard>
              ))}
            </div>
          </div>
        </main>
      </div>

      <main className="mx-auto hidden max-w-7xl px-4 py-10 sm:block sm:px-6 sm:py-14">
        <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.26)] sm:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-300">Community</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                Find players, matches, and sports groups.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Discover active match lobbies, join player-managed clubs near you, or host your own community games.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setHostMatchModalOpen(true)}
                className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition hover:scale-[1.02]"
              >
                <Plus className="h-4 w-4" /> Host Match Lobby
              </button>
              <button
                onClick={() => setClubModalOpen(true)}
                className="flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-6 py-3.5 text-sm font-bold text-slate-200 transition hover:bg-slate-900"
              >
                <Users className="h-4 w-4 text-brand-400" /> Create Sports Club
              </button>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900">Active Match Lobbies</h2>
            <p className="text-sm text-slate-500">Jump into open spots or team up for upcoming matches</p>
          </div>

          {/* REAL LIVE HOSTED MATCHES FEED (DESKTOP) */}
          {realHostedMatches.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-extrabold text-brand-600 uppercase tracking-widest mb-4">
                🔥 Live Player-Hosted Matches
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {realHostedMatches.map((m) => {
                  const turfTitle = typeof m.listingId === "object" ? m.listingId.title : "Sports Venue";
                  const turfCity = typeof m.listingId === "object" ? `${m.listingId.city || ""}` : "";
                  const confirmedCount = m.participants.filter((p) => p.status === "Confirmed").length;
                  const spotsAvailable = Math.max(0, m.maxPlayers - confirmedCount);

                  let savedPhone = "";
                  try {
                    savedPhone = localStorage.getItem("byv_player_phone") || "";
                  } catch (e) {}

                  const btnState = getMatchButtonState(m, (customer as any)?._id || customer?.id, savedPhone);

                  return (
                    <article
                      key={m._id}
                      className="flex flex-col justify-between rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-emerald-50/40 via-white to-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-brand-50 border border-brand-100 px-3 py-1 text-xs font-extrabold text-brand-700">
                            {m.sport}
                          </span>
                          {m.entryFeePerPlayer === 0 ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 uppercase tracking-wider">
                              FREE JOIN
                            </span>
                          ) : (
                            <span className="text-sm font-black text-emerald-700">
                              ₹{m.entryFeePerPlayer} / player
                            </span>
                          )}
                        </div>

                        <h3 className="mt-4 text-xl font-extrabold text-slate-950 leading-tight">{turfTitle}</h3>
                        <p className="mt-2 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {turfCity || "Venue Location"} • Host: <span className="font-bold text-slate-800">{m.hostName}</span>
                        </p>

                        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 rounded-xl p-2.5">
                          <Clock className="h-4 w-4 text-brand-500 shrink-0" />
                          <span>{m.date} · {m.startTime} – {m.endTime}</span>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-xs font-bold text-emerald-700">
                          {spotsAvailable} / {m.maxPlayers} Spots Available
                        </span>
                        <button
                          type="button"
                          disabled={btnState.disabled}
                          onClick={() => handleMatchClick(m)}
                          className={`flex items-center gap-1 rounded-full px-5 py-2.5 text-xs transition ${btnState.className}`}
                        >
                          {btnState.text}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            {matches.map((match) => {
              const isJoined = joinedMatches.includes(match.id);
              return (
                <article
                  key={match.id}
                  className="flex flex-col justify-between rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                        {match.sport}
                      </span>
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> {match.time}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-extrabold text-slate-950">{match.title}</h3>
                    <p className="mt-2 text-sm text-slate-500 flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-slate-400" /> {match.place}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4">
                    <span className="text-xs font-bold text-slate-500">
                      {match.spotsLeft > 0 ? `${match.spotsLeft} spots remaining` : "Lobby full"}
                    </span>
                    <button
                      onClick={() => openJoinModal(match)}
                      className={`flex items-center gap-1 rounded-full px-5 py-2 text-xs font-bold transition ${
                        isJoined
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-950 text-white hover:bg-brand-500"
                      }`}
                    >
                      {isJoined ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Joined
                        </>
                      ) : (
                        "Join Match"
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900">Featured Sports Clubs</h2>
            <p className="text-sm text-slate-500">Join dedicated local sports clubs to network with players</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {clubs.map((club) => {
              const isJoined = joinedClubs.includes(club.id);
              return (
                <article
                  key={club.id}
                  className="flex flex-col justify-between rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                        {club.sport}
                      </span>
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {club.members} Members
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-extrabold text-slate-950">{club.name}</h3>
                    <p className="mt-2 text-sm text-slate-500 flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-slate-400" /> Udaipur, {club.place}
                    </p>
                  </div>
                  <div className="mt-6 border-t border-slate-50 pt-4">
                    <button
                      onClick={() => handleJoinClub(club.id, club.name)}
                      className={`w-full flex items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-bold transition ${
                        isJoined
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {isJoined ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Club Member
                        </>
                      ) : (
                        "Join Club"
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <article
              key={item.name}
              className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm"
            >
              <p className="text-lg leading-8 text-slate-700">“{item.quote}”</p>
              <p className="mt-4 font-bold text-slate-950">{item.name}</p>
            </article>
          ))}
        </section>
      </main>

      {/* LOBBY MODAL */}
      {lobbyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">Host a Match Lobby</h3>
              <button
                onClick={() => setLobbyModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateLobbySubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Sport</label>
                <select
                  value={lobbySport}
                  onChange={(e) => setLobbySport(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-brand-500"
                >
                  <option value="Badminton">Badminton</option>
                  <option value="Cricket">Cricket</option>
                  <option value="Football">Football</option>
                  <option value="Pickleball">Pickleball</option>
                  <option value="Table Tennis">Table Tennis</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Lobby Title</label>
                <input
                  type="text"
                  placeholder="e.g. Friendly Doubles Match"
                  value={lobbyTitle}
                  onChange={(e) => setLobbyTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-brand-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 7:30 PM"
                    value={lobbyTime}
                    onChange={(e) => setLobbyTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Max Open Spots</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={lobbySpots}
                    onChange={(e) => setLobbySpots(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-brand-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Venue Location</label>
                <input
                  type="text"
                  placeholder="e.g. Shobhagpura Arena"
                  value={lobbyPlace}
                  onChange={(e) => setLobbyPlace(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-brand-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-slate-950 py-3 text-sm font-bold text-white hover:bg-brand-600 shadow-md transition"
              >
                Create Lobby
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CLUB MODAL */}
      {clubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">Launch a Sports Club</h3>
              <button
                onClick={() => setClubModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateClubSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Sport Category</label>
                <select
                  value={clubSport}
                  onChange={(e) => setClubSport(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-brand-500"
                >
                  <option value="Badminton">Badminton</option>
                  <option value="Cricket">Cricket</option>
                  <option value="Football">Football</option>
                  <option value="Pickleball">Pickleball</option>
                  <option value="Table Tennis">Table Tennis</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Club Name</label>
                <input
                  type="text"
                  placeholder="e.g. Udaipur Badminton Masters"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Local Area/Locality</label>
                <input
                  type="text"
                  placeholder="e.g. Shobhagpura"
                  value={clubPlace}
                  onChange={(e) => setClubPlace(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-brand-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-slate-950 py-3 text-sm font-bold text-white hover:bg-brand-600 shadow-md transition"
              >
                Create Sports Club
              </button>
            </form>
          </div>
        </div>
      )}

      {/* JOIN MATCH MODAL */}
      {selectedJoinMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600">
                  {selectedJoinMatch.sport} Lobby
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">{selectedJoinMatch.title}</h3>
              </div>
              <button
                onClick={() => setSelectedJoinMatch(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <MapPin className="h-4 w-4 text-brand-500 shrink-0" />
                <span>{selectedJoinMatch.place} · {selectedJoinMatch.time}</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Lobby Invite Link</label>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pl-3">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/community?lobby=${selectedJoinMatch.id}`}
                    className="w-full bg-transparent text-xs font-mono font-medium text-slate-700 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/community?lobby=${selectedJoinMatch.id}`;
                      navigator.clipboard?.writeText(url);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition ${
                      copiedLink ? "bg-emerald-600" : "bg-brand-600 hover:bg-brand-700"
                    }`}
                  >
                    {copiedLink ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              </div>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hey! Join our ${selectedJoinMatch.sport} match: "${selectedJoinMatch.title}" at ${selectedJoinMatch.place} (${selectedJoinMatch.time}). Click to join: ${typeof window !== "undefined" ? window.location.origin : ""}/community?lobby=${selectedJoinMatch.id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition"
              >
                <MessageSquare className="h-4 w-4" /> Join via WhatsApp Group
              </a>

              <button
                type="button"
                onClick={() => {
                  handleJoinMatch(selectedJoinMatch.id, selectedJoinMatch.title);
                  setSelectedJoinMatch(null);
                }}
                className={`w-full rounded-2xl py-3 text-xs font-bold uppercase tracking-wide transition ${
                  joinedMatches.includes(selectedJoinMatch.id)
                    ? "border border-slate-200 bg-white text-slate-700"
                    : "bg-slate-950 text-white shadow-lg"
                }`}
              >
                {joinedMatches.includes(selectedJoinMatch.id) ? "Leave Match Lobby" : "Confirm & Lock My Spot"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOST NOTIFICATIONS MODAL */}
      {noticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-brand-600" />
                <h3 className="text-lg font-extrabold text-slate-900">Host Join Requests</h3>
              </div>
              <button
                onClick={() => setNoticeModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-1">
              {hostNotices.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-2xl">
                  <Bell className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-500">No join requests yet.</p>
                </div>
              ) : (
                hostNotices.map((n) => (
                  <div key={n.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs flex flex-col gap-1">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{n.playerName}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{n.time}</span>
                    </div>
                    <p className="text-slate-600">Requested to join match: <span className="font-bold text-brand-600">{n.matchTitle}</span></p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setHostNotices((prev) => prev.filter((item) => item.id !== n.id));
                          localStorage.setItem("byv_host_notifications", JSON.stringify(hostNotices.filter((item) => item.id !== n.id)));
                          setToast("Accepted player into lobby!");
                        }}
                        className="flex-1 rounded-xl bg-emerald-600 py-1.5 text-[11px] font-bold text-white shadow-sm"
                      >
                        Accept Player
                      </button>
                      <button
                        onClick={() => {
                          setHostNotices((prev) => prev.filter((item) => item.id !== n.id));
                          localStorage.setItem("byv_host_notifications", JSON.stringify(hostNotices.filter((item) => item.id !== n.id)));
                          setToast("Declined request.");
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* HOST MATCH MODALS */}
      {hostMatchModalOpen && (
        <HostMatchModal
          onClose={() => setHostMatchModalOpen(false)}
          onMatchCreated={(m) => {
            getOpenHostedMatches()
              .then((data) => setRealHostedMatches(data))
              .catch(() => setRealHostedMatches((prev) => [m, ...prev]));
            setToast("Host Match published to community feed!");
          }}
        />
      )}

      {managingMatch && (
        <HostManageModal
          match={managingMatch}
          onClose={() => setManagingMatch(null)}
          onUpdated={(m) => {
            getOpenHostedMatches()
              .then((data) => setRealHostedMatches(data))
              .catch(() => setRealHostedMatches((prev) => prev.map((item) => (item._id === m._id ? m : item))));
          }}
        />
      )}

      {joiningMatch && (
        <PlayerJoinModal
          match={joiningMatch}
          onClose={() => setJoiningMatch(null)}
          onUpdated={(m) => {
            getOpenHostedMatches()
              .then((data) => setRealHostedMatches(data))
              .catch(() => setRealHostedMatches((prev) => prev.map((item) => (item._id === m._id ? m : item))));
          }}
        />
      )}

      {requestsDrawerOpen && (
        <RequestsDrawer
          onClose={() => setRequestsDrawerOpen(false)}
          onUpdated={(m) => {
            getOpenHostedMatches()
              .then((data) => setRealHostedMatches(data))
              .catch(() => setRealHostedMatches((prev) => prev.map((item) => (item._id === m._id ? m : item))));
          }}
        />
      )}

      {reviewNotif && (
        <ReviewRequestModal
          notification={reviewNotif}
          matchId={reviewNotif.matchId || ""}
          participantId={reviewNotif.participantId || ""}
          playerName={reviewNotif.playerName || "Player"}
          playerAvatar={reviewNotif.playerAvatar}
          sport={reviewNotif.sport || "Sport"}
          turfName={reviewNotif.turfName || "Venue"}
          date={reviewNotif.date || ""}
          timeSlot={reviewNotif.timeSlot || ""}
          entryFee={reviewNotif.entryFee || 0}
          onClose={() => setReviewNotif(null)}
          onUpdated={(m) => {
            getOpenHostedMatches()
              .then((data) => setRealHostedMatches(data))
              .catch(() => setRealHostedMatches((prev) => prev.map((item) => (item._id === m._id ? m : item))));
            setReviewNotif(null);
          }}
        />
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
