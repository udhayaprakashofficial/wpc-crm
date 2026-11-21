import { cn } from "@/lib/utils";

export function BusinessLogo({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dims = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
    xl: "h-16 w-16 text-xl",
  }[size];

  const px = { sm: 32, md: 40, lg: 56, xl: 64 }[size];
  const initial = name.trim().slice(0, 1).toUpperCase() || "B";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- local uploads + arbitrary URLs
      <img
        src={src}
        alt={`${name} logo`}
        width={px}
        height={px}
        className={cn(
          "shrink-0 rounded-xl object-contain bg-white ring-1 ring-zinc-200/80",
          dims,
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-blue-600 font-bold text-white",
        dims,
        className,
      )}
      aria-hidden
    >
      {initial}
    </div>
  );
}
