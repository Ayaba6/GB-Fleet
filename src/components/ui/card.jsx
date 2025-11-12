import * as React from "react"
import { cn } from "../../lib/utils.jsx"

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white/60 backdrop-blur-lg shadow-md p-4",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return <div className={cn("mb-2 font-semibold text-lg", className)} {...props} />
}

function CardContent({ className, ...props }) {
  return <div className={cn("text-gray-700", className)} {...props} />
}

function CardTitle({ className, ...props }) {
  return <div className={cn("text-gray-700", className)} {...props} />
}

export { Card, CardHeader, CardContent, CardTitle }
