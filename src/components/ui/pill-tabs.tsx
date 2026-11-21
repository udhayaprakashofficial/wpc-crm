import Link from "next/link";
import { cn } from "@/lib/utils";

export function PillTabs({
  items,
}: {
  items: { href: string; label: string; active?: boolean }[];
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href + item.label}
          href={item.href}
          className={cn(
            "inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold transition",
            item.active
              ? "bg-zinc-950 text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
