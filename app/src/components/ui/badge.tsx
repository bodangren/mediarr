/* eslint-disable react-refresh/only-export-components */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-white/20 text-white",
        secondary:
          "border-white/10 text-text-secondary",
        destructive:
          "border-accent-danger text-accent-danger",
        outline: "border-white/40 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
