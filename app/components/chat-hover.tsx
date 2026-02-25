// "use client";
// import { useState } from "react";
// import React from "react";
// import { MdAddReaction } from "react-icons/md";
// import { RiUnpinFill } from "react-icons/ri";
// import { GrPin } from "react-icons/gr";
// import MessageInput from "@/app/components/custom/MessageInput"
// import { FaRegEdit } from "react-icons/fa";
// import { MdDeleteForever } from "react-icons/md";

// import { RiShareForwardFill, RiReplyFill } from "react-icons/ri";
// type ChatHoverProps = {
//   messageId: string; 
//   pinned?: boolean;
//   isSelf?: boolean; 
//   onAction: (action: string, messageId: string ) => void;
// };

// export default function ChatHover({ messageId, pinned,isSelf, onAction }: ChatHoverProps) {
//   const isPinned = Boolean(Number(pinned));

//   const items = [
//     { type: "reaction", icon: <MdAddReaction />, label: "Reaction" },
//     { type: "reply", icon: <RiReplyFill />, label: "Reply" },
//     { 
//       type: "pin", 
//       icon: isPinned ? <RiUnpinFill /> : <GrPin />, 
//       label: isPinned ? "Unpin" : "Pin" // ✅ dynamic tooltip
//     },
//     { type: "forward", icon: <RiShareForwardFill />, label: "Forward" },
//     ...(isSelf ? [
//     { type: "edit", icon: <FaRegEdit />, label: "Edit" },
//     { type: "delete", icon: <MdDeleteForever />, label: "Delete" }
//   ] : [])]

//   return (
//     <div className="flex gap-2  w-fit h-fit py-1 px-2 rounded-full border border-gray-200 bg-white absolute right-10 top-0 -translate-y-[50%]">
//       {items.map((item) => (
//         <div key={item.type} className="relative group">
//           {/* Icon */}
//           <div
//             onClick={() => onAction(item.type, messageId)}
//           >
//             {React.cloneElement(item.icon, {
//               size: 14,
//               className: "text-[var(--foreground)]",
//             })}
//           </div>

//           {/* Tooltip */}
//           <span
//   className="
//     absolute bottom-full mb-2 left-1/2 -translate-x-1/2
//     py-1 px-2 text-xs rounded-md
//     bg-black text-white 
//     opacity-0 group-hover:opacity-100 
//     transition-all duration-200
//     whitespace-nowrap
//     z-50
//   "
// >
//   {item.label}
// </span>
//         </div>
//       ))}
//     </div>
//   );
// }
"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MdOutlineAddReaction, MdDeleteForever } from "react-icons/md";
import { RiUnpinFill, RiShareForwardLine } from "react-icons/ri";
import { GrPin } from "react-icons/gr";
import { FaRegEdit } from "react-icons/fa";
import { BsThreeDots } from "react-icons/bs";
import { PiChatCircleText } from "react-icons/pi";
import { PiChatCircleTextBold } from "react-icons/pi";
import Picker from "@emoji-mart/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReactionUser = { id: number | string; name: string };

export type Reaction = {
  emoji: string;
  count: number;
  users?: ReactionUser[];
};

type ChatHoverProps = {
  messageId: string;
  pinned?: boolean;
  isSelf?: boolean;
  reactions?: Reaction[];
  currentUserId?: string | number;
  onAction: (action: string, messageId: string) => void;
  /** Called with true when any popup (emoji picker / dropdown) opens, false when all are closed */
  onOpenChange?: (open: boolean) => void;
  /** When true, hides the "Reply in thread" button (already inside a thread) */
  inThread?: boolean;
};

type ActionItem = {
  type: string;
  icon: React.ReactElement;
  label: string;
  danger?: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_REACTIONS = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "😂", label: "Haha" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
];

// ─── Scroll lock ──────────────────────────────────────────────────────────────
// Finds every scrollable ancestor of a node and locks it while the picker is open.

function getScrollableAncestors(el: HTMLElement | null): HTMLElement[] {
  const result: HTMLElement[] = [];
  let node = el?.parentElement ?? null;
  while (node && node !== document.documentElement) {
    const { overflow, overflowY } = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(overflow + overflowY)) result.push(node);
    node = node.parentElement;
  }
  result.push(document.body);
  return result;
}

function lockScroll(els: HTMLElement[]) {
  els.forEach((el) => {
    el.dataset._prevOverflow = el.style.overflow;
    el.style.overflow = "hidden";
  });
}

function unlockScroll(els: HTMLElement[]) {
  els.forEach((el) => {
    el.style.overflow = el.dataset._prevOverflow ?? "";
    delete el.dataset._prevOverflow;
  });
}

// ─── Portal Layer ─────────────────────────────────────────────────────────────
// Renders children into document.body (never clipped by overflow:hidden parents).
// Uses `position: fixed` + viewport-relative rect so it stays anchored even
// when the chat is scrolled. Also locks scrollable ancestors while open.

type PortalLayerProps = {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  align?: "bottom-left" | "bottom-right";
  /** Approximate rendered height of children, used to flip above the anchor if near the bottom of the viewport. */
  childHeight?: number;
  /** Approximate rendered width of children, used to clamp against the right viewport edge. */
  childWidth?: number;
  children: React.ReactNode;
};

function PortalLayer({
  anchorRef,
  open,
  onClose,
  align = "bottom-left",
  childHeight = 435,
  childWidth = 352,
  children,
}: PortalLayerProps) {
  const [style, setStyle] = useState<React.CSSProperties>({ display: "none" });
  const lockedEls = useRef<HTMLElement[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  const reposition = useCallback(() => {
    if (!anchorRef.current) return;

    const btn = anchorRef.current;
    // Walk up to find the ChatHover bar so the picker never overlaps it
    const bar = btn.closest<HTMLElement>("[data-chathover-bar]") ?? btn;
    const barRect = bar.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const GAP = 8;
    const PICKER_WIDTH = childWidth;

    // ── Vertical: pick whichever side has more room relative to the full bar ──
    const spaceAbove = barRect.top - GAP;
    const spaceBelow = window.innerHeight - barRect.bottom - GAP;
    const openAbove = spaceAbove >= spaceBelow;

    let top: number;
    if (openAbove) {
      top = barRect.top - GAP - childHeight;
      top = Math.max(8, top); // never above viewport
    } else {
      top = barRect.bottom + GAP;
      top = Math.min(top, window.innerHeight - childHeight - 8); // never below viewport
    }

    // ── Horizontal: right-align to the button, clamp to viewport ──
    let left =
      align === "bottom-right"
        ? btnRect.right - PICKER_WIDTH
        : btnRect.left;

    left = Math.min(left, window.innerWidth - PICKER_WIDTH - 8);
    left = Math.max(8, left);

    setStyle({ position: "fixed", top, left, zIndex: 99999 });
  }, [anchorRef, align, childHeight, childWidth]);

  // Lock / unlock scroll
  useEffect(() => {
    if (open) {
      reposition();
      lockedEls.current = getScrollableAncestors(anchorRef.current as HTMLElement | null);
      lockScroll(lockedEls.current);
    } else {
      unlockScroll(lockedEls.current);
      lockedEls.current = [];
    }

    return () => {
      if (lockedEls.current.length) {
        unlockScroll(lockedEls.current);
        lockedEls.current = [];
      }
    };
  }, [open, reposition, anchorRef]);

  // Re-position on resize
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [open, reposition]);

  // Close on outside mousedown
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (anchorRef.current?.contains(e.target as Node)) return;
      if (contentRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    // Delay so the triggering click doesn't immediately close
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div ref={contentRef} style={style} onWheel={(e) => e.stopPropagation()}>
      {children}
    </div>,
    document.body
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ label }: { label: string }) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap bg-[#1a1d21] text-white shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none translate-y-1 group-hover:translate-y-0 transition-all duration-150 ease-out z-50">
      {label}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a1d21]" />
    </div>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────

function ActionButton({ item, onClick }: { item: ActionItem; onClick: () => void }) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        aria-label={item.label}
        className="cursor-pointer flex items-center justify-center w-9 h-9 rounded-md text-[#616061] text-[19px] hover:text-[#1d1c1d] hover:bg-[#f8f8f8] hover:scale-125 active:bg-[#e8e8e8] transition-all duration-100 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1264a3]"
      >
        {item.icon}
      </button>
      <Tooltip label={item.label} />
    </div>
  );
}

// ─── More Options Dropdown ────────────────────────────────────────────────────

function MoreDropdown({
  items,
  onSelect,
  onOpenChange,
}: {
  items: ActionItem[];
  onSelect: (type: string) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => { setOpen(false); onOpenChange?.(false); }, [onOpenChange]);

  return (
    <div className="relative group">
      <button
        ref={triggerRef}
        onClick={() => { const next = !open; setOpen(next); onOpenChange?.(next); }}
        aria-label="More actions"
        aria-expanded={open}
        className={[
          "cursor-pointer flex items-center justify-center w-9 h-9 rounded-md text-[19px]",
          "transition-all duration-100 ease-out hover:scale-125",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1264a3]",
          open
            ? "bg-[#f8f8f8] text-[#1d1c1d]"
            : "text-[#616061] hover:text-[#1d1c1d] hover:bg-[#f8f8f8] active:bg-[#e8e8e8]",
        ].join(" ")}
      >
        <BsThreeDots />
      </button>

      {!open && <Tooltip label="More actions" />}

      <PortalLayer
        anchorRef={triggerRef}
        open={open}
        onClose={close}
        align="bottom-right"
        childHeight={items.length * 40 + 16}
        childWidth={176}
      >
        <div className="w-44 bg-white border border-[#e0e0e0] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.14)] overflow-hidden py-1">
          {items.map((item, i) => (
            <React.Fragment key={item.type}>
              {item.danger && i > 0 && (
                <div className="my-1 border-t border-[#f0f0f0]" />
              )}
              <button
                onClick={() => {
                  onSelect(item.type);
                  close();
                }}
                className={[
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer",
                  "transition-colors duration-100 ease-out",
                  item.danger
                    ? "text-red-500 hover:bg-red-50"
                    : "text-[#1d1c1d] hover:bg-[#f8f8f8]",
                ].join(" ")}
              >
                <span className="text-[16px]">{item.icon}</span>
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      </PortalLayer>
    </div>
  );
}

// ─── Emoji Picker Button ───────────────────────────────────────────────────────
// "Add reaction" opens a full emoji-mart Picker in a fixed portal.
// The portal is anchored exactly to this button's bounding rect.

function EmojiPickerButton({ onSelect, onOpenChange }: { onSelect: (emoji: any) => void; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => { setOpen(false); onOpenChange?.(false); }, [onOpenChange]);

  return (
    <div className="relative group">
      <button
        ref={triggerRef}
        onClick={() => { const next = !open; setOpen(next); onOpenChange?.(next); }}
        aria-label="Add reaction"
        aria-expanded={open}
        className={[
          "cursor-pointer flex items-center justify-center w-9 h-9 rounded-md text-[19px]",
          "transition-all duration-100 ease-out hover:scale-125",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1264a3]",
          open
            ? "bg-[#f8f8f8] text-[#1d1c1d]"
            : "text-[#616061] hover:text-[#1d1c1d] hover:bg-[#f8f8f8] active:bg-[#e8e8e8]",
        ].join(" ")}
      >
        <MdOutlineAddReaction />
      </button>

      {!open && <Tooltip label="Add reaction" />}

      {/* 435px ≈ emoji-mart default rendered height */}
      <PortalLayer
        anchorRef={triggerRef}
        open={open}
        onClose={close}
        align="bottom-right"
        childHeight={435}
        childWidth={352}
      >
        <div className="shadow-2xl rounded-xl overflow-hidden">
          <Picker
            onEmojiSelect={(emoji: any) => {
              onSelect(emoji);
              close();
            }}
          />
        </div>
      </PortalLayer>
    </div>
  );
}

// ─── Chat Hover ───────────────────────────────────────────────────────────────

export default function ChatHover({
  messageId,
  pinned,
  isSelf,
  reactions = [],
  currentUserId,
  onAction,
  onOpenChange,
  inThread = false,
}: ChatHoverProps) {
  const isPinned = Boolean(Number(pinned));

  const hasReacted = (emoji: string): boolean => {
    if (!currentUserId) return false;
    const reaction = reactions.find((r) => r.emoji === emoji);
    if (!reaction?.users) return false;
    return reaction.users.some((u) => String(u.id) === String(currentUserId));
  };

  const moreItems: ActionItem[] = [
    {
      type: "pin",
      icon: isPinned ? <RiUnpinFill /> : <GrPin />,
      label: isPinned ? "Unpin message" : "Pin message",
    },
    ...(isSelf
      ? [
          { type: "edit", icon: <FaRegEdit />, label: "Edit message" },
          {
            type: "delete",
            icon: <MdDeleteForever />,
            label: "Delete message",
            danger: true,
          },
        ]
      : []),
  ];

  return (
    <div data-chathover-bar className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-white border border-[#e0e0e0] shadow-[0_4px_12px_0_rgba(0,0,0,0.12),0_1px_3px_0_rgba(0,0,0,0.08)] w-fit h-fit absolute right-0 top-0 -translate-y-[50%] -translate-x-[2rem]">

      {/* ── Quick emoji reactions ── */}
      {DEFAULT_REACTIONS.map(({ emoji, label }) => {
        const reacted = hasReacted(emoji);
        return (
          <div key={emoji} className="relative group">
            <button
              onClick={() => onAction(`react:${emoji}`, messageId)}
              aria-label={label}
              className={[
                "cursor-pointer flex items-center justify-center w-9 h-9 rounded-md text-[18px]",
                "transition-all duration-100 ease-out hover:scale-125",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1264a3]",
                reacted
                  ? "bg-[#e8f0fe] ring-1 ring-[#1264a3]"
                  : "hover:bg-[#f8f8f8] active:bg-[#e8e8e8]",
              ].join(" ")}
            >
              {emoji}
            </button>
            <Tooltip label={reacted ? `Remove ${label}` : label} />
          </div>
        );
      })}

      {/* Divider */}
      <div className="w-px h-5 bg-[#ddd] mx-0.5" />

      {/* ── Full emoji picker — portal, anchored to its own button, scroll-locked ── */}
      <EmojiPickerButton
        onSelect={(emoji) =>
          onAction(
            `react:${emoji.native ?? emoji.colons ?? String(emoji)}`,
            messageId
          )
        }
        onOpenChange={onOpenChange}
      />

      {/* ── Reply — hidden when already inside a thread ── */}
      {!inThread && (
        <ActionButton
          item={{ type: "reply", icon: <PiChatCircleTextBold />, label: "Reply in thread" }}
          onClick={() => onAction("reply", messageId)}
        />
      )}

      {/* ── Forward ── */}
      <ActionButton
        item={{ type: "forward", icon: <RiShareForwardLine />, label: "Forward message" }}
        onClick={() => onAction("forward", messageId)}
      />

      {/* Divider */}
      <div className="w-px h-5 bg-[#ddd] mx-0.5" />

      {/* ── More options ── */}
      <MoreDropdown
        items={moreItems}
        onSelect={(type) => onAction(type, messageId)}
        onOpenChange={onOpenChange}
      />
    </div>
  );
}