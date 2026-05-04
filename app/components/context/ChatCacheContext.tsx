"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type ChatFile = {
  id: number;
  url: string;
  name: string;
  type: string;
  size: number;
};

export type ReactionUser = {
  id: number | string;
  name: string;
};

export type Reaction = { emoji: string; count: number; users?: ReactionUser[] };

export type ForwardedFrom = {
  id: string | null;
  name: string | null;
  channel_id: number | null;
  channel_name?: string | null;
  channel_is_dm?: boolean;
};

export type ChatMessage = {
  id: number | string;
  sender_id: string;
  sender_name?: string;
  avatar_url?: string | null;
  content: string;
  files?: ChatFile[];
  self: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  reactions?: Reaction[];
  pinned?: boolean;
  is_forwarded?: boolean;
  forwarded_from?: ForwardedFrom | null;
  is_system?: boolean;
  thread_count?: number;
  is_edited?: boolean;
};

export type ChatCacheData = {
  messages: ChatMessage[];
  nextCursor: number | null;
  hasMore: boolean;
  nextAfterCursor: number | null;
  hasMoreNewer: boolean;
  scrollPos?: number;
};

type ChatCacheContextType = {
  cache: Record<string, ChatCacheData>;
  setChatCache: (channelId: string, data: Partial<ChatCacheData>) => void;
  clearChatCache: (channelId: string) => void;
};

const ChatCacheContext = createContext<ChatCacheContextType>({
  cache: {},
  setChatCache: () => {},
  clearChatCache: () => {},
});

export function ChatCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<Record<string, ChatCacheData>>({});

  const setChatCache = useCallback((channelId: string, data: Partial<ChatCacheData>) => {
    setCache((prev) => {
      const existing = prev[channelId] || {
        messages: [],
        nextCursor: null,
        hasMore: true,
        nextAfterCursor: null,
        hasMoreNewer: false,
      };
      return {
        ...prev,
        [channelId]: {
          ...existing,
          ...data,
        },
      };
    });
  }, []);

  const clearChatCache = useCallback((channelId: string) => {
    setCache((prev) => {
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
  }, []);

  return (
    <ChatCacheContext.Provider value={{ cache, setChatCache, clearChatCache }}>
      {children}
    </ChatCacheContext.Provider>
  );
}

export function useChatCache() {
  return useContext(ChatCacheContext);
}
