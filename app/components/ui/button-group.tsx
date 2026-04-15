"use client";

import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { usePathname } from "next/navigation";

type ButtonItem = {
  label: string;
  href: string;
  variant?: "default" | "navbar" | "secondary" | "outline" | "ghost" | "destructive";
};

type Props = {
  items: ButtonItem[];
};

function getTabKey(path: string) {
  if (path.endsWith("/files")) return "files";
  if (path.endsWith("/pins")) return "pins";
  return "message";
}

function normalizeConversationPath(path: string) {
  return path
    .replace(/\/(?:files|pins)$/, "")
    .replace(/^\/(?:channel|dm)\//, "/conversation/");
}

export default function ButtonGroup({ items }: Props) {
  const pathname = usePathname();
  const currentTab = getTabKey(pathname);
  const currentConversationPath = normalizeConversationPath(pathname);

  return (
    <div className="inline-flex" role="group">
      {items.map((item, index) => {
        const itemTab = getTabKey(item.href);
        const itemConversationPath = normalizeConversationPath(item.href);
        const isActive =
          currentConversationPath === itemConversationPath &&
          currentTab === itemTab;

        return (
          <Link key={index} href={item.href}>
            <Button
              variant="navbar"
              className={`
                rounded-b-none relative px-3 py-1.5
                ${isActive
                  ? "text-sidebar-foreground after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-sidebar-foreground after:rounded-t-sm"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                }
              `}
            >
              {item.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}
