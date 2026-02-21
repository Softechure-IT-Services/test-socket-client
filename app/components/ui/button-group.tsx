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

export default function ButtonGroup({ items }: Props) {
  const pathname = usePathname();

  return (
    <div className="inline-flex" role="group">
      {items.map((item, index) => {
        const isActive = pathname === item.href;

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