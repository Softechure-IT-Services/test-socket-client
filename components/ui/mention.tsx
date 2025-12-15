// "use client";

// type MentionUserItemProps = {
//   name: string;
// };

// export default function MentionUserItem({ name }: MentionUserItemProps) {
//   return (
//     <div className="border rounded-xl text-gray-500 p-1 shadow-sm bg-white">
//       <div className="flex items-top gap-2">
//         <div className="p-4 h-10 rounded-md bg-blue-600 text-white flex items-center justify-center font-semibold">
//           {name?.charAt(0).toUpperCase()}
//         </div>
//         <div>
//           <p className="font-semibold text-black capitalize">{name}</p>
//         </div>
//       </div>
//     </div>
//   );
// }


"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface MentionDropdownProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (username: string) => void;
  users: { name: string; status: "online" | "offline" }[];
  position?: { top: number; left: number };
}

export default function MentionDropdown({
  open,
  onOpenChange,
  onSelect,
  users,
  position = { top: 0, left: 0 },
}: MentionDropdownProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuContent
        className="w-56 max-h-60 overflow-auto"
        style={{ position: "absolute", top: 500, left: position.left }}
      >
        <DropdownMenuGroup>
          {users.map((u, i) => (
            <DropdownMenuItem
              key={i}
              onClick={() => onSelect(u.name)}
              className="flex items-center justify-between"
            >
              <span>{u.name}</span>
              <span>{u.status === "online" ? "🟢" : "⚫"}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
