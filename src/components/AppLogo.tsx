import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/brand/wpc-logo.jpg";

export function AppLogo({
  size = 32,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={LOGO_SRC}
      alt="WPC CRM"
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-lg object-cover", className)}
    />
  );
}
