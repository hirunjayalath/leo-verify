import Image from "next/image";
import { BrandMark, CLUB_UOM_LOGO_SRC } from "@/components/public/brand-logo";
import { cn } from "@/lib/utils";

export function HomeEditorialClubLogos({
  className,
  priority = false,
  size = "default",
}: {
  className?: string;
  priority?: boolean;
  size?: "default" | "sm";
}) {
  const compact = size === "sm";
  const markPx = compact ? 26 : 32;
  const boxClass = compact
    ? "size-7 rounded-md sm:size-7"
    : "size-8 rounded-md sm:size-9";
  const clubPx = compact ? 28 : 36;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 sm:gap-2",
        compact && "gap-2 sm:gap-2.5",
        className,
      )}
      aria-hidden="true"
    >
      <BrandMark
        size={markPx}
        priority={priority}
        className={boxClass}
      />
      <Image
        src={CLUB_UOM_LOGO_SRC}
        alt=""
        width={clubPx}
        height={clubPx}
        className={cn(
          "rounded-full object-cover",
          compact ? "size-7 sm:size-7" : "size-8 sm:size-9",
        )}
        priority={priority}
      />
    </div>
  );
}
