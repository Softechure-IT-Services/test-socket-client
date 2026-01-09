import Link from "next/link";
import { Button } from "@/app/components/ui/button";

type ButtonItem = {
  label: string;
  href: string;
  variant?: "default" | "navbar" | "secondary" | "outline" | "ghost" | "destructive";
};

type Props = {
  items: ButtonItem[];
};

export default function ButtonGroup({ items }: Props) {
  return (
    <div className="inline-flex" role="group">
      {items.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === items.length - 1;

        return (
          <Link key={index} href={item.href}>
            <Button
              variant={item.variant || "navbar"}
              className={`rounded-none ${
                isFirst ? "relative after:absolute after:left-0 after:-bottom-0 after:h-[2px] after:w-full after:bg-current after:scale-x-0 after:origin-left after:transition-transform after:scale-x-100 " : ""
              } `}
            >
              {item.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}
