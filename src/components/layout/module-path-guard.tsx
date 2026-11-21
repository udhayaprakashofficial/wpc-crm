"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessPath, type CrmModuleKey } from "@/lib/modules";

/** Hides unauthorized routes for invited members (nav already filtered). */
export function ModulePathGuard({
  modules,
}: {
  modules: CrmModuleKey[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!canAccessPath(modules, pathname)) {
      router.replace("/app/more?denied=1");
    }
  }, [modules, pathname, router]);

  return null;
}
