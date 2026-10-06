import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, UserCheck, UserX, XCircle, CheckCircle2, ClipboardList } from "lucide-react";
import { authHeader } from "../../utilities/api";
import { portalPathFor } from "../../utilities/companyUrl";

const NOTIFICATIONS_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/notifications`;
const POLL_INTERVAL_MS = 20000;

const TYPE_ICONS = {
  ride_requested: ClipboardList,
  ride_assigned: UserCheck,
  driver_confirmed: Check,
  driver_declined: UserX,
  ride_cancelled: XCircle,
  ride_completed: CheckCircle2,
};

const TYPE_COLORS = {
  ride_requested: "text-amber-600 bg-amber-100",
  ride_assigned: "text-blue-600 bg-blue-100",
  driver_confirmed: "text-emerald-600 bg-emerald-100",
  driver_declined: "text-red-600 bg-red-100",
  ride_cancelled: "text-red-600 bg-red-100",
  ride_completed: "text-emerald-600 bg-emerald-100",
};

// Structured type -> destination mapping - deliberately keyed by
// notification.type and notification.rideId, NEVER by parsing the message
// text. Every ride-related type currently resolves to the same page: the
// Dispatcher Ride Requests list is the only ride-management view this app
// has (a Manager viewing it is already admitted via Dispatcher Mode - see
// components/RequireRole.js), so there's nowhere else to send any of
// them yet. Kept as an explicit per-type set rather than "any type with a
// rideId" so a future type that ISN'T navigable (if one is ever added)
// doesn't silently start navigating somewhere wrong.
const RIDE_NOTIFICATION_TYPES = new Set([
  "ride_requested",
  "ride_assigned",
  "driver_confirmed",
  "driver_declined",
  "ride_cancelled",
  "ride_completed",
]);

// Returns null when a notification has no known destination (e.g. a future
// type this hasn't been taught about yet, or one with no rideId) - callers
// must treat that as "not clickable-through", not fall back to guessing.
const getNotificationDestination = (notification, companySlug) => {
  if (!notification?.rideId || !RIDE_NOTIFICATION_TYPES.has(notification.type)) return null;
  return `${portalPathFor("dispatcher", companySlug)}/rides?highlight=${notification.rideId}`;
};

const formatTimeAgo = (isoString) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// Real notifications only - backed by backend/server/models/notificationModel.js,
// created as a side effect of real ride events (see utilities/notifier.js's
// call sites in routes/rideRoutes.js: ride requested/assigned/confirmed/
// declined/cancelled/completed). Company-scoped server-side via the JWT,
// same as every other list in this app - never trusts anything client-side
// for isolation.
const NotificationBell = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await axios.get(NOTIFICATIONS_URL, { headers: authHeader() });
      setNotifications(data);
    } catch (err) {
      // Non-fatal - the bell just shows no notifications until the next poll.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (notification) => {
    if (notification.isRead) return;
    setNotifications((prev) => prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n)));
    try {
      await axios.patch(`${NOTIFICATIONS_URL}/${notification._id}/read`, {}, { headers: authHeader() });
    } catch (err) {
      // Best-effort - a failed mark-as-read just means it'll still show
      // unread next refresh, not worth surfacing an error for.
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await axios.patch(`${NOTIFICATIONS_URL}/read-all`, {}, { headers: authHeader() });
    } catch (err) {
      // Best-effort, same as markAsRead above.
    }
  };

  const handleToggle = () => {
    setIsOpen((v) => !v);
    if (!isOpen) fetchNotifications();
  };

  // Mark-as-read happens either way (requirement: clicking always marks
  // read); navigation only happens when this notification actually has a
  // known destination (see getNotificationDestination above).
  const handleNotificationClick = (notification) => {
    markAsRead(notification);
    const destination = getNotificationDestination(notification, user?.companySlug);
    if (destination) {
      setIsOpen(false);
      navigate(destination);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative text-rideflow-navy/40 hover:text-rideflow-navy transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rideflow-orange text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-black/5 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-rideflow-navy">Notifications</p>
              <p className="text-xs text-rideflow-navy/50">Recent ride activity</p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rideflow-orange hover:text-rideflow-orange-hover transition-colors shrink-0"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && <p className="text-sm text-rideflow-navy/40 px-4 py-6 text-center">Loading...</p>}

            {!isLoading && notifications.length === 0 && (
              <p className="text-sm text-rideflow-navy/40 px-4 py-6 text-center">No new notifications</p>
            )}

            {!isLoading &&
              notifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] || Bell;
                const colorClass = TYPE_COLORS[notification.type] || "text-rideflow-navy/60 bg-rideflow-gray/60";
                return (
                  <button
                    key={notification._id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-black/5 last:border-0 transition-colors cursor-pointer hover:bg-rideflow-orange/10 ${
                      notification.isRead ? "" : "bg-rideflow-orange/5"
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon size={14} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-rideflow-navy leading-snug">{notification.message}</span>
                      <span className="block text-xs text-rideflow-navy/40 mt-0.5">{formatTimeAgo(notification.createdAt)}</span>
                    </span>
                    {!notification.isRead && <span className="w-2 h-2 rounded-full bg-rideflow-orange shrink-0 mt-1.5" aria-hidden="true" />}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
