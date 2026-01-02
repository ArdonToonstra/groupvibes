import * as React from "react"
import { cn } from "@/lib/cn"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl bg-surface p-6 shadow-sm",
        "border border-gray-100 dark:border-gray-800",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

export { Card }
