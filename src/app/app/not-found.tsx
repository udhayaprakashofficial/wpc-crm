import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold text-zinc-900">Page not found</h1>
      <p className="text-sm text-zinc-600">
        That route doesn’t exist in your workspace.
      </p>
      <Link
        href="/app"
        className="rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white"
      >
        Back to Home
      </Link>
    </div>
  );
}
