import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-semibold tracking-wider uppercase border border-transparent transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm",
        muted: "bg-muted text-muted-foreground border-border/60",
        success: "bg-success-muted/80 text-success border-success/25",
        danger: "bg-danger-muted/80 text-danger border-danger/25",
        accent: "bg-accent/10 text-accent border-accent/25",
        glass: "bg-card/70 backdrop-blur-md text-foreground border-border/80 shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
