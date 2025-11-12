import * as React from "react"
import { cn } from "../../lib/utils.js"

// 1. Composant principal Select (c'est la balise <select>)
function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-gray-300 bg-white/70 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

// 2. SelectTrigger : Alias pour une balise simple pour corriger l'import
// Dans le cas d'une balise <select> simple, elle n'a pas de trigger séparé, 
// mais nous l'exportons pour que CamionsSection.js compile.
const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn("flex items-center justify-between", className)}
    {...props}
  >
    {children}
  </div>
))
SelectTrigger.displayName = "SelectTrigger"


// 3. SelectValue : Alias d'un div simple pour le placeholder/valeur
const SelectValue = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={className} {...props} />
))
SelectValue.displayName = "SelectValue"


// 4. SelectContent : Alias pour un div simple (le conteneur des options)
const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn("p-1 z-50 bg-white border rounded-md shadow-lg", className)} 
    {...props}
  >
    {children}
  </div>
))
SelectContent.displayName = "SelectContent"


// 5. SelectItem : Alias pour la balise <option> native
const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => (
  <option 
    ref={ref} 
    className={cn("px-2 py-1 text-sm hover:bg-gray-100 cursor-pointer", className)} 
    value={value} // Très important : utiliser 'value' pour l'option
    {...props}
  >
    {children}
  </option>
))
SelectItem.displayName = "SelectItem"


export { 
    Select, 
    SelectTrigger, 
    SelectValue,
    SelectContent,
    SelectItem 
}