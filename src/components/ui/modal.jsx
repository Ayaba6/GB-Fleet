// src/components/ui/Modal.jsx
import React, { useEffect } from "react";

export default function Modal({ children, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-0"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
