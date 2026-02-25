// "use client";
// import React from "react";
// import { MdOutlineCloudDownload } from "react-icons/md";
// import { RiShareForwardFill } from "react-icons/ri";

// type FileHoverProps = {
//   fileId: string;
// onAction: (action: "download" | "share", fileId: string) => void | Promise<void>;
// };

// export default function FileHover({ fileId, onAction }: FileHoverProps) {
//   const items = [
//     { type: "download", icon: <MdOutlineCloudDownload />, label: "Download" },
//     { type: "share", icon: <RiShareForwardFill />, label: "Share" },
//   ];

//   return (
//     <div className="flex gap-2 w-fit h-fit py-1 px-2 rounded-full border border-gray-200 bg-white absolute right-2 top-2">
//       {items.map((item) => (
//         // ✅ group is on the clickable icon wrapper only
//         <div key={item.type} className="relative cursor-pointer">
//           <div
//             className="group"
// onClick={(e) => {
//   e.stopPropagation();
//   e.preventDefault();
//   onAction(item.type as "download" | "share",fileId);
// }}          >
//             <span
//               className="
//                 absolute bottom-full mb-2 left-1/2 -translate-x-1/2
//                 py-1 px-2 text-xs rounded-md
//                 bg-black text-white
//                 opacity-0 group-hover:opacity-100
//                 transition-all duration-200
//                 whitespace-nowrap
//                 z-50
//               "
//             >
//               {item.label}
//             </span>
//             {React.cloneElement(item.icon, {
//               size: 16,
//               className: "text-[var(--foreground)]",
//             })}

//             {/* Tooltip */}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }
"use client";
import React from "react";
import { MdOutlineCloudDownload } from "react-icons/md";
import { RiShareForwardLine } from "react-icons/ri";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionItem = {
  type: "download" | "share";
  icon: React.ReactElement;
  label: string;
};

type FileHoverProps = {
  fileId: string;
  onAction: (action: "download" | "share", fileId: string) => void | Promise<void>;
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────
// Identical to ChatHover's Tooltip

function Tooltip({ label }: { label: string }) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap bg-[#1a1d21] text-white shadow-lg opacity-0 group-hover/btn:opacity-100 pointer-events-none translate-y-1 group-hover/btn:translate-y-0 transition-all duration-150 ease-out z-50">
      {label}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a1d21]" />
    </div>
  );
}

// ─── Action Button ─────────────────────────────────────────────────────────────
// Identical shape/classes to ChatHover's ActionButton

function ActionButton({
  item,
  onClick,
}: {
  item: ActionItem;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="relative group/btn">
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

// ─── File Hover ───────────────────────────────────────────────────────────────

export default function FileHover({ fileId, onAction }: FileHoverProps) {
  const items: ActionItem[] = [
    { type: "download", icon: <MdOutlineCloudDownload />, label: "Download" },
    { type: "share",    icon: <RiShareForwardLine />,     label: "Share" },
  ];

  return (
    <div
      data-filehover-bar
      className="
        flex items-center gap-0.5 px-1.5 py-1
        rounded-lg bg-white border border-[#e0e0e0]
        shadow-[0_4px_12px_0_rgba(0,0,0,0.12),0_1px_3px_0_rgba(0,0,0,0.08)]
        transition-opacity duration-150 ease-out
        z-10
      "
    >
      {items.map((item) => (
        <ActionButton
          key={item.type}
          item={item}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onAction(item.type, fileId);
          }}
        />
      ))}
    </div>
  );
}