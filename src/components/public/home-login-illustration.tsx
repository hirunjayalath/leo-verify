import { cn } from "@/lib/utils";

const LOGIN_ART_SRC = "/illustration/login-transparent.png";
const ART_SIZE = 2048;

export function HomeLoginIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${ART_SIZE} ${ART_SIZE}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn(
        "home-login-illustration h-auto w-full max-w-[min(100%,17.5rem)] object-contain sm:max-w-sm md:max-w-md",
        className,
      )}
    >
      <image
        href={LOGIN_ART_SRC}
        width={ART_SIZE}
        height={ART_SIZE}
        preserveAspectRatio="xMidYMid meet"
        className="home-login-illustration__image"
      />
    </svg>
  );
}
