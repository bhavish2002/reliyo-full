import { apiClient } from "@/lib/api/client";
import type { AppNotification } from "@/lib/notifications";

export function listNotifications() {
  return apiClient.get<AppNotification[]>("/notifications");
}

export function markNotificationReadApi(id: string) {
  return apiClient.patch<AppNotification>(`/notifications/${id}/read`, {});
}

export function markAllNotificationsReadApi() {
  return apiClient.post<void>("/notifications/mark-all-read");
}

export function toggleNotificationFlagApi(id: string) {
  return apiClient.patch<AppNotification>(`/notifications/${id}/flag`, {});
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  try {
    const rows = await listNotifications();
    return rows.filter((n) => !n.read).length;
  } catch {
    return 0;
  }
}
