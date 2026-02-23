/**
 * UnreadContext — shared unread count state between ChannelChat and AppSidebar.
 *
 * Why context instead of socket rooms?
 * ChannelChat emits "leaveChannel" when you navigate away, which removes the
 * socket from that room server-side. The sidebar can't reliably stay in rooms
 * it "joined" if ChannelChat is leaving them. Using a React context means
 * ChannelChat (which IS in the right room and DOES get receiveMessage) can
 * directly push counts to the sidebar — no room-join race condition.
 */
"use client";

import React, { createContext, useContext, useCallback, useRef, useState } from "react";
import { getStoredUnread, setStoredUnread, incrementStoredUnread, clearStoredUnread } from "@/hooks/useLastRead";

type UnreadContextType = {
  /** Current in-memory unread counts { channelId: count } */
  unreadCounts: Record<string, number>;
  /** Called by ChannelChat when a message arrives for a channel the user isn't viewing */
  incrementUnread: (channelId: string) => void;
  /** Called by app-sidebar (or ChannelChat) when the user opens a channel */
  clearUnread: (channelId: string) => void;
  /** Called on initial sidebar mount to seed counts from localStorage */
  seedFromStorage: (channelIds: string[]) => void;
};

const UnreadContext = createContext<UnreadContextType>({
  unreadCounts: {},
  incrementUnread: () => {},
  clearUnread: () => {},
  seedFromStorage: () => {},
});

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const incrementUnread = useCallback((channelId: string) => {
    const newCount = incrementStoredUnread(channelId);
    setUnreadCounts((prev) => ({ ...prev, [channelId]: newCount }));
  }, []);

  const clearUnread = useCallback((channelId: string) => {
    clearStoredUnread(channelId);
    setUnreadCounts((prev) => {
      if (!prev[channelId]) return prev;
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
  }, []);

  const seedFromStorage = useCallback((channelIds: string[]) => {
    const seeded: Record<string, number> = {};
    channelIds.forEach((id) => {
      const count = getStoredUnread(id);
      if (count > 0) seeded[id] = count;
    });
    if (Object.keys(seeded).length > 0) {
      setUnreadCounts((prev) => ({ ...prev, ...seeded }));
    }
  }, []);

  return (
    <UnreadContext.Provider value={{ unreadCounts, incrementUnread, clearUnread, seedFromStorage }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}
