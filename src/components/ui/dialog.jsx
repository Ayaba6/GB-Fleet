// src/components/ui/dialog.js
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// FONCTIONS UTILITAIRES DEJA EXISTANTES...
// ... (Dialog, DialogTrigger, DialogPortal, DialogClose)
// ... (DialogOverlay, DialogContent, DialogHeader)
// ... (DialogTitle, DialogDescription)

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm ${className}`}
      {...props}
    />
  )
);

DialogOverlay.displayName = "DialogOverlay";

export const DialogContent = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={`fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-lg ${className}`}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
);

DialogContent.displayName = "DialogContent";

export const DialogHeader = ({ children, className }) => (
  <div className={`mb-4 ${className}`}>{children}</div>
);

export const DialogTitle = React.forwardRef(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title
      ref={ref}
      className={`text-lg font-semibold leading-none tracking-tight ${className}`}
      {...props}
    />
  )
);

DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Description
      ref={ref}
      className={`text-sm text-gray-500 ${className}`}
      {...props}
    />
  )
);

DialogDescription.displayName = "DialogDescription";

// NOUVEL EXPORT AJOUTÉ POUR CORRIGER L'ERREUR
// ------------------------------------------
export const DialogFooter = ({ className, ...props }) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 ${className}`}
    {...props}
  />
);
// ------------------------------------------