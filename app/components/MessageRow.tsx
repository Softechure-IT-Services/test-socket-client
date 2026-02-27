// File: @/app/components/MessageRow.tsx
"use client";

import React, { memo } from "react";
import DOMPurify from "dompurify";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { TbPinFilled } from "react-icons/tb";

import ChatHover, { type Reaction as ChatHoverReaction } from "@/app/components/chat-hover";
import { UserAvatar, MessageTimestamp, ReplyCountPill, EditedBadge } from "@/app/components/MessageMeta";

import { FileAttachmentList, type AttachmentFile } from "@/app/components/FileAttachment";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type { AttachmentFile as MsgFile };

export type MsgReactionUser = {
  id: number | string;
  name: string;
};

export type MsgReaction = {
  emoji: string;
  count: number;
  users?: MsgReactionUser[];
};

export type MsgForwardedFrom = {
  id: string | null;
  name: string | null;
  channel_id: number | null;
  channel_name?: string | null;
  channel_is_dm?: boolean;
};

export type MessageRowData = {
  id: string | number;
  sender_id: string | number;
  sender_name?: string;
  avatar_url?: string | null;
  content: string;
  created_at?: string | null;
  updated_at?: string | null;
  reactions?: MsgReaction[];
  files?: AttachmentFile[];
  pinned?: boolean;
  is_forwarded?: boolean;
  forwarded_from?: MsgForwardedFrom | null;
  thread_count?: number;
  is_edited?: boolean;
};

export type MessageRowProps = {
  msg: MessageRowData;
  showHeader: boolean;
  isHighlighted?: boolean;

  currentUserId?: string | number;

  onToggleReaction?: (messageId: string | number, emoji: string) => void;
  onDownloadFile?: (file: AttachmentFile) => void;
  onShareFile?: (messageId: string | number) => void;

  isHovered?: boolean;
  isLocked?: boolean;
  isMember?: boolean;

  onChatAction?: (action: string, messageId: string) => void;
  onChatHoverOpenChange?: (isOpen: boolean) => void;

  onOpenThread?: (msg: MessageRowData) => void;

  className?: string;
  in_thread?: boolean;

  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

// ─────────────────────────────────────────────────────────────
// GIF header injection
// ─────────────────────────────────────────────────────────────

function injectGifHeaders(html: string): string {
  return html.replace(
    /<img([^>]*?)title="via GIPHY"([^>]*?)>/gi,
    (match, before, after) => {
      const altMatch = (before + after).match(/alt="([^"]*)"/i);
      const title = altMatch ? altMatch[1] : "GIF";
      const header =
        `<div style="display:flex;align-items:center;gap:6px;padding:2px 4px;border-radius:4px;background:rgba(0,0,0,0.05);font-size:11px;color:#6b7280;margin-bottom:6px;">` +
        `<span style="flex-shrink:0;font-weight:700;font-size:10px;padding:1px 4px;border-radius:3px;background:#6366f1;color:#fff;line-height:1;">GIF</span>` +
        `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;display:inline-block;">${title}</span>` +
        `<span style="margin-left:auto;flex-shrink:0;opacity:0.6;font-size:10px;padding-left:6px;">via GIPHY</span>` +
        `</div>`;
      return `<div style="display:inline-flex;flex-direction:column;max-width:100%;">${header}${match}</div>`;
    }
  );
}

// ─────────────────────────────────────────────────────────────
// Memoized rich-text renderer
// ─────────────────────────────────────────────────────────────

const MessageContent = memo(
  ({ html, className }: { html: string | null | undefined; className?: string }) => (
    <div
      className={className}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(injectGifHeaders(html ?? ""), { ADD_ATTR: ["style"] }),
      }}
    />
  ),
  (prev, next) => prev.html === next.html && prev.className === next.className
);
MessageContent.displayName = "MessageContent";

// ─────────────────────────────────────────────────────────────
// Forwarded card
// ─────────────────────────────────────────────────────────────

function ForwardedCard({
  forwarded_from,
  content,
  currentUserId,
}: {
  forwarded_from?: MsgForwardedFrom | null;
  content: string;
  currentUserId?: string | number;
}) {
  const senderLabel =
    forwarded_from?.id && String(forwarded_from.id) === String(currentUserId)
      ? "you"
      : forwarded_from?.name ?? "unknown";

  const channelLabel = forwarded_from?.channel_name
    ? forwarded_from.channel_is_dm
      ? forwarded_from.channel_name
      : `#${forwarded_from.channel_name}`
    : null;

  return (
    <div className="border-l-2 border-blue-400 dark:border-blue-500 pl-3 pr-2 py-1.5 mt-0.5 rounded-r-md bg-blue-50/50 dark:bg-blue-950/20 max-w-full">
      <div className="flex items-start gap-2 mb-1 flex-wrap">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-blue-400 shrink-0 mt-[2px]"
        >
          <polyline points="15 10 20 15 15 20" />
          <path d="M4 4v7a4 4 0 0 0 4 4h12" />
        </svg>

        <div className="flex flex-col gap-0.5 leading-none">
          <span className="text-[11px] text-blue-500 dark:text-blue-400 font-medium leading-none">
            Forwarded from <span className="font-bold">{senderLabel}</span>
          </span>
          {channelLabel && (
            <span className="text-[10px] text-blue-400/80 dark:text-blue-500/80 leading-none">
              {forwarded_from?.channel_is_dm ? "in a DM" : `in ${channelLabel}`}
            </span>
          )}
        </div>
      </div>

      <MessageContent
        html={content}
        className="leading-relaxed max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] text-[0.95em] opacity-90"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reactions strip
// ─────────────────────────────────────────────────────────────

function ReactionsStrip({
  reactions,
  currentUserId,
  isMember,
  onToggle,
}: {
  reactions: MsgReaction[];
  currentUserId?: string | number;
  isMember?: boolean;
  onToggle?: (emoji: string) => void;
}) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="flex gap-1 flex-wrap whitespace-nowrap mt-1 w-fit">
      {reactions.map((r, idx) => {
        const currentUserReacted = (r.users ?? []).some((u) => String(u.id) === String(currentUserId));

        const tooltipUsers = [
          ...(r.users ?? [])
            .filter((u) => String(u.id) === String(currentUserId))
            .map(() => "You"),
          ...(r.users ?? [])
            .filter((u) => String(u.id) !== String(currentUserId))
            .map((u) => u.name ?? ""),
        ];

        return (
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <span
                onClick={() => isMember && onToggle?.(r.emoji)}
                className={`text-sm px-2 leading-none py-1 rounded-full flex items-center gap-1 select-none transition-colors
                  ${isMember ? "cursor-pointer" : "cursor-default opacity-60"}
                  ${currentUserReacted
                    ? "bg-blue-100 border border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:border-blue-400 dark:text-blue-300"
                    : "bg-gray-200 border border-transparent hover:border-gray-400 dark:bg-zinc-700 dark:text-gray-200"}
                `}
              >
                {r.emoji} {r.count > 1 ? r.count : null}
              </span>
            </TooltipTrigger>

            <TooltipContent className="bg-black text-white p-2 text-xs rounded-md flex flex-col gap-1 min-w-[80px]">
              <p className="font-semibold border-b border-white/20 pb-1 mb-0.5">
                {r.emoji} {r.count === 1 ? "1 person" : `${r.count} people`}
              </p>
              {tooltipUsers.length > 0 ? (
                tooltipUsers.map((name, j) => (
                  <span key={j} className={`truncate max-w-[140px] ${name === "You" ? "font-semibold text-blue-300" : ""}`}>
                    {name}
                  </span>
                ))
              ) : (
                // Users array present but names not yet hydrated — show count so
                // the tooltip is never completely empty
                <span className="opacity-60 italic">
                  {r.count === 1 ? "1 person reacted" : `${r.count} people reacted`}
                </span>
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MessageRow
// ─────────────────────────────────────────────────────────────

export const MessageRow = memo(function MessageRow({
  msg,
  showHeader,
  isHighlighted = false,
  currentUserId,
  onToggleReaction,
  onDownloadFile,
  onShareFile,
  isHovered = false,
  isLocked = false,
  isMember = true,
  onChatAction,
  onChatHoverOpenChange,
  onOpenThread,
  className = "",
  onMouseEnter,
  in_thread,
  onMouseLeave,
}: MessageRowProps) {
  const msgId = String(msg.id);
  const isEdited = !!msg.is_edited;
  const showChatHover = isMember && (isLocked ? isLocked : isHovered);

  const contentNode = msg.is_forwarded ? (
    <ForwardedCard forwarded_from={msg.forwarded_from} content={msg.content} currentUserId={currentUserId} />
  ) : (
    <MessageContent html={msg.content} className="leading-relaxed max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] message" />
  );

  const subContent = (
    <>
      <FileAttachmentList
        files={msg.files ?? []}
        onDownload={(file) => onDownloadFile?.(file)}
        // FileAttachmentList typically calls onShare(file). The app-level onShareFile accepts message id,
        // so map the call to pass the message id (keep behavior simple). Adjust if your FileAttachmentList expects different.
        onShare={(file) => onShareFile?.(msg.id)}
        readOnly={!isMember}
      />

      <ReactionsStrip
        reactions={msg.reactions ?? []}
        currentUserId={currentUserId}
        isMember={isMember}
        onToggle={(emoji) => onToggleReaction?.(msg.id, emoji)}
      />

      {!showHeader && isEdited && <EditedBadge />}
    </>
  );

  return (
    <div
      id={`msg-${msgId}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`relative flex justify-start group/message !px-[25px] items-center gap-3
        ${msg.pinned ? "pinned bg-amber-100 dark:bg-amber-900/20" : "hover:bg-[var(--sidebar-accent)]"}
        ${isHighlighted ? "bg-red-200 dark:bg-red-900/30 animate-pulse" : ""}
        ${className}`}
    >
      {/* Pin icon */}
      {msg.pinned && (
        <span className="absolute top-0 right-0">
          <TbPinFilled size={20} className="text-amber-400" />
        </span>
      )}

      {showHeader ? (
        <div className="py-1 w-full min-w-0">
          <div className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-2 min-w-0">
            {/* Avatar — spans both name row and content row */}
            <UserAvatar name={msg.sender_name ?? ""} avatarUrl={msg.avatar_url} size="md" className="row-span-2 mt-0.5" />

            {/* Name + timestamp */}
            <div className="flex items-baseline gap-2 flex-wrap h-fit">
              {msg.sender_name && <span className="text-sm font-semibold leading-none text-gray-900 dark:text-gray-100">{msg.sender_name}</span>}
              <MessageTimestamp dateStr={msg.created_at} edited={isEdited} alwaysShow />
            </div>

            {/* Content + sub-features in second grid row */}
            <div className="min-w-0">
              {contentNode}
              {subContent}
            </div>
          </div>

          {/* Reply count pill sits outside the grid, indented to align with content */}
          {onOpenThread && <ReplyCountPill count={msg.thread_count ?? 0} onClick={() => onOpenThread(msg)} />}
        </div>
      ) : (
        <div className="py-0.5 w-full min-w-0 relative group">
          {/* Hover timestamp in gutter */}
          <MessageTimestamp dateStr={msg.created_at} alwaysShow={false} className="absolute top-[0.3rem] left-0 pr-1.5 text-[10px] -translate-x-[15px]" />

          {/* Content indented to match header rows */}
          <div className="ml-10 min-w-0">
            {contentNode}
            {subContent}
          </div>

          {onOpenThread && <ReplyCountPill count={msg.thread_count ?? 0} onClick={() => onOpenThread(msg)} />}
        </div>
      )}

      {/* ChatHover toolbar — floats top-right on hover */}
      {showChatHover && onChatAction && (
        <ChatHover
          messageId={msgId}
          pinned={!!msg.pinned}
          isSelf={String(msg.sender_id) === String(currentUserId)}
          reactions={(msg.reactions ?? []) as ChatHoverReaction[]}
          currentUserId={currentUserId}
          onAction={onChatAction}
          onOpenChange={onChatHoverOpenChange}
          inThread={in_thread}
        />
      )}
    </div>
  );
});
MessageRow.displayName = "MessageRow";

// ─────────────────────────────────────────────────────────────
// MessageSkeleton (exported)
// ─────────────────────────────────────────────────────────────

export function MessageSkeleton() {
  return (
    <div className="flex gap-3 px-6 py-2 animate-pulse">
      <div className="w-8 h-8 rounded bg-gray-300 dark:bg-zinc-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 bg-gray-300 dark:bg-zinc-700 rounded" />
        <div className="h-3 w-full bg-gray-200 dark:bg-zinc-700/60 rounded" />
        <div className="h-3 w-2/3 bg-gray-200 dark:bg-zinc-700/60 rounded" />
      </div>
    </div>
  );
}