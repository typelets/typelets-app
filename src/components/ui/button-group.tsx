import * as React from "react"
import { cn } from "@/lib/utils"

const ButtonGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-stretch rounded-md",
      "[&>button]:rounded-none [&>button]:shadow-none",
      "[&>button:first-child]:rounded-l-md",
      "[&>button:last-child]:rounded-r-md",
      "[&>button:not(:first-child)]:-ml-px",
      className
    )}
    {...props}
  />
))
ButtonGroup.displayName = "ButtonGroup"

export { ButtonGroup }
