import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react"; // On remplace X par Trash2 pour supprimer
import { Button } from "../ui/button.jsx";

const DESIGNATION_OPTIONS = [
  "Nombre de voyages (U)",
  "Tonnages (T)",
  "Consommation Fuel (L)",
  "Back charge (U)",
];

export default function ItemsTableModal({ isOpen, onClose, onUpdate }) {
  const [rows, setRows] = useState([{ description: "", unitPrice: "", quantity: "" }]);

  if (!isOpen) return null;

  const handleAddRow = () => setRows([...rows, { description: "", unitPrice: "", quantity: "" }]);

  const handleRemoveRow = (idx) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleChange = (idx, field, value) => {
    const newRows = [...rows];

    if (field === "unitPrice" || field === "quantity") {
      value = value.replace(/[^0-9]/g, ""); // garder seulement les chiffres
    }

    newRows[idx][field] = value;
    setRows(newRows);
  };

  const handleSave = () => {
    onUpdate(
      rows.map((r) => {
        const price = Number(r.unitPrice) || 0;
        const qty = Number(r.quantity) || 0;
        const total = r.description === "Tonnages (T)" ? price * qty * 70 : price * qty;
        return { description: r.description, unitPrice: price, quantity: qty, total };
      })
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl shadow-2xl w-full max-w-4xl p-6 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-300 dark:border-gray-700 pb-3 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plus className="text-blue-600 dark:text-blue-400" /> Remplir Tableau Détails
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition"
          >
            <Trash2 size={22} />
          </button>
        </div>

        {/* Tableau */}
        <div className="space-y-3">
          {rows.map((row, idx) => {
            const price = Number(row.unitPrice) || 0;
            const qty = Number(row.quantity) || 0;
            const total = row.description === "Tonnages (T)" ? price * qty * 70 : price * qty;

            return (
              <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                {/* Désignation */}
                {idx === 0 ? (
                  <input
                    type="text"
                    className="p-2 border rounded-md col-span-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Description libre"
                    value={row.description}
                    onChange={(e) => handleChange(idx, "description", e.target.value)}
                  />
                ) : (
                  <select
                    className="p-2 border rounded-md col-span-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    value={row.description}
                    onChange={(e) => handleChange(idx, "description", e.target.value)}
                  >
                    <option value="">-- Sélectionner --</option>
                    {DESIGNATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {/* PU */}
                <input
                  type="text"
                  className="p-2 border rounded-md text-right bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="PU"
                  value={row.unitPrice}
                  onChange={(e) => handleChange(idx, "unitPrice", e.target.value)}
                />

                {/* Quantité */}
                <input
                  type="text"
                  className="p-2 border rounded-md text-right bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Qté"
                  value={row.quantity}
                  onChange={(e) => handleChange(idx, "quantity", e.target.value)}
                />

                {/* Montant semi-transparent */}
                <input
                  type="text"
                  className="p-2 border rounded-md bg-gray-100/50 dark:bg-gray-700/50 text-right font-semibold"
                  value={total.toLocaleString("fr-FR")}
                  readOnly
                />

                {/* Supprimer */}
                {rows.length > 1 && (
                  <button
                    onClick={() => handleRemoveRow(idx)}
                    className="text-gray-400 dark:text-gray-300 hover:text-red-600 transition"
                    title="Supprimer la ligne"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-4">
          <button
            onClick={handleAddRow}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Ajouter ligne
          </button>
          <Button onClick={handleSave} className="bg-blue-600 text-white">
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
