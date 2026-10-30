import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-11 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground/70 hover:border-primary/30 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-55",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
