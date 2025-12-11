import * as React from "react";
import { cn } from "../../lib/utils.jsx";

/**
 * Ce composant reproduit fidèlement le comportement du Select de shadcn/ui,
 * mais en utilisant un <select> natif sous le capot.
 */

export function Select({ value, onValueChange, children, className }) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={cn(
        "h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
        className
      )}
    >
      {children}
    </select>
  );
}

export const SelectTrigger = ({ className, children }) => (
  <div className={cn("hidden", className)}>{children}</div>
);

export const SelectValue = ({ placeholder }) => (
  <option disabled value="">
    {placeholder}
  </option>
);

export const SelectContent = ({ children }) => <>{children}</>;

export const SelectItem = ({ value, children, className }) => (
  <option
    value={value}
    className={cn("px-2 py-1 text-sm hover:bg-gray-100 cursor-pointer", className)}
  >
    {children}
  </option>
);
