import { apiRequest } from "./client";
import type { CustomerNotification } from "./types";

export async function getCustomerNotifications(phone?: string): Promise<CustomerNotification[]> {
  const query = phone ? { phone } : undefined;
  const headers: Record<string, string> = {};
  if (phone) headers["x-player-phone"] = phone;

  return apiRequest<CustomerNotification[]>("/notifications", {
    query,
    headers,
    audience: "customer",
  });
}

export async function markNotificationRead(id: string, phone?: string): Promise<CustomerNotification> {
  const query = phone ? { phone } : undefined;
  const headers: Record<string, string> = {};
  if (phone) headers["x-player-phone"] = phone;

  return apiRequest<CustomerNotification>(`/notifications/${id}/read`, {
    method: "PATCH",
    query,
    headers,
    audience: "customer",
  });
}

export async function markAllNotificationsRead(phone?: string): Promise<{ count: number }> {
  const query = phone ? { phone } : undefined;
  const headers: Record<string, string> = {};
  if (phone) headers["x-player-phone"] = phone;

  return apiRequest<{ count: number }>("/notifications/read-all", {
    method: "POST",
    query,
    headers,
    audience: "customer",
  });
}
