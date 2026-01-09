"use client";
import { useState } from "react";
import React from "react";
import { MdAddReaction } from "react-icons/md";
import { RiUnpinFill } from "react-icons/ri";
import { GrPin } from "react-icons/gr";
import MessageInput from "@/app/components/custom/MessageInput"
import { FaRegEdit } from "react-icons/fa";
import { MdDeleteForever } from "react-icons/md";

import { RiShareForwardFill, RiReplyFill } from "react-icons/ri";
type ChatHoverProps = {
  messageId: string; 
  pinned?: boolean;
  isSelf?: boolean; 
  onAction: (action: string, messageId: string ) => void;
};

export default function ChatHover({ messageId, pinned,isSelf, onAction }: ChatHoverProps) {
  const items = [
    { type: "reaction", icon: <MdAddReaction />, label: "Reaction" },
    { type: "reply", icon: <RiReplyFill />, label: "Reply" },
    { 
      type: "pin", 
      icon: pinned ? <RiUnpinFill /> : <GrPin />, 
      label: pinned ? "Unpin" : "Pin" // ✅ dynamic tooltip
    },
    { type: "forward", icon: <RiShareForwardFill />, label: "Forward" },
    ...(isSelf ? [
    { type: "edit", icon: <FaRegEdit />, label: "Edit" },
    { type: "delete", icon: <MdDeleteForever />, label: "Delete" }
  ] : [])]

  return (
    <div className="flex gap-2  w-fit h-fit py-1 px-2 rounded-full border border-gray-200 bg-white absolute right-10 top-0 -translate-y-[50%]">
      {items.map((item) => (
        <div key={item.type} className="relative group">
          {/* Icon */}
          <div
            onClick={() => onAction(item.type, messageId)}
          >
            {React.cloneElement(item.icon, {
              size: 14,
              className: "text-[var(--foreground)]",
            })}
          </div>

          {/* Tooltip */}
          <span
  className="
    absolute bottom-full mb-2 left-1/2 -translate-x-1/2
    py-1 px-2 text-xs rounded-md
    bg-black text-white 
    opacity-0 group-hover:opacity-100 
    transition-all duration-200
    whitespace-nowrap
    z-50
  "
>
  {item.label}
</span>
        </div>
      ))}
    </div>
  );
}
