import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils.jsx"; // Assurez-vous d'avoir ce fichier utilitaire

// Définition des variantes de style de l'Alerte (basé sur Tailwind CSS)
const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground", // Blanc/Gris clair par défaut
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive", // Rouge pour les erreurs
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * Composant principal Alert
 */
const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

/**
 * Titre de l'Alerte
 */
const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

/**
 * Description de l'Alerte
 */
const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }