/**
 * usePushNotifications
 *
 * Handles browser push notifications for new messages.
 * Works alongside the socket-based unread badge system.
 *
 * Usage:
 *   Call `requestPermission()` once (e.g. on first login or from a settings button).
 *   Then call `showNotification(...)` whenever a background message arrives.
 *
 * The hook also registers a Service Worker (public/sw.js) which enables
 * notifications even when the browser tab is in the background.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";

export type PushNotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  channelId?: string | number;
  url?: string;
};

export function usePushNotifications() {
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Register the service worker once on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        swRegistrationRef.current = reg;
      })
      .catch((err) => {
        console.warn("SW registration failed:", err);
      });
  }, []);

  /** Ask the user for notification permission. Call this from a UI button. */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    if (Notification.permission === "granted") return "granted";
    const result = await Notification.requestPermission();
    return result;
  }, []);

  /**
   * Show a notification.
   * - Uses the Service Worker if available (works when tab is backgrounded).
   * - Falls back to the Notification API directly.
   * - Skips if the document is currently visible (user is actively looking).
   */
  const showNotification = useCallback(
    ({ title, body, icon, channelId, url }: PushNotificationPayload) => {
      if (typeof window === "undefined") return;
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      // Don't show notification if the user is actively viewing the page
      if (document.visibilityState === "visible") return;

      const options: NotificationOptions = {
        body,
        icon: icon ?? "/favicon.ico",
        badge: "/favicon.ico",
        tag: channelId ? `channel-${channelId}` : "message",
        renotify: true,
        data: { url: url ?? (channelId ? `/channel/${channelId}` : "/") },
      };

      if (swRegistrationRef.current) {
        swRegistrationRef.current.showNotification(title, options).catch(() => {
          // SW notification failed, fallback
          new Notification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    },
    []
  );

  return { requestPermission, showNotification, permission: typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied" };
}
