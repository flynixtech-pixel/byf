import { apiRequest } from "./client";

export type ChallengeStatus = "pending" | "accepted" | "rejected" | "cancelled" | "completed";
export type ChallengePlayersCount = "1v1" | "2v2" | "team";
export type ChallengeSeries = "BO1" | "BO3" | "BO5";
export type ChallengeMatchStyle = "friendly" | "competitive" | "tournament";
export type ChallengeStakeType = "Treat" | "Movie" | "Cash" | "Trophy" | "Apology Post" | "Reel" | "Custom";

export interface ChallengePlayer {
  id: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  initials: string;
  relation: string;
}

export interface ChallengeTeamMember {
  name: string;
  phone?: string;
  id?: string;
}

export interface Challenge {
  id: string;
  code: string;
  challenger: { id: string; name: string; phone?: string; avatarUrl?: string } | null;
  opponent: { id?: string; name: string; phone?: string; avatarUrl?: string } | null;
  /** Full roster for team matches — team1 always includes the challenger, team2 the opponent. */
  team1Members?: ChallengeTeamMember[];
  team2Members?: ChallengeTeamMember[];
  sport: string;
  venueName: string;
  /** Set only when the venue was picked from real listings — enables QR check-in at that venue. */
  venueId?: string;
  arrived?: boolean;
  arrivedAt?: string;
  scheduleLabel: string;
  scheduledAt?: string;
  playersCount: ChallengePlayersCount;
  series: ChallengeSeries;
  matchStyle: ChallengeMatchStyle;
  entryFee: number;
  stakeType: ChallengeStakeType;
  stakeText: string;
  inviteUrl: string;
  shareMessage: string;
  status: ChallengeStatus;
  createdAt: string;
  poster: {
    challengerInitials: string;
    opponentInitials: string;
  };
}

export interface CreateChallengeInput {
  opponentId?: string;
  opponentName?: string;
  opponentPhone?: string;
  team1Members?: ChallengeTeamMember[];
  team2Members?: ChallengeTeamMember[];
  sport: string;
  venueName: string;
  venueId?: string;
  scheduleLabel: string;
  scheduledAt?: string;
  playersCount: ChallengePlayersCount;
  series: ChallengeSeries;
  matchStyle: ChallengeMatchStyle;
  entryFee: number;
  stakeType: ChallengeStakeType;
  stakeText: string;
  inviteBaseUrl?: string;
}

export function listChallengePlayers(query?: { search?: string; limit?: number }) {
  return apiRequest<ChallengePlayer[]>("/challenges/players", { audience: "customer", query });
}

export function createChallenge(input: CreateChallengeInput) {
  return apiRequest<Challenge>("/challenges", { method: "POST", body: input, audience: "customer" });
}

export function getChallengeInvite(code: string) {
  return apiRequest<Challenge>(`/challenges/invite/${code}`);
}

export function acceptChallenge(code: string) {
  return apiRequest<Challenge>(`/challenges/${code}/accept`, { method: "POST", audience: "customer" });
}

export function rejectChallenge(code: string) {
  return apiRequest<Challenge>(`/challenges/${code}/reject`, { method: "POST", audience: "customer" });
}
