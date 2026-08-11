import { apiRequest, type Paginated } from "./client";
import type { PaymentMethod, Tournament, TournamentPlayer, TournamentRegistration, TournamentRegistrationStatus, TournamentStatus } from "./types";

export function browsePublicTournaments(
  params: { category?: string; city?: string; status?: TournamentStatus; page?: number; limit?: number } = {}
) {
  return apiRequest<Paginated<Tournament>>("/tournaments", { query: params });
}

export function getPublicTournamentById(id: string) {
  return apiRequest<Tournament>(`/tournaments/${id}`);
}

export interface RegisterTeamInput {
  tournamentId: string;
  teamName: string;
  captainName?: string;
  captainPhone?: string;
  captainEmail?: string;
  players: TournamentPlayer[];
  payment: PaymentMethod;
}

export function registerTeam(input: RegisterTeamInput) {
  return apiRequest<TournamentRegistration>("/tournament-registrations", { method: "POST", body: input, audience: "customer" });
}

export function getMyRegistrations(params: { status?: TournamentRegistrationStatus; page?: number; limit?: number } = {}) {
  return apiRequest<Paginated<TournamentRegistration>>("/tournament-registrations", { query: params, audience: "customer" });
}

export function getMyRegistrationByOrderId(orderId: string) {
  return apiRequest<TournamentRegistration>(`/tournament-registrations/${orderId}`, { audience: "customer" });
}

export function cancelMyRegistration(orderId: string, cancellationReason?: string) {
  return apiRequest<TournamentRegistration>(`/tournament-registrations/${orderId}/cancel`, {
    method: "POST",
    body: { cancellationReason },
    audience: "customer",
  });
}
