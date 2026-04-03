"use client";

export type NotificationPreferences = {
  desktop: boolean;
  sound: boolean;
  mentions: boolean;
  directMessages: boolean;
  threadReplies: boolean;
  huddles: boolean;
  mutedChannelIds: string[];
  mutedDmIds: string[];
};

export type PrivacyPreferences = {
  showOnlineStatus: boolean;
};

export type UserPreferences = {
  notificationPreferences: NotificationPreferences;
  privacyPreferences: PrivacyPreferences;
};

const STORAGE_KEY = "userPreferences";
const UPDATE_EVENT = "userPreferencesUpdated";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  desktop: true,
  sound: true,
  mentions: true,
  directMessages: true,
  threadReplies: true,
  huddles: true,
  mutedChannelIds: [],
  mutedDmIds: [],
};

export const DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferences = {
  showOnlineStatus: true,
};

function normalizeIdList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
    )
  );
}

export function normalizeNotificationPreferences(input?: Partial<NotificationPreferences> | null): NotificationPreferences {
  const value = input ?? {};

  return {
    desktop: value.desktop !== false,
    sound: value.sound !== false,
    mentions: value.mentions !== false,
    directMessages: value.directMessages !== false,
    threadReplies: value.threadReplies !== false,
    huddles: value.huddles !== false,
    mutedChannelIds: normalizeIdList(value.mutedChannelIds),
    mutedDmIds: normalizeIdList(value.mutedDmIds),
  };
}

export function normalizePrivacyPreferences(input?: Partial<PrivacyPreferences> | null): PrivacyPreferences {
  const value = input ?? {};

  return {
    showOnlineStatus: value.showOnlineStatus !== false,
  };
}

export function normalizeUserPreferences(input?: Partial<UserPreferences> | null): UserPreferences {
  return {
    notificationPreferences: normalizeNotificationPreferences(input?.notificationPreferences),
    privacyPreferences: normalizePrivacyPreferences(input?.privacyPreferences),
  };
}

export function readStoredUserPreferences(): UserPreferences {
  if (typeof window === "undefined") {
    return normalizeUserPreferences();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeUserPreferences();
    const parsed = JSON.parse(raw);
    return normalizeUserPreferences(parsed);
  } catch {
    return normalizeUserPreferences();
  }
}

export function writeStoredUserPreferences(input?: Partial<UserPreferences> | null): UserPreferences {
  const nextPreferences = normalizeUserPreferences({
    ...readStoredUserPreferences(),
    ...input,
  });

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: nextPreferences }));
  }

  return nextPreferences;
}

export function getUserPreferencesUpdateEventName() {
  return UPDATE_EVENT;
}

export function extractUserPreferencesFromApi(data: any): UserPreferences {
  return normalizeUserPreferences({
    notificationPreferences: data?.notification_preferences,
    privacyPreferences: data?.privacy_preferences,
  });
}

export function syncUserPreferencesFromApi(data: any): UserPreferences {
  return writeStoredUserPreferences(extractUserPreferencesFromApi(data));
}

export function isTargetMuted(
  notificationPreferences: NotificationPreferences,
  {
    channelId,
    isDm = false,
  }: {
    channelId?: string | number | null;
    isDm?: boolean;
  }
) {
  const normalizedId = channelId != null ? String(channelId).trim() : "";
  if (!normalizedId) return false;

  return isDm
    ? notificationPreferences.mutedDmIds.includes(normalizedId)
    : notificationPreferences.mutedChannelIds.includes(normalizedId);
}
