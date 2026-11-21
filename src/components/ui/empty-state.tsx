import { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="sp-card px-6 py-12 text-center">
      <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
