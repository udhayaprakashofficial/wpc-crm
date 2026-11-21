import Link from "next/link";
import { ReactNode } from "react";

export function PromoBanner({
  title,
  description,
  href,
  cta = "Explore",
  icons,
}: {
  title: string;
  description: string;
  href: string;
  cta?: string;
  icons?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 rounded-2xl bg-[#f3e8ff] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        {icons ? (
          <div className="hidden shrink-0 sm:flex">{icons}</div>
        ) : (
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-xl sm:flex">
            ✨
          </div>
        )}
        <div>
          <p className="font-semibold text-zinc-900">{title}</p>
          <p className="mt-1 text-sm leading-5 text-zinc-600">{description}</p>
        </div>
      </div>
      <Link
        href={href}
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
      >
        {cta}
      </Link>
    </div>
  );
}
