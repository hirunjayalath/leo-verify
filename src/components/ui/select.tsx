import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "theme-chevron flex h-11 w-full appearance-none rounded-xl border border-border bg-card bg-[length:1rem] bg-[right_0.85rem_center] bg-no-repeat px-3.5 pr-10 text-sm text-foreground shadow-sm transition-all duration-200 hover:border-primary/30 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-55",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
