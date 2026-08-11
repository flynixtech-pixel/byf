import { apiRequest } from "./client";
import type { HostedMatch } from "./types";

export interface CreateHostedMatchInput {
  listingId: string;
  sport: string;
  dateTime: string;
  durationMinutes?: number;
  courtId?: string;
  pricingType: "host_pays_all" | "split_cost";
  entryFeePerPlayer?: number;
  maxPlayers: number;
  hostName?: string;
  hostPhone?: string;
  hostEmail?: string;
}

export function createHostedMatch(input: CreateHostedMatchInput) {
  return apiRequest<HostedMatch>("/hosted-matches", {
    method: "POST",
    body: input,
    audience: "customer",
  });
}

export function confirmHostPayment(matchId: string, paymentId?: string) {
  return apiRequest<HostedMatch>(`/hosted-matches/${matchId}/confirm-host-payment`, {
    method: "POST",
    body: { paymentId },
    audience: "customer",
  });
}

export function getOpenHostedMatches(params: { sport?: string; date?: string; limit?: number } = {}) {
  return apiRequest<HostedMatch[]>("/hosted-matches/feed", {
    query: params,
  });
}

export function getHostedMatchDetails(matchId: string) {
  return apiRequest<HostedMatch>(`/hosted-matches/${matchId}`);
}

export function joinHostedMatch(matchId: string, input: { name?: string; phone?: string } = {}) {
  return apiRequest<HostedMatch>(`/hosted-matches/${matchId}/join`, {
    method: "POST",
    body: input,
    audience: "customer",
  });
}

export function respondToParticipantRequest(matchId: string, participantId: string, action: "accept" | "reject") {
  return apiRequest<{ match: HostedMatch; playerOrderId?: string }>(
    `/hosted-matches/${matchId}/participants/${participantId}/respond`,
    {
      method: "POST",
      body: { action },
      audience: "customer",
    }
  );
}

export function confirmPlayerPayment(matchId: string, participantId: string, paymentId?: string) {
  return apiRequest<HostedMatch>(`/hosted-matches/${matchId}/confirm-player-payment`, {
    method: "POST",
    body: { participantId, paymentId },
    audience: "customer",
  });
}
