// src/components/billing/SummaryTableModal.jsx
import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, Save } from "lucide-react";
import { Button } from "../ui/button.jsx";

const LABEL_OPTIONS = [
  "Transport minerais",
  "Consommation Fuel",
  "Back charge",
  "TOTAL HT",
  "Retenue à la source 5%",
];

const formatCurrency = (amount) => {
  return Number(amount).toLocaleString("fr-FR", {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).replace('XOF', 'FCFA').replace(/\s/g, '\u202F');
};

export default function SummaryTableModal({ isOpen, onClose, onUpdate, initialData = [] }) {
  // --- ÉTAT LOCAL ---
  const [rows, setRows] = useState([]);
  const [totalHTVA, setTotalHTVA] = useState(0);

  // ==========================================
  // 1. SYNCHRONISATION (Crucial pour la modification)
  // ==========================================
  useEffect(() => {
  if (isOpen) {
    // Si initialData est vide (nouvelle facture), on repart sur une ligne propre
    if (!initialData || initialData.length === 0) {
      setRows([{ label: "", amount: "" }]);
    } else {
      // Sinon on charge les données de la facture à modifier
      setRows(initialData.filter(r => r.label !== "TOTAL HTVA"));
    }
  }
}, [isOpen, initialData]);

  // --- LOGIQUE DE CALCUL (Optimisée) ---
  const calculateTotals = useCallback(() => {
    if (rows.length === 0) return;

    let totalHT = 0;
    rows.forEach((row) => {
      if (row.label === "TOTAL HT") {
        totalHT = Number(row.amount) || 0;
      }
    });

    const retenueCalc = Math.round(totalHT * 0.05);
    let hasChanged = false;

    const newRows = rows.map((row) => {
      if (row.label === "Retenue à la source 5%") {
        if (Number(row.amount) !== retenueCalc) {
          hasChanged = true;
          return { ...row, amount: retenueCalc };
        }
      }
      return row;
    });

    if (hasChanged) {
      setRows(newRows);
    }
    
    const effectiveRetenue = rows.some(r => r.label === "Retenue à la source 5%") ? retenueCalc : 0;
    setTotalHTVA(totalHT - effectiveRetenue);
  }, [rows]);

  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  if (!isOpen) return null;

  // --- ACTIONS ---
  const handleAddRow = () => setRows([...rows, { label: "", amount: "" }]);

  const handleRemoveRow = (idx) => {
    const newRows = rows.filter((_, i) => i !== idx);
    setRows(newRows.length > 0 ? newRows : [{ label: "", amount: "" }]);
  };

  const handleChange = (idx, field, value) => {
    const newRows = [...rows];
    if (field === "amount") {
      const numericValue = value.replace(/[^0-9]/g, '');
      newRows[idx][field] = numericValue;
    } else {
      newRows[idx][field] = value;
    }
    setRows(newRows);
  };

  const handleSave = () => {
    // On garde uniquement les lignes valides
    const filteredRows = rows.filter(
      (r) => r.label && (r.amount !== "" || Number(r.amount) !== 0)
    );

    // On ajoute le total calculé pour la sauvegarde finale
    const finalData = [
      ...filteredRows,
      { label: "TOTAL HTVA", amount: totalHTVA },
    ].map(r => ({
      label: r.label,
      amount: Number(r.amount) || 0
    }));

    onUpdate(finalData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl p-6 border dark:border-gray-700">
        
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Plus className="text-blue-600" />
            {initialData.length > 0 ? "Modifier le Résumé" : "Remplir Tableau Résumé"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
          {rows.map((row, idx) => {
            const isRetenue = row.label === "Retenue à la source 5%";
            return (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  className={`flex-1 p-2 border rounded-md dark:bg-gray-800 ${isRetenue ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  value={row.label}
                  onChange={(e) => handleChange(idx, "label", e.target.value)}
                  disabled={isRetenue}
                >
                  <option value="" disabled>-- Sélectionner --</option>
                  {LABEL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>

                <input
                  type="text"
                  disabled={isRetenue}
                  className={`w-40 p-2 border rounded-md text-right ${isRetenue ? 'bg-gray-100 text-red-600' : 'dark:bg-gray-800'}`}
                  value={row.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                  onChange={(e) => handleChange(idx, "amount", e.target.value)}
                />

                <button
                  onClick={() => handleRemoveRow(idx)}
                  className="text-gray-400 hover:text-red-600"
                  disabled={isRetenue}
                >
                  <X size={18} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row justify-between mt-6 pt-4 border-t items-center gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex-1 w-full">
            <span className="text-blue-700 dark:text-blue-300 font-bold">
              Total Net (HTVA) : {formatCurrency(totalHTVA)}
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleAddRow} className="bg-green-600 hover:bg-green-700">
              <Plus size={16} className="mr-1" /> Ligne
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save size={16} className="mr-1" /> Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}