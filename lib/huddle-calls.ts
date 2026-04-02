"use client";

export const HUDDLE_CALL_HISTORY_STORAGE_KEY = "huddle-call-history:v1";
export const HUDDLE_CALL_HISTORY_UPDATED_EVENT = "huddle-call-history-updated";

export type StoredHuddleCallEntry = {
  roomId: string;
  channelId: string | null;
  title: string;
  startedByUserId: string | null;
  firstJoinedAt: string;
  lastJoinedAt: string;
  lastLeftAt: string | null;
};

type UpsertStoredHuddleCallInput = {
  roomId: string;
  channelId?: string | null;
  title?: string | null;
  startedByUserId?: string | number | null;
  joinedAt?: string;
};

const MAX_HISTORY_ENTRIES = 30;

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const sortHistory = (entries: StoredHuddleCallEntry[]) =>
  [...entries].sort((a, b) => {
    const aTime = new Date(a.lastLeftAt ?? a.lastJoinedAt).getTime();
    const bTime = new Date(b.lastLeftAt ?? b.lastJoinedAt).getTime();
    return bTime - aTime;
  });

const writeStoredHuddleCalls = (entries: StoredHuddleCallEntry[]) => {
  if (!canUseStorage()) return;
  const normalized = sortHistory(entries).slice(0, MAX_HISTORY_ENTRIES);
  window.localStorage.setItem(
    HUDDLE_CALL_HISTORY_STORAGE_KEY,
    JSON.stringify(normalized)
  );
  window.dispatchEvent(new Event(HUDDLE_CALL_HISTORY_UPDATED_EVENT));
};

export const readStoredHuddleCalls = (): StoredHuddleCallEntry[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(HUDDLE_CALL_HISTORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return sortHistory(
      parsed
        .map((entry): StoredHuddleCallEntry | null => {
          if (!entry || typeof entry !== "object") return null;
          const roomId =
            typeof entry.roomId === "string" ? entry.roomId.trim() : "";
          if (!roomId) return null;

          const title =
            typeof entry.title === "string" && entry.title.trim()
              ? entry.title.trim()
              : "Huddle";

          return {
            roomId,
            channelId:
              typeof entry.channelId === "string" && entry.channelId.trim()
                ? entry.channelId.trim()
                : null,
            title,
            startedByUserId:
              entry.startedByUserId != null &&
              String(entry.startedByUserId).trim()
                ? String(entry.startedByUserId).trim()
                : null,
            firstJoinedAt:
              typeof entry.firstJoinedAt === "string" && entry.firstJoinedAt
                ? entry.firstJoinedAt
                : new Date().toISOString(),
            lastJoinedAt:
              typeof entry.lastJoinedAt === "string" && entry.lastJoinedAt
                ? entry.lastJoinedAt
                : new Date().toISOString(),
            lastLeftAt:
              typeof entry.lastLeftAt === "string" && entry.lastLeftAt
                ? entry.lastLeftAt
                : null,
          };
        })
        .filter(Boolean) as StoredHuddleCallEntry[]
    );
  } catch {
    return [];
  }
};

export const upsertStoredHuddleCall = ({
  roomId,
  channelId = null,
  title,
  startedByUserId = null,
  joinedAt,
}: UpsertStoredHuddleCallInput) => {
  if (!canUseStorage() || !roomId) return;

  const normalizedRoomId = String(roomId).trim();
  if (!normalizedRoomId) return;

  const normalizedChannelId = channelId != null ? String(channelId).trim() : null;
  const normalizedStartedByUserId =
    startedByUserId != null ? String(startedByUserId).trim() : null;
  const nextJoinedAt = joinedAt ?? new Date().toISOString();

  const current = readStoredHuddleCalls();
  const existingIndex = current.findIndex(
    (entry) => entry.roomId === normalizedRoomId
  );

  if (existingIndex >= 0) {
    const existing = current[existingIndex];
    current[existingIndex] = {
      ...existing,
      channelId: normalizedChannelId || existing.channelId,
      title:
        title && title.trim() && title !== "Room" ? title.trim() : existing.title,
      startedByUserId:
        normalizedStartedByUserId || existing.startedByUserId,
      lastJoinedAt: nextJoinedAt,
      lastLeftAt: null,
    };
    writeStoredHuddleCalls(current);
    return;
  }

  current.unshift({
    roomId: normalizedRoomId,
    channelId: normalizedChannelId,
    title: title && title.trim() ? title.trim() : "Huddle",
    startedByUserId: normalizedStartedByUserId,
    firstJoinedAt: nextJoinedAt,
    lastJoinedAt: nextJoinedAt,
    lastLeftAt: null,
  });

  writeStoredHuddleCalls(current);
};

export const markStoredHuddleCallLeft = (
  roomId: string | null | undefined,
  leftAt = new Date().toISOString()
) => {
  if (!canUseStorage() || !roomId) return;

  const normalizedRoomId = String(roomId).trim();
  if (!normalizedRoomId) return;

  const current = readStoredHuddleCalls();
  const existingIndex = current.findIndex(
    (entry) => entry.roomId === normalizedRoomId
  );
  if (existingIndex < 0) return;

  current[existingIndex] = {
    ...current[existingIndex],
    lastLeftAt: leftAt,
  };

  writeStoredHuddleCalls(current);
};

export const buildHuddleJoinUrl = ({
  channelId,
  roomId,
  includeRoomId = false,
}: {
  channelId?: string | null;
  roomId?: string | null;
  includeRoomId?: boolean;
}) => {
  const params = new URLSearchParams();

  if (channelId) {
    params.set("channel_id", String(channelId));
    if (includeRoomId && roomId) {
      params.set("meeting_id", String(roomId));
    }
  } else if (roomId) {
    params.set("meeting_id", String(roomId));
  }

  const query = params.toString();
  return query ? `/huddle?${query}` : "/huddle";
};
