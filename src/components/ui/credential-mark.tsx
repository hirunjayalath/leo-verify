import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CredentialMarkProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { wrap: "h-28 w-36", card: "h-[5.5rem] w-[7.5rem]" },
  md: { wrap: "h-36 w-44", card: "h-[7rem] w-[9.5rem]" },
  lg: { wrap: "h-44 w-52", card: "h-[8.5rem] w-[11rem]" },
};

export function CredentialMark({
  className,
  size = "md",
}: CredentialMarkProps) {
  const dims = sizeMap[size];

  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none pointer-events-none",
        dims.wrap,
        className,
      )}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 rounded-full opacity-50 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
        }}
      />

      <div
        className={cn(
          "relative -rotate-6 rounded-xl border border-border/80 bg-card shadow-orb animate-orb-float",
          dims.card,
        )}
      >
        <div className="absolute inset-x-3 top-3 h-1 rounded-full bg-muted" />
        <div className="absolute inset-x-3 top-6 flex flex-col gap-1.5">
          <div className="h-1 w-[75%] rounded-full bg-muted/80" />
          <div className="h-1 w-full rounded-full bg-muted/60" />
          <div className="h-1 w-[83%] rounded-full bg-muted/50" />
        </div>

        <div
          className="absolute bottom-3 right-3 grid grid-cols-3 gap-0.5 rounded-md border border-border/60 bg-muted/40 p-1"
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "size-1 rounded-[1px]",
                i % 2 === 0 ? "bg-foreground/70" : "bg-foreground/25",
              )}
            />
          ))}
        </div>

        <div
          className="absolute -bottom-2 -right-2 flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md ring-4 ring-background animate-seal"
        >
          <Check className="size-5 stroke-[2.5]" />
        </div>
      </div>
    </div>
  );
}
