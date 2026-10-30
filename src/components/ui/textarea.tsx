import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-xl border border-border bg-card px-3.5 py-3 text-base text-foreground shadow-sm transition-all duration-200 outline-none placeholder:text-muted-foreground/70 hover:border-primary/30 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-55 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
