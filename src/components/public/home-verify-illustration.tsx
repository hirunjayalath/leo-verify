import { cn } from "@/lib/utils";

const CERTIFICATE_ART_SRC = "/illustration/verify-premium.png";
const ART_SIZE = 2048;

export function HomeVerifyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${ART_SIZE} ${ART_SIZE}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn(
        "home-verify-illustration h-auto w-full max-w-[min(100%,17.5rem)] object-contain sm:max-w-sm md:max-w-md",
        "lg:max-h-[min(100cqh,34rem)] lg:max-w-[min(100cqw,34rem)] lg:w-[min(100cqw,calc(100cqh-1rem))]",
        className,
      )}
    >
      <image
        href={CERTIFICATE_ART_SRC}
        width={ART_SIZE}
        height={ART_SIZE}
        preserveAspectRatio="xMidYMid meet"
        className="home-verify-illustration__image"
      />
    </svg>
  );
}
