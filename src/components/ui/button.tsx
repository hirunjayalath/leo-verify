import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.97] select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:opacity-90",
        brand:
          "bg-[#0c2340] text-white shadow-sm hover:-translate-y-0.5 hover:bg-[#14355f] hover:shadow-md active:translate-y-0",
        accent:
          "bg-accent text-accent-foreground shadow-sm hover:-translate-y-0.5 hover:brightness-105 hover:shadow-md active:translate-y-0",
        subtle:
          "bg-accent/10 text-accent hover:bg-accent/15 active:bg-accent/20",
        pill:
          "rounded-full border border-border/80 bg-muted/60 text-foreground hover:border-primary/25 hover:bg-muted active:bg-muted/80",
        outline:
          "border border-border bg-card text-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/25 hover:bg-muted/60 hover:shadow-md active:translate-y-0 active:bg-muted",
        glass:
          "border border-border/80 bg-card/70 backdrop-blur-md text-foreground shadow-sm hover:bg-card/90 hover:border-border active:bg-card/95",
        ghost:
          "hover:bg-muted/80 text-foreground/80 hover:text-foreground active:bg-muted",
        danger:
          "bg-danger text-white shadow-sm hover:bg-danger/90 active:bg-danger/80",
        link: "text-accent underline-offset-4 hover:underline rounded-none p-0 h-auto",
      },
      size: {
        default: "h-10.5 px-5 py-2",
        sm: "h-9 px-3.5 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10.5 w-10.5 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
