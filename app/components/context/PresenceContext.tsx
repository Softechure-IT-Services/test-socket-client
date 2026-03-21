"use client";

import React from "react";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";

type PresenceEntry = {
  isOnline: boolean;
  lastSeen: string | null;
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
};

type PresenceContextValue = {
  isOnline: (id?: string | number | null) => boolean;
  getLastSeen: (id?: string | number | null) => string | null;
  seedUsers: (users: PartialPresenceUser[]) => void;
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

  const applyPresenceUpdate = React.useCallback(
    (idValue: string | number | null | undefined, isOnline?: boolean | null, lastSeen?: string | null) => {
      const key = normalizeUserId(idValue);
      if (!key) return;
      setPresenceMap((prev) => {
        const prevEntry = prev[key];
        const nextEntry: PresenceEntry = {
          isOnline: typeof isOnline === "boolean" ? isOnline : prevEntry?.isOnline ?? false,
          lastSeen: lastSeen ?? prevEntry?.lastSeen ?? null,
        };
        if (!prevEntry || prevEntry.isOnline !== nextEntry.isOnline || prevEntry.lastSeen !== nextEntry.lastSeen) {
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
          const incomingOnline =
            user.is_online ?? user.isOnline ?? (typeof user.online === "boolean" ? user.online : undefined) ??
            (user.status ? user.status === "online" : undefined);
          const prevEntry = next[key];
          const entry: PresenceEntry = {
            isOnline: typeof incomingOnline === "boolean" ? incomingOnline : prevEntry?.isOnline ?? false,
            lastSeen: normalizedLastSeen ?? prevEntry?.lastSeen ?? null,
          };
          if (!prevEntry || prevEntry.isOnline !== entry.isOnline || prevEntry.lastSeen !== entry.lastSeen) {
            next[key] = entry;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    },
    []
  );

  React.useEffect(() => {
    if (!socket) return;

    const handlePresence = (payload: PartialPresenceUser & { userId?: string | number; is_online?: boolean; last_seen?: string }) => {
      const key = payload.userId ?? payload.user_id ?? payload.id;
      const isOnline =
        payload.is_online ??
        payload.isOnline ??
        (typeof payload.online === "boolean" ? payload.online : undefined) ??
        (payload.status ? payload.status === "online" : undefined);
      const lastSeen = payload.last_seen ?? payload.lastSeen ?? null;
      applyPresenceUpdate(key, isOnline ?? null, lastSeen);
    };

    socket.on(PRESENCE_EVENT, handlePresence);
    if (typeof socket.emit === "function") {
      socket.emit("presence:subscribe");
    }

    return () => {
      socket.off(PRESENCE_EVENT, handlePresence);
    };
  }, [socket, applyPresenceUpdate]);

  React.useEffect(() => {
    if (!user?.id) return;
    applyPresenceUpdate(user.id, true, null);
  }, [user?.id, applyPresenceUpdate]);

  const value = React.useMemo<PresenceContextValue>(
    () => ({
      isOnline: (id) => {
        const key = normalizeUserId(id);
        if (!key) return false;
        return presenceMap[key]?.isOnline ?? false;
      },
      getLastSeen: (id) => {
        const key = normalizeUserId(id);
        if (!key) return null;
        return presenceMap[key]?.lastSeen ?? null;
      },
      seedUsers,
    }),
    [presenceMap, seedUsers]
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const ctx = React.useContext(PresenceContext);
  if (!ctx) throw new Error("usePresence must be used within PresenceProvider");
  return ctx;
}
