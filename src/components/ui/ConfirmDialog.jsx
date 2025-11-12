import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./dialog.jsx";
import { Button } from "./button.jsx";

export default function ConfirmDialog({
  open,
  onClose,
  title = "Confirmer l'action",
  description = "Êtes-vous sûr de vouloir continuer ?",
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  confirmColor = "bg-red-600 hover:bg-red-700",
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">{title}</DialogTitle>
          <DialogDescription className="text-gray-600 mt-1">{description}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onClose(false)}
            className="border-gray-300"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={() => {
              onConfirm?.();
              onClose(false);
            }}
            className={`${confirmColor} text-white`}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
