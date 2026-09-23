import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.jsx";

const buttonVariants = cva(
  `
    inline-flex items-center justify-center rounded-lg font-medium 
    transition-colors select-none
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ring-offset-white dark:ring-offset-gray-900
  `,
  {
    variants: {
      variant: {
        default: `
          bg-blue-600 text-white 
          hover:bg-blue-700 
          dark:bg-blue-500 dark:hover:bg-blue-600
        `,
        outline: `
          border border-gray-300 text-gray-900 
          hover:bg-gray-100 
          dark:border-gray-600 dark:text-gray-100 
          dark:hover:bg-gray-800
        `,
        ghost: `
          text-gray-800 hover:bg-gray-100 
          dark:text-gray-100 dark:hover:bg-gray-800
        `,
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
