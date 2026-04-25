/* eslint-disable react-refresh/only-export-components */

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-20 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent text-text-secondary hover:text-text-primary",
        primary: "bg-white text-black hover:bg-white/90 font-bold",
        destructive:
          "bg-transparent text-accent-danger hover:bg-accent-danger/10",
        danger:
          "bg-transparent text-accent-danger hover:bg-accent-danger/10",
        outline:
          "border border-border-subtle bg-transparent hover:border-white hover:text-white",
        secondary:
          "bg-white/10 text-white hover:bg-white/20",
        ghost: "bg-transparent text-text-secondary hover:text-text-primary",
        link: "text-white underline-offset-8 hover:underline opacity-60 hover:opacity-100",
      },
      size: {
        default: "h-12 px-8 py-3",
        sm: "h-9 px-4 py-2",
        xs: "h-7 px-2 text-xs",
        lg: "h-16 px-12 text-lg rounded-[24px]",
        icon: "h-12 w-12",
        "icon-sm": "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
