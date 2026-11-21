import { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function Toolbar({
  searchName = "q",
  searchDefault,
  searchPlaceholder = "Search",
  actions,
  hiddenFields,
}: {
  searchName?: string;
  searchDefault?: string;
  searchPlaceholder?: string;
  actions?: ReactNode;
  hiddenFields?: Record<string, string>;
}) {
  return (
    <form className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          name={searchName}
          defaultValue={searchDefault}
          placeholder={searchPlaceholder}
          className="pl-10"
        />
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </form>
  );
}

export function ToolButton({
  children,
  href,
}: {
  children: ReactNode;
  href?: string;
}) {
  const className =
    "inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50";
  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="submit" className={className}>
      {children}
    </button>
  );
}
