import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-11 w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-sm text-foreground shadow-sm transition-all duration-150 placeholder:text-muted-foreground/80 hover:border-border focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
