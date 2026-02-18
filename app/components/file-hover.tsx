"use client";
import React from "react";
import { MdOutlineCloudDownload } from "react-icons/md";
import { RiShareForwardFill } from "react-icons/ri";

type FileHoverProps = {
  fileId: string;
onAction: (action: "download" | "share", fileId: string) => void | Promise<void>;
};

export default function FileHover({ fileId, onAction }: FileHoverProps) {
  const items = [
    { type: "download", icon: <MdOutlineCloudDownload />, label: "Download" },
    { type: "share", icon: <RiShareForwardFill />, label: "Share" },
  ];

  return (
    <div className="flex gap-2 w-fit h-fit py-1 px-2 rounded-full border border-gray-200 bg-white absolute right-2 top-2">
      {items.map((item) => (
        // ✅ group is on the clickable icon wrapper only
        <div key={item.type} className="relative cursor-pointer">
          <div
            className="group"
onClick={(e) => {
  e.stopPropagation();
  e.preventDefault();
  onAction(item.type as "download" | "share",fileId);
}}          >
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
            {React.cloneElement(item.icon, {
              size: 16,
              className: "text-[var(--foreground)]",
            })}

            {/* Tooltip */}
          </div>
        </div>
      ))}
    </div>
  );
}
