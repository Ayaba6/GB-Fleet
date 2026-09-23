// src/components/ui/card.jsx

import * as React from "react"
import { cn } from "../../lib/utils.jsx"

// Composant principal Card
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

// En-tête de la carte
function CardHeader({ className, ...props }) {
  return <div className={cn("mb-2 font-semibold text-lg", className)} {...props} />
}

// Corps de la carte
function CardContent({ className, ...props }) {
  return <div className={cn("text-gray-700", className)} {...props} />
}

// Titre de la carte
function CardTitle({ className, ...props }) {
  return <div className={cn("text-gray-700", className)} {...props} />
}

// 💥 AJOUT : Description de la carte (le composant manquant)
function CardDescription({ className, ...props }) {
  return (
    <p
      className={cn("text-sm text-muted-foreground mt-1 text-gray-500", className)}
      {...props}
    />
  )
}

export { 
    Card, 
    CardHeader, 
    CardContent, 
    CardTitle, 
    CardDescription // 💥 EXPORT AJOUTÉ
}