import { useState, useEffect } from "react";
import type { Notification } from "../types";
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  setNotificationReadStatus,
} from "../lib/notifications";
import { timeAgo } from "../lib/timeAgo";
import { Bell } from "lucide-react";

const POLL_INTERVAL_MS = 30000;

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const loadNotifications = () => {
    fetchMyNotifications()
      .then(setNotifications)
      .catch(() => {});
  };

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(loadNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = async (n: Notification) => {
    const nextRead = !n.read;
    const previous = n.read;

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === n.id ? { ...item, read: nextRead } : item,
      ),
    );

    try {
      await setNotificationReadStatus(n.id, nextRead);
    } catch {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, read: previous } : item,
        ),
      );
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition hover:bg-border-dark"
      >
        <span className="text-sm ">
          <Bell className="text-on-dark-muted w-5 h-5 " />
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-white font-mono">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border-dark bg-surface-raised shadow-lg z-10">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-dark">
            <p className="text-xs font-mono font-semibold uppercase tracking-widest text-on-dark">
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-mono uppercase cursor-pointer tracking-wide text-brand hover:text-brand-hover"
              >
                Mark_Read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-2 scrollbar-thin">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-on-dark-muted">
                No notifications yet.
              </p>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`relative flex gap-2.5 rounded-lg px-3 py-3 border border-border-dark cursor-pointer transition hover:border-on-dark-muted ${
                  n.read ? "bg-bg" : "bg-brand/5"
                }`}
              >
                {!n.read && (
                  <span className="absolute left-0 top-0 h-full w-0.5 rounded-l-lg bg-brand" />
                )}
                <Bell className="h-4 w-4 shrink-0 mt-0.5 text-on-dark-muted" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-on-dark leading-snug">
                    {n.message}
                  </p>
                  <p className="mt-1 text-xs text-on-dark-muted font-mono">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
