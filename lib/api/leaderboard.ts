import { apiRequest } from "./client";

export interface RankedPlayer {
  playerId: string;
  name: string;
  username?: string;
  profileImage?: string | null;
  city: string;
  area?: string;
  areas?: string[];
  sports?: string[];
  completedBookings: number;
  rank: number;
  lastBookingDate?: string;
}

export interface PlayerLeaderboardResult {
  success: boolean;
  items: RankedPlayer[];
  areas?: string[];
  count: number;
}

export async function getTopPlayersLeaderboard(params?: {
  area?: string;
  sport?: string;
  limit?: number;
}): Promise<PlayerLeaderboardResult> {
  const query = new URLSearchParams();
  if (params?.area && !params.area.toLowerCase().includes("all")) query.set("area", params.area);
  if (params?.sport && !params.sport.toLowerCase().includes("all")) query.set("sport", params.sport);
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  try {
    const res = await apiRequest<PlayerLeaderboardResult>(`/leaderboard/players${qs ? `?${qs}` : ""}`);
    return res || { success: false, items: [], count: 0 };
  } catch {
    return { success: false, items: [], count: 0 };
  }
}
