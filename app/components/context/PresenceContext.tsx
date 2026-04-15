"use client";

import React from "react";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";

type PresenceEntry = {
  isOnline: boolean;
  lastSeen: string | null;
  isHidden: boolean;
  isHuddling?: boolean;
};

type PartialPresenceUser = {
  id?: string | number | null;
  user_id?: string | number | null;
  userId?: string | number | null;
  is_online?: boolean | null;
  isOnline?: boolean | null;
  online?: boolean | null;
  status?: "online" | "offline";
  last_seen?: string | null;
  lastSeen?: string | null;
  presence_hidden?: boolean | null;
  presenceHidden?: boolean | null;
  is_huddling?: boolean | null;
  isHuddling?: boolean | null;
};

type PresenceContextValue = {
  isOnline: (id?: string | number | null) => boolean;
  isHuddling: (id?: string | number | null) => boolean;
  getLastSeen: (id?: string | number | null) => string | null;
  isHidden: (id?: string | number | null) => boolean;
  isChannelHuddling: (channelId?: string | number | null) => boolean;
  seedUsers: (users: PartialPresenceUser[]) => void;
  seedChannelHuddles: (channelIds: (string | number)[]) => void;
};

const PresenceContext = React.createContext<PresenceContextValue | null>(null);

const PRESENCE_EVENT = "userPresenceChanged";

function normalizeUserId(raw: string | number | null | undefined) {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return String(n);
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { socket, user } = useAuth();
  const [presenceMap, setPresenceMap] = React.useState<Record<string, PresenceEntry>>({});
  const [activeHuddleChannels, setActiveHuddleChannels] = React.useState<Record<string, boolean>>({});
  const currentUserId = normalizeUserId(user?.id ?? null);

  const applyPresenceUpdate = React.useCallback(
    (
      idValue: string | number | null | undefined,
      isOnline?: boolean | null,
      lastSeen?: string | null,
      isHidden?: boolean | null,
      isHuddling?: boolean | null
    ) => {
      const key = normalizeUserId(idValue);
      if (!key) return;
      setPresenceMap((prev) => {
        const prevEntry = prev[key];
        const nextHidden = typeof isHidden === "boolean" ? isHidden : prevEntry?.isHidden ?? false;
        const nextEntry: PresenceEntry = {
          isOnline: nextHidden
            ? false
            : typeof isOnline === "boolean"
            ? isOnline
            : prevEntry?.isOnline ?? false,
          lastSeen: nextHidden ? null : lastSeen ?? prevEntry?.lastSeen ?? null,
          isHidden: nextHidden,
          isHuddling: typeof isHuddling === "boolean" ? isHuddling : prevEntry?.isHuddling ?? false,
        };
        if (
          !prevEntry ||
          prevEntry.isOnline !== nextEntry.isOnline ||
          prevEntry.lastSeen !== nextEntry.lastSeen ||
          prevEntry.isHidden !== nextEntry.isHidden ||
          prevEntry.isHuddling !== nextEntry.isHuddling
        ) {
          return { ...prev, [key]: nextEntry };
        }
        return prev;
      });
    },
    []
  );

  const seedUsers = React.useCallback(
    (users: PartialPresenceUser[]) => {
      if (!Array.isArray(users) || users.length === 0) return;
      setPresenceMap((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const user of users) {
          const key = normalizeUserId(user.id ?? user.user_id ?? user.userId);
          if (!key) continue;
          const normalizedLastSeen = user.last_seen ?? user.lastSeen ?? null;
          const incomingHidden = user.presence_hidden ?? user.presenceHidden ?? undefined;
          const incomingIsHuddling = user.is_huddling ?? user.isHuddling ?? undefined;
          const incomingOnline =
            user.is_online ?? user.isOnline ?? (typeof user.online === "boolean" ? user.online : undefined) ??
            (user.status ? user.status === "online" : undefined);
          const prevEntry = next[key];
          const nextHidden =
            typeof incomingHidden === "boolean" ? incomingHidden : prevEntry?.isHidden ?? false;
          const entry: PresenceEntry = {
            isOnline: nextHidden
              ? false
              : typeof incomingOnline === "boolean"
              ? incomingOnline
              : prevEntry?.isOnline ?? false,
            lastSeen: nextHidden ? null : normalizedLastSeen ?? prevEntry?.lastSeen ?? null,
            isHidden: nextHidden,
            isHuddling: typeof incomingIsHuddling === "boolean" ? incomingIsHuddling : prevEntry?.isHuddling ?? false,
          };
          if (
            !prevEntry ||
            prevEntry.isOnline !== entry.isOnline ||
            prevEntry.lastSeen !== entry.lastSeen ||
            prevEntry.isHidden !== entry.isHidden ||
            prevEntry.isHuddling !== entry.isHuddling
          ) {
            next[key] = entry;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    },
    []
  );
  
  const seedChannelHuddles = React.useCallback(
    (channelIds: (string | number)[]) => {
      if (!Array.isArray(channelIds)) return;
      const next: Record<string, boolean> = {};
      for (const id of channelIds) {
        const key = normalizeUserId(id);
        if (key) next[key] = true;
      }
      setActiveHuddleChannels((prev) => ({ ...prev, ...next }));
    },
    []
  );

  React.useEffect(() => {
    if (!socket) return;

    const handlePresence = (payload: PartialPresenceUser & { userId?: string | number; is_online?: boolean; last_seen?: string }) => {
      const key = payload.userId ?? payload.user_id ?? payload.id;
      if (currentUserId && normalizeUserId(key) === currentUserId) return;
      const isOnline =
        payload.is_online ??
        payload.isOnline ??
        (typeof payload.online === "boolean" ? payload.online : undefined) ??
        (payload.status ? payload.status === "online" : undefined);
      const lastSeen = payload.last_seen ?? payload.lastSeen ?? null;
      const isHidden = payload.presence_hidden ?? payload.presenceHidden ?? null;
      const isHuddling = payload.is_huddling ?? payload.isHuddling ?? null;
      applyPresenceUpdate(key, isOnline ?? null, lastSeen, isHidden, isHuddling);
    };

    const handleHuddleStarted = (payload: { channel_id: string | number }) => {
      const channelId = normalizeUserId(payload.channel_id);
      if (!channelId) return;
      setActiveHuddleChannels((prev) => ({ ...prev, [channelId]: true }));
    };

    const handleHuddleEnded = (payload: { channel_id: string | number }) => {
      const channelId = normalizeUserId(payload.channel_id);
      if (!channelId) return;
      setActiveHuddleChannels((prev) => ({ ...prev, [channelId]: false }));
    };

    socket.on(PRESENCE_EVENT, handlePresence);
    socket.on("huddleStarted", handleHuddleStarted);
    socket.on("huddleEnded", handleHuddleEnded);

    if (typeof socket.emit === "function") {
      socket.emit("presence:subscribe");
    }

    return () => {
      socket.off(PRESENCE_EVENT, handlePresence);
      socket.off("huddleStarted", handleHuddleStarted);
      socket.off("huddleEnded", handleHuddleEnded);
    };
  }, [socket, applyPresenceUpdate, currentUserId]);

  React.useEffect(() => {
    if (!user?.id) return;
    applyPresenceUpdate(user.id, true, null, false);
  }, [user?.id, applyPresenceUpdate]);

  const value = React.useMemo<PresenceContextValue>(
    () => ({
      isOnline: (id) => {
        const key = normalizeUserId(id);
        if (!key) return false;
        return presenceMap[key]?.isOnline ?? false;
      },
      isHuddling: (id) => {
        const key = normalizeUserId(id);
        if (!key) return false;
        return presenceMap[key]?.isHuddling ?? false;
      },
      getLastSeen: (id) => {
        const key = normalizeUserId(id);
        if (!key) return null;
        return presenceMap[key]?.lastSeen ?? null;
      },
      isHidden: (id) => {
        const key = normalizeUserId(id);
        if (!key) return false;
        return presenceMap[key]?.isHidden ?? false;
      },
      isChannelHuddling: (id) => {
        const key = normalizeUserId(id);
        if (!key) return false;
        return activeHuddleChannels[key] ?? false;
      },
      seedUsers,
      seedChannelHuddles,
    }),
    [presenceMap, activeHuddleChannels, seedUsers, seedChannelHuddles]
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const ctx = React.useContext(PresenceContext);
  if (!ctx) throw new Error("usePresence must be used within PresenceProvider");
  return ctx;
}
