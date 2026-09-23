import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, X } from "lucide-react"; 
import { Button } from "../ui/button.jsx";

// Configuration stricte selon items.PNG et vos instructions
const DEFAULT_VALUES = [
  { description: "Transport minerais-NIOU- Bissa ROM-Pad(km)", unitPrice: "1", quantity: "70" }, // Quantité préréglée selon l'image
  { description: "Nombres de voyages(U)", unitPrice: "1", quantity: "135" }, // Quantité préréglée selon l'image
  { description: "Tonnages(T)", unitPrice: "55", quantity: "5752" }, // Valeurs issues de l'image
  { description: "Consommation Fuel(L)", unitPrice: "1150", quantity: "10380" }, // Valeurs issues de l'image
  { description: "Back charge Dec 25 - Jan 26 (U)", unitPrice: "11", quantity: "170000" }, // Prêt pour saisie ou modification
];

export default function ItemsTableModal({ isOpen, onClose, onUpdate, initialData = [] }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (!initialData || initialData.length === 0) {
        // Mode création : chargement automatique du modèle complet
        setRows(DEFAULT_VALUES.map(item => ({ ...item })));
      } else {
        // Mode édition : chargement des données sauvegardées
        setRows(initialData.map(r => ({
          ...r,
          unitPrice: r.unitPrice.toString(),
          quantity: r.quantity.toString()
        })));
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (idx, field, value) => {
    const newRows = [...rows];
    if (field === "unitPrice" || field === "quantity") {
      value = value.replace(/[^0-9]/g, ""); // Sécurité : chiffres uniquement
    }
    newRows[idx][field] = value;
    setRows(newRows);
  };

  const calculateRowTotal = (row) => {
    const price = Number(row.unitPrice) || 0;
    const qty = Number(row.quantity) || 0;
    // Logique BATICOM : Le tonnage multiplie par 70
    return row.description.includes("Tonnages") ? price * qty * 70 : price * qty;
  };

  const handleSave = () => {
    onUpdate(
      rows.filter(r => r.description !== "").map((r) => ({
        ...r,
        unitPrice: Number(r.unitPrice) || 0,
        quantity: Number(r.quantity) || 0,
        total: calculateRowTotal(r)
      }))
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 font-sans">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl p-6 max-h-[90vh] flex flex-col border border-gray-200">
        
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Détails des Travaux (Modèle BATICOM)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {/* En-tête du tableau pour plus de clarté */}
          <div className="grid grid-cols-12 gap-2 px-2 mb-2 text-[11px] font-black text-gray-400 uppercase tracking-wider">
            <div className="col-span-5">Désignation Travaux</div>
            <div className="col-span-2 text-center">P.U (XOF)</div>
            <div className="col-span-2 text-center">Quantités</div>
            <div className="col-span-2 text-right">Total (XOF)</div>
            <div className="col-span-1"></div>
          </div>

          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-md bg-white hover:bg-blue-50/30 transition">
              <div className="col-span-5">
                <input
                  className="w-full p-2 border-none focus:ring-0 bg-transparent text-black font-medium"
                  value={row.description}
                  onChange={(e) => handleChange(idx, "description", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  className="w-full p-2 border rounded text-center text-black bg-gray-50 focus:bg-white"
                  value={row.unitPrice.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                  onChange={(e) => handleChange(idx, "unitPrice", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  className="w-full p-2 border rounded text-center text-black font-bold bg-gray-50 focus:bg-white"
                  value={row.quantity.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                  onChange={(e) => handleChange(idx, "quantity", e.target.value)}
                />
              </div>
              <div className="col-span-2 text-right font-black text-blue-600">
                {calculateRowTotal(row).toLocaleString("fr-FR")}
              </div>
              <div className="col-span-1 flex justify-end px-2">
                <button onClick={() => setRows(rows.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-between items-center border-t pt-4">
          <Button onClick={() => setRows([...rows, { description: "", unitPrice: "", quantity: "" }])} variant="outline" className="text-green-600 border-green-600">
            + Ajouter ligne libre
          </Button>
          <Button onClick={handleSave} className="bg-blue-700 hover:bg-blue-800 text-white px-12 py-5 font-bold">
            Valider la saisie
          </Button>
        </div>
      </div>
    </div>
  );
}