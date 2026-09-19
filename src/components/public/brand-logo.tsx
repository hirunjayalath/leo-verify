import Image from "next/image";
import { cn } from "@/lib/utils";

export const LEO_EMBLEM_SRC = "/brand/leo-emblem.png";

type BrandMarkProps = {
  size?: number;
  className?: string;
  /** Sole accessible name when true; otherwise decorative (empty alt). */
  labeled?: boolean;
  priority?: boolean;
};

export function BrandMark({
  size = 32,
  className,
  labeled = false,
  priority = false,
}: BrandMarkProps) {
  return (
    <Image
      src={LEO_EMBLEM_SRC}
      alt={labeled ? "LeoVerify" : ""}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-md", className)}
      priority={priority}
    />
  );
}

type BrandLockupProps = {
  size?: number;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  priority?: boolean;
};

export function BrandLockup({
  size = 32,
  className,
  markClassName,
  wordmarkClassName,
  priority = false,
}: BrandLockupProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={size} className={markClassName} priority={priority} />
      <span
        className={cn(
          "text-lg font-semibold tracking-tight text-foreground",
          wordmarkClassName,
        )}
      >
        LeoVerify
      </span>
    </span>
  );
}
