import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-14 w-full border-b border-white/10 bg-transparent px-0 py-4 text-lg transition-all placeholder:text-text-muted focus-visible:border-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-20 md:text-base",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
