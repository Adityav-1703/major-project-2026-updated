import * as React from "react"
import { Link, type LinkProps } from "react-router-dom"

import { cn } from "@/lib/utils"

type Variant = "glass" | "neon" | "default"
type Size = "sm" | "default" | "lg"

function buttonClassName(
  variant: Variant = "default",
  size: Size = "default",
  className?: string
) {
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neonGreen focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(220_18%_6%)] disabled:pointer-events-none disabled:opacity-50 px-4 py-2 glass backdrop-blur-md border border-white/20 shadow-lg hover:shadow-neon",
    {
      "bg-gradient-to-r from-neonGreen to-neonBlue text-white h-12 px-8 text-lg":
        variant === "neon",
      "bg-white/20 hover:bg-white/30 h-10 px-4": variant === "glass",
      "h-10 px-4": size === "default",
      "h-9 px-3 text-xs": size === "sm",
      "h-12 px-8 text-lg": size === "lg",
    },
    className
  )
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={buttonClassName(variant, size, className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export interface ButtonLinkProps extends LinkProps {
  variant?: Variant
  size?: Size
}

const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <Link
      ref={ref}
      className={buttonClassName(variant, size, className)}
      {...props}
    />
  )
)
ButtonLink.displayName = "ButtonLink"

export { Button, ButtonLink }
