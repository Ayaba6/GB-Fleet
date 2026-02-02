import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save } from "lucide-react"; 
import { Button } from "../ui/button.jsx";

const DESIGNATION_OPTIONS = [
  "Nombre de voyages (U)",
  "Tonnages (T)",
  "Consommation Fuel (L)",
  "Back charge (U)",
];

export default function ItemsTableModal({ isOpen, onClose, onUpdate, initialData = [] }) {
  // --- ÉTAT LOCAL ---
  const [rows, setRows] = useState([{ description: "", unitPrice: "", quantity: "" }]);

  // ==========================================
  // 1. SYNCHRONISATION (Crucial pour la modification)
  // ==========================================
 useEffect(() => {
  if (isOpen) {
    // Si initialData est vide (nouvelle facture), on repart sur une ligne propre
    if (!initialData || initialData.length === 0) {
      setRows([{ description: "", unitPrice: "", quantity: "" }]);
    } else {
      // Sinon on charge les données de la facture à modifier
      setRows(initialData);
    }
  }
}, [isOpen, initialData]);

  if (!isOpen) return null;

  // --- ACTIONS ---
  const handleAddRow = () => setRows([...rows, { description: "", unitPrice: "", quantity: "" }]);

  const handleRemoveRow = (idx) => {
    if (rows.length === 1) {
      setRows([{ description: "", unitPrice: "", quantity: "" }]);
      return;
    }
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleChange = (idx, field, value) => {
    const newRows = [...rows];
    if (field === "unitPrice" || field === "quantity") {
      value = value.replace(/[^0-9.]/g, ""); // Autorise les chiffres et le point décimal
    }
    newRows[idx][field] = value;
    setRows(newRows);
  };

  const handleSave = () => {
    // Filtrer les lignes vides avant de sauvegarder
    const validRows = rows.filter(r => r.description !== "" || r.unitPrice !== "");
    
    onUpdate(
      validRows.map((r) => {
        const price = Number(r.unitPrice) || 0;
        const qty = Number(r.quantity) || 0;
        // Logique spécifique : Tonnages multiplie par 70
        const total = r.description === "Tonnages (T)" ? price * qty * 70 : price * qty;
        return { 
          description: r.description, 
          unitPrice: price, 
          quantity: qty, 
          total 
        };
      })
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl shadow-2xl w-full max-w-4xl p-6 max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Plus className="text-blue-600" /> 
            {initialData.length > 0 ? "Modifier les Détails" : "Remplir Tableau Détails"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
            <Trash2 size={22} />
          </button>
        </div>

        {/* Corps du Tableau */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {rows.map((row, idx) => {
            const price = Number(row.unitPrice) || 0;
            const qty = Number(row.quantity) || 0;
            const total = row.description === "Tonnages (T)" ? price * qty * 70 : price * qty;

            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center p-3 border rounded-lg dark:border-gray-800 relative group">
                {/* Désignation */}
                <div className="md:col-span-2">
                  {idx === 0 && !initialData.length ? (
                    <input
                      type="text"
                      className="w-full p-2 border rounded-md dark:bg-gray-800"
                      placeholder="Description libre (ex: Transport...)"
                      value={row.description}
                      onChange={(e) => handleChange(idx, "description", e.target.value)}
                    />
                  ) : (
                    <select
                      className="w-full p-2 border rounded-md dark:bg-gray-800"
                      value={row.description}
                      onChange={(e) => handleChange(idx, "description", e.target.value)}
                    >
                      <option value="">-- Sélectionner --</option>
                      {DESIGNATION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* PU */}
                <input
                  type="text"
                  className="p-2 border rounded-md text-right dark:bg-gray-800"
                  placeholder="Prix Unit."
                  value={row.unitPrice}
                  onChange={(e) => handleChange(idx, "unitPrice", e.target.value)}
                />

                {/* Quantité */}
                <input
                  type="text"
                  className="p-2 border rounded-md text-right dark:bg-gray-800"
                  placeholder="Qté"
                  value={row.quantity}
                  onChange={(e) => handleChange(idx, "quantity", e.target.value)}
                />

                {/* Montant Total Ligne */}
                <div className="p-2 border rounded-md bg-gray-50 dark:bg-gray-800/50 text-right font-bold text-blue-600 dark:text-blue-400">
                  {total.toLocaleString("fr-FR")}
                </div>

                {/* Bouton Supprimer */}
                <button
                  onClick={() => handleRemoveRow(idx)}
                  className="absolute -right-2 -top-2 md:static text-gray-400 hover:text-red-600 bg-white dark:bg-gray-900 rounded-full p-1 shadow-sm md:shadow-none"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button 
            onClick={handleAddRow} 
            className="bg-green-600 hover:bg-green-700 text-white flex gap-2"
          >
            <Plus size={18} /> Ajouter une ligne
          </Button>
          
          <Button 
            onClick={handleSave} 
            className="bg-blue-600 hover:bg-blue-700 text-white flex gap-2 px-8"
          >
            <Save size={18} /> Enregistrer les détails
          </Button>
        </div>
      </div>
    </div>
  );
}