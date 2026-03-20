/**
 * localStorage helpers for read/unread state per channel.
 *
 *   lastRead:<channelId>      → highest message ID the user has read
 *   unreadCount:<channelId>   → persisted unread count (survives refresh)
 *   mentionCount:<channelId>  → persisted mention count (survives refresh)
 */

// ─── Last-read ─────────────────────────────────────────────────────────────

export function getLastRead(channelId: string | number): number | null {
  try {
    const val = localStorage.getItem(`lastRead:${channelId}`);
    if (val === null) return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  } catch { return null; }
}

export function setLastRead(channelId: string | number, messageId: string | number): void {
  try {
    const n = Number(messageId);
    if (isNaN(n) || n <= 0) return;
    const current = getLastRead(channelId);
    if (current !== null && n <= current) return; // only advance forward
    localStorage.setItem(`lastRead:${channelId}`, String(n));
  } catch {}
}

// ─── Unread count ──────────────────────────────────────────────────────────

export function getStoredUnread(channelId: string | number): number {
  try {
    const val = localStorage.getItem(`unreadCount:${channelId}`);
    if (val === null) return 0;
    const n = Number(val);
    return isNaN(n) ? 0 : Math.max(0, n);
  } catch { return 0; }
}

export function setStoredUnread(channelId: string | number, count: number): void {
  try {
    if (count <= 0) localStorage.removeItem(`unreadCount:${channelId}`);
    else localStorage.setItem(`unreadCount:${channelId}`, String(count));
  } catch {}
}

export function incrementStoredUnread(channelId: string | number): number {
  const next = getStoredUnread(channelId) + 1;
  setStoredUnread(channelId, next);
  return next;
}

export function clearStoredUnread(channelId: string | number): void {
  setStoredUnread(channelId, 0);
}

// ─── Mention count ─────────────────────────────────────────────────────────

export function getStoredMentionCount(channelId: string | number): number {
  try {
    const val = localStorage.getItem(`mentionCount:${channelId}`);
    if (val === null) return 0;
    const n = Number(val);
    return isNaN(n) ? 0 : Math.max(0, n);
  } catch { return 0; }
}

export function setStoredMentionCount(channelId: string | number, count: number): void {
  try {
    if (count <= 0) localStorage.removeItem(`mentionCount:${channelId}`);
    else localStorage.setItem(`mentionCount:${channelId}`, String(count));
  } catch {}
}

export function incrementStoredMentionCount(channelId: string | number): number {
  const next = getStoredMentionCount(channelId) + 1;
  setStoredMentionCount(channelId, next);
  return next;
}

export function clearStoredMentionCount(channelId: string | number): void {
  setStoredMentionCount(channelId, 0);
}
