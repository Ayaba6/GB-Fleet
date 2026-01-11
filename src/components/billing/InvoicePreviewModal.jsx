// src/components/billing/InvoicePreviewModal.jsx
import React from "react";
import { X } from "lucide-react";

export default function InvoicePreviewModal({ isOpen, onClose, pdfUrl }) {
  if (!isOpen || !pdfUrl) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Aperçu Facture GTS</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
            <X size={22} />
          </button>
        </div>
        <iframe
          src={pdfUrl}
          className="flex-1 w-full border-none"
          title="Aperçu Facture"
        />
      </div>
    </div>
  );
}
