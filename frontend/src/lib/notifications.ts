import api from "../api/axios";
import type { Notification } from "../types";

export const fetchMyNotifications = async (): Promise<Notification[]> => {
  const { data } = await api.get("/notifications");
  return data.notifications;
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.patch("/notifications/read-all");
};
