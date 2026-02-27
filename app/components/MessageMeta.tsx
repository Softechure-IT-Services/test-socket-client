/**
 * Shared message primitives — used in ChannelChat, ThreadPanel, Threads page, and MainHeader.
 *
 * Visual contract (matches the app screenshot):
 *   • Avatar  — w-8 h-8, rounded-sm, coloured initial tile as fallback
 *   • Name    — text-sm font-semibold, gray-900 dark:gray-100
 *   • Time    — text-[11px], gray-400, opacity-0 by default, shows on group-hover
 *   • "(edited)" — small muted badge, inline after timestamp
 *
 * Save at: @/app/components/MessageMeta.tsx
 */

// ─── Avatar colour palette ────────────────────────────────────────────────────
const AVATAR_COLOURS = [
  "bg-gray-400",
 
];

function avatarColour(name: string): string {
  return AVATAR_COLOURS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLOURS.length];
}

// ─── Size maps ────────────────────────────────────────────────────────────────
type AvatarSize = "xs" | "sm" | "md" | "lg";

const AVATAR_DIM: Record<AvatarSize, string> = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-7 h-7 text-[11px]",
  md: "w-8 h-8 text-sm",   // primary size — matches ChannelChat / ThreadPanel
  lg: "w-9 h-9 text-sm",
};

// ─── UserAvatar ───────────────────────────────────────────────────────────────
/**
 * Renders an avatar image when available, otherwise a coloured initial tile.
 *
 * @param name      — display name (used for initials + colour seed)
 * @param avatarUrl — raw value from DB (e.g. "abc.webp").
 *                    Pass http/https URLs as-is; relative paths are prefixed with /avatar/.
 * @param size      — "xs" | "sm" | "md" | "lg"   (default "md")
 * @param rounded   — "sm" | "full"                (default "sm")
 * @param className — extra Tailwind classes
 */
export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  rounded = "sm",
  className = "",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: AvatarSize;
  rounded?: "sm" | "full";
  className?: string;
}) {
  const dim = AVATAR_DIM[size];
  const shape = rounded === "full" ? "rounded-full" : "rounded-sm";
  const initial = (name ?? "?")[0]?.toUpperCase() ?? "?";

  if (avatarUrl) {
    const src = avatarUrl.startsWith("http") ? avatarUrl : `/avatar/${avatarUrl}`;
    return (
      <img
        src={src}
        alt={name}
        className={`${dim} ${shape} object-cover shrink-0 aspect-square ${className}`}
      />
    );
  }

  return (
    <div
      className={`${dim} ${shape} ${avatarColour(name)} text-white flex items-center justify-center font-semibold shrink-0 select-none ${className}`}
    >
      {initial}
    </div>
  );
}

// ─── SenderName ───────────────────────────────────────────────────────────────
/**
 * Bold display name for a message author.
 */
export function SenderName({
  name,
  className = "",
}: {
  name: string | null | undefined;
  className?: string;
}) {
  if (!name) return null;
  return (
    <span
      className={`text-sm font-semibold leading-none text-gray-900 dark:text-gray-100 ${className}`}
    >
      {name}
    </span>
  );
}

// ─── EditedBadge ──────────────────────────────────────────────────────────────
/**
 * Reusable "(edited)" label — used inside MessageTimestamp and standalone
 * in MessageRow for compact (no-header) messages.
 */
export function EditedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`text-[10px] italic text-gray-400 dark:text-gray-500 whitespace-nowrap ${className}`}
    >
      (edited)
    </span>
  );
}

// ─── MessageTimestamp ─────────────────────────────────────────────────────────
/**
 * Renders a formatted time string (e.g. "3:42 PM").
 * Optionally appends an "(edited)" label.
 *
 * @param dateStr    — ISO date string
 * @param edited     — show "(edited)" label
 * @param alwaysShow — when false (default) the timestamp is hidden until the nearest
 *                     group-hover ancestor shows it. Set true on the Threads page
 *                     where timestamps are always visible.
 * @param className  — extra classes
 */
export function MessageTimestamp({
  dateStr,
  edited = false,
  alwaysShow = false,
  className = "",
}: {
  dateStr: string | null | undefined;
  edited?: boolean;
  alwaysShow?: boolean;
  className?: string;
}) {
  if (!dateStr) return null;

  const formatted = new Date(dateStr).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <span
      className={`text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap ${
        alwaysShow ? "" : "opacity-0 group-hover:opacity-100 transition-opacity"
      } ${className}`}
    >
      {formatted}
      {edited && <EditedBadge className="ml-1" />}
    </span>
  );
}

// ─── MessageHeader ────────────────────────────────────────────────────────────
/**
 * Combines SenderName + MessageTimestamp in a single flex row.
 * Drop this in wherever you show the top line of a message.
 *
 * @param alwaysShowTime — pass true on the Threads page; false (default) for chat
 */
export function MessageHeader({
  senderName,
  dateStr,
  edited = false,
  alwaysShowTime = false,
  className = "",
}: {
  senderName: string | null | undefined;
  dateStr: string | null | undefined;
  edited?: boolean;
  alwaysShowTime?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline gap-2 flex-wrap ${className}`}>
      <SenderName name={senderName} />
      <MessageTimestamp
        dateStr={dateStr}
        edited={edited}
        alwaysShow={alwaysShowTime}
      />
    </div>
  );
}

// ─── ChannelLabel ─────────────────────────────────────────────────────────────
/**
 * Shows the correct prefix/icon for a channel:
 *   - DM              → "💬 Direct Message"
 *   - Private channel → "🔒 name"
 *   - Public channel  → "# name"
 */
export function ChannelLabel({
  name,
  isDm,
  isPrivate,
  className = "",
}: {
  name: string | null | undefined;
  isDm: boolean;
  isPrivate?: boolean | null;
  className?: string;
}) {
  if (isDm) {
    return (
      <span className={`text-xs font-medium text-gray-400 ${className}`}>
        💬 Direct Message
      </span>
    );
  }
  const prefix = isPrivate ? "🔒" : "#";
  return (
    <span className={`text-xs font-medium text-gray-400 ${className}`}>
      {prefix} {name ?? "unknown"}
    </span>
  );
}

// ─── ReplyCountPill ───────────────────────────────────────────────────────────
/**
 * The "N replies · View thread →" button shown below a message in ChannelChat.
 */
export function ReplyCountPill({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  if (!count) return null;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 mt-0.5 ml-10 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 dark:hover:bg-blue-900/20 px-2 py-1 rounded-md transition-colors group/thread cursor-pointer w-fit"
    >
      <span className="font-semibold">
        {count} {count === 1 ? "reply" : "replies"}
      </span>
      <span className="text-gray-400 dark:text-gray-500 opacity-0 group-hover/thread:opacity-100 transition-opacity text-[11px]">
        View thread →
      </span>
    </button>
  );
}