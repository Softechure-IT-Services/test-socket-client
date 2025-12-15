import Link from "next/link";
import { Button } from "@/components/ui/button";

type ButtonItem = {
  label: string;
  href: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
};

type Props = {
  items: ButtonItem[];
};

export default function ButtonGroup({ items }: Props) {
  return (
    <div className="inline-flex rounded-md shadow-sm" role="group">
      {items.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === items.length - 1;

        return (
          <Link key={index} href={item.href}>
            <Button
              variant={item.variant || "secondary"}
              className={`rounded-none ${
                isFirst ? "rounded-l-md" : ""
              } ${isLast ? "rounded-r-md" : ""}`}
            >
              {item.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}
