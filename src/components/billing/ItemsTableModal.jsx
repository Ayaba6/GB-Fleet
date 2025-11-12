import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "../ui/button.jsx";

export default function ItemsTableModal({ isOpen, onClose, onUpdate }) {
  const [rows, setRows] = useState([{ description: "", unitPrice: "", quantity: "", total: "" }]);

  if (!isOpen) return null;

  const handleAddRow = () =>
    setRows([...rows, { description: "", unitPrice: "", quantity: "", total: "" }]);

  const handleChange = (idx, field, value) => {
    const newRows = [...rows];

    // Valeurs numériques
    if (field === "unitPrice" || field === "quantity") {
      // Retirer les espaces ou caractères non numériques
      value = value.replace(/[^0-9.]/g, "");
    }

    newRows[idx][field] = value;

    const price = Number(newRows[idx].unitPrice) || 0;
    const qty = Number(newRows[idx].quantity) || 0;
    newRows[idx].total = price * qty;

    setRows(newRows);
  };

  const handleSave = () => {
    onUpdate(
      rows.map((r) => ({
        description: r.description,
        unitPrice: Number(r.unitPrice) || 0,
        quantity: Number(r.quantity) || 0,
        total: Number(r.total) || 0,
      }))
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
            <Plus className="text-blue-600" /> Remplir Tableau Détails
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-2">
              <input
                type="text"
                className="p-2 border rounded-md col-span-2"
                placeholder="Description"
                value={row.description}
                onChange={(e) => handleChange(idx, "description", e.target.value)}
              />
              <input
                type="number"
                className="p-2 border rounded-md"
                placeholder="PU"
                value={row.unitPrice}
                onChange={(e) => handleChange(idx, "unitPrice", e.target.value)}
              />
              <input
                type="number"
                className="p-2 border rounded-md"
                placeholder="Qté"
                value={row.quantity}
                onChange={(e) => handleChange(idx, "quantity", e.target.value)}
              />
              <input
                type="text"
                className="p-2 border rounded-md bg-gray-100"
                placeholder="Total"
                value={row.total.toLocaleString("fr-FR")}
                readOnly
              />
            </div>
          ))}
        </div>

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
