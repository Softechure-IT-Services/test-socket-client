"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/axios";
import {
  HUDDLE_CALL_HISTORY_STORAGE_KEY,
  HUDDLE_CALL_HISTORY_UPDATED_EVENT,
  buildHuddleJoinUrl,
  readStoredHuddleCalls,
} from "@/lib/huddle-calls";
import { useAuth } from "@/app/components/context/userId_and_connection/provider";

export type HuddleCallListItem = {
  roomId: string;
  channelId: string | null;
  title: string;
  href: string;
  isOngoing: boolean;
  isDm: boolean;
  startedByUserId: string | null;
  startedByUsername: string | null;
  firstJoinedAt: string | null;
  lastJoinedAt: string | null;
  lastLeftAt: string | null;
  startedAt: string | null;
};

type ChannelSummary = {
  id: string;
  name: string;
  isDm: boolean;
};

const formatDmStarterTitle = (startedByUsername: string | null) =>
  startedByUsername ? `Started by ${startedByUsername}` : "Direct message";

const isGenericStoredTitle = (title: string | null | undefined, channelId: string | null) => {
  if (!title || !title.trim()) return true;

  const normalizedTitle = title.trim().toLowerCase();
  return (
    normalizedTitle === "huddle" ||
    normalizedTitle === "room" ||
    normalizedTitle.startsWith("room:") ||
    (channelId != null && normalizedTitle === `channel ${String(channelId).toLowerCase()}`)
  );
};

const resolveHuddleTitle = ({
  channelId,
  channel,
  fallbackTitle,
  startedByUserId,
  startedByUsername,
}: {
  channelId: string | null;
  channel?: ChannelSummary | null;
  fallbackTitle?: string | null;
  startedByUserId?: string | null;
  startedByUsername?: string | null;
}) => {
  if (channel?.isDm) {
    if (startedByUsername) return formatDmStarterTitle(startedByUsername);
    if (startedByUserId) return formatDmStarterTitle(startedByUserId);
    if (fallbackTitle && !isGenericStoredTitle(fallbackTitle, channelId)) {
      return fallbackTitle.trim();
    }
    return formatDmStarterTitle(null);
  }

  if (channel?.name?.trim()) return channel.name.trim();
  if (fallbackTitle?.trim()) return fallbackTitle.trim();
  if (channelId) return `Channel ${channelId}`;
  return "Huddle";
};

export function useHuddleCalls() {
  const { socket, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ongoingCalls, setOngoingCalls] = useState<HuddleCallListItem[]>([]);
  const [recentCalls, setRecentCalls] = useState<HuddleCallListItem[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setOngoingCalls([]);
      setRecentCalls([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [channelResponse, dmResponse] = await Promise.all([
        api.get(`/channels?get_dms=false`),
        api.get(`/dm`).catch(() => ({ data: [] })),
      ]);

      const channels: ChannelSummary[] = (channelResponse.data ?? []).map((channel: any) => ({
        id: String(channel.id),
        name: channel.name || `Channel ${channel.id}`,
        isDm: false,
      }));
      const dmChannels: ChannelSummary[] = (dmResponse.data ?? []).map((channel: any) => ({
        id: String(channel.id),
        name: channel.name || "Direct message",
        isDm: true,
      }));

      const channelMap = new Map<string, ChannelSummary>();
      [...channels, ...dmChannels].forEach((channel) => {
        channelMap.set(channel.id, channel);
      });

      const channelsToCheck = [...channelMap.values()];

      const activeEntries = await Promise.all(
        channelsToCheck.map(async (channel) => {
          try {
            const { data } = await api.get(`/huddle/channel/${channel.id}/active`);
            if (!data?.active || !data?.room_id) return null;

            const roomId = String(data.room_id);
            const startedByUserId =
              data?.session?.started_by != null
                ? String(data.session.started_by)
                : data?.started_by != null
                ? String(data.started_by)
                : null;
            const startedByUsername =
              typeof data?.session?.started_by_username === "string" &&
              data.session.started_by_username.trim()
                ? data.session.started_by_username.trim()
                : typeof data?.started_by_username === "string" &&
                  data.started_by_username.trim()
                ? data.started_by_username.trim()
                : null;

            return {
              roomId,
              channelId: channel.id,
              title: resolveHuddleTitle({
                channelId: channel.id,
                channel,
                startedByUserId,
                startedByUsername,
              }),
              href: buildHuddleJoinUrl({
                channelId: channel.id,
                roomId,
                includeRoomId: true,
              }),
              isOngoing: true,
              isDm: channel.isDm,
              startedByUserId,
              startedByUsername,
              firstJoinedAt: null,
              lastJoinedAt: null,
              lastLeftAt: null,
              startedAt:
                data?.session?.started_at ??
                data?.session?.created_at ??
                data?.started_at ??
                null,
            } satisfies HuddleCallListItem;
          } catch {
            return null;
          }
        })
      );

      const normalizedOngoingCalls = activeEntries.filter(Boolean) as HuddleCallListItem[];
      const activeRoomIds = new Set(
        normalizedOngoingCalls.map((entry) => entry.roomId)
      );

      const normalizedRecentCalls = readStoredHuddleCalls()
        .map((entry) => {
          const channel = entry.channelId ? channelMap.get(entry.channelId) : null;
          const startedByUserId = entry.startedByUserId ?? null;
          const startedByUsername = entry.startedByUsername ?? null;

          return {
            roomId: entry.roomId,
            channelId: entry.channelId,
            title: resolveHuddleTitle({
              channelId: entry.channelId,
              channel,
              fallbackTitle: entry.title,
              startedByUserId,
              startedByUsername,
            }),
            href: buildHuddleJoinUrl({
              channelId: entry.channelId,
              roomId: entry.roomId,
              includeRoomId: !entry.channelId,
            }),
            isOngoing: false,
            isDm: channel?.isDm ?? false,
            startedByUserId,
            startedByUsername,
            firstJoinedAt: entry.firstJoinedAt,
            lastJoinedAt: entry.lastJoinedAt,
            lastLeftAt: entry.lastLeftAt,
            startedAt: null,
          } satisfies HuddleCallListItem;
        })
        .filter((entry) => !activeRoomIds.has(entry.roomId));

      setOngoingCalls(normalizedOngoingCalls);
      setRecentCalls(normalizedRecentCalls);
    } catch (error) {
      console.error("Failed to load huddle calls:", error);
      setOngoingCalls([]);
      setRecentCalls(readStoredHuddleCalls().map((entry) => ({
        roomId: entry.roomId,
        channelId: entry.channelId,
        title: entry.title,
        href: buildHuddleJoinUrl({
          channelId: entry.channelId,
          roomId: entry.roomId,
          includeRoomId: !entry.channelId,
        }),
        isOngoing: false,
        isDm: false,
        startedByUserId: entry.startedByUserId ?? null,
        startedByUsername: entry.startedByUsername ?? null,
        firstJoinedAt: entry.firstJoinedAt,
        lastJoinedAt: entry.lastJoinedAt,
        lastLeftAt: entry.lastLeftAt,
        startedAt: null,
      })));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleHistoryUpdated = () => {
      void refresh();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === HUDDLE_CALL_HISTORY_STORAGE_KEY) {
        void refresh();
      }
    };
    const handleFocus = () => {
      void refresh();
    };

    window.addEventListener(HUDDLE_CALL_HISTORY_UPDATED_EVENT, handleHistoryUpdated);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener(
        HUDDLE_CALL_HISTORY_UPDATED_EVENT,
        handleHistoryUpdated
      );
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!socket) return;

    const handleLiveUpdate = () => {
      void refresh();
    };

    socket.on("huddleStarted", handleLiveUpdate);
    socket.on("huddleEnded", handleLiveUpdate);

    return () => {
      socket.off("huddleStarted", handleLiveUpdate);
      socket.off("huddleEnded", handleLiveUpdate);
    };
  }, [socket, refresh]);

  return {
    loading,
    ongoingCalls,
    recentCalls,
    refresh,
  };
}
