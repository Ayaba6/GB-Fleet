// src/components/billing/SummaryTableModal.jsx
import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, Save } from "lucide-react"; // Ajout de l'icône Save
import { Button } from "../ui/button.jsx";

const LABEL_OPTIONS = [
  "Transport minerais",
  "Consommation Fuel",
  "Back charge",
  "TOTAL HT",
  "Retenue à la source 5%",
];

// Fonction d'aide pour formater le montant en FCFA (avec espace insécable)
const formatCurrency = (amount) => {
    return Number(amount).toLocaleString("fr-FR", {
        style: 'currency',
        currency: 'XOF', // XOF pour Franc CFA d'Afrique de l'Ouest
        minimumFractionDigits: 0,
    }).replace('XOF', 'FCFA').replace(/\s/g, '\u202F'); // Remplacement de l'espace par un espace insécable
};

// Hook pour initialiser les données si elles existent (amélioration depuis le composant parent)
export default function SummaryTableModal({ isOpen, onClose, onUpdate, initialData = [] }) {
  // L'initialData ne doit pas contenir la ligne TOTAL HTVA si elle vient du parent, 
  // car nous la recalculons. Filtrons-la.
  const initialRows = initialData.filter(r => r.label !== "TOTAL HTVA");
  const [rows, setRows] = useState(initialRows.length ? initialRows : [{ label: "", amount: "" }]);
  const [totalHTVA, setTotalHTVA] = useState(0);

  // --- LOGIQUE AUTOMATIQUE DE CALCUL ---
  // Utilisation de useCallback et useEffect pour optimiser et fiabiliser la dépendance
  const calculateTotals = useCallback(() => {
    let totalHT = 0;

    rows.forEach((row) => {
      if (row.label === "TOTAL HT") {
        totalHT = Number(row.amount) || 0;
      }
    });

    const retenueCalc = Math.round(totalHT * 0.05);

    let updated = false;

    // Mise à jour de la ligne Retenue
    const newRows = rows.map((row) => {
      if (row.label === "Retenue à la source 5%") {
        // La retenue est calculée. On s'assure que la valeur dans l'état correspond au calcul.
        if (Number(row.amount) !== retenueCalc) {
          updated = true;
          return { ...row, amount: retenueCalc };
        }
      }
      return row;
    });

    if (updated) {
      setRows(newRows);
    }
    
    // Si la retenue n'est pas dans le tableau, on la déduit quand même si le TOTAL HT existe
    const effectiveRetenue = rows.some(r => r.label === "Retenue à la source 5%") ? retenueCalc : 0;
    
    setTotalHTVA(totalHT - effectiveRetenue);

  }, [rows]);

  useEffect(() => {
    calculateTotals();
  }, [rows, calculateTotals]);
  // Fin de la logique automatique

  if (!isOpen) return null;

  const handleAddRow = () =>
    setRows([...rows, { label: "", amount: "" }]);

  const handleRemoveRow = (idx) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleChange = (idx, field, value) => {
    const newRows = [...rows];
    // Assurez-vous que l'input Montant accepte uniquement des chiffres (ou vide)
    if (field === "amount") {
        const numericValue = value.replace(/\u202F/g, "").replace(/[^0-9]/g, '');
        newRows[idx][field] = numericValue;
    } else {
        newRows[idx][field] = value;
    }
    setRows(newRows);
  };

  const handleSave = () => {
    const filteredRows = rows.filter(
      (r) => r.label && Number(r.amount) !== 0 && !r.label.toLowerCase().includes("total htva")
    );

    // Ajout de la ligne TOTAL HTVA finale (non modifiable)
    const updatedRows = [
      ...filteredRows,
      { label: "TOTAL HTVA", amount: totalHTVA },
    ];

    onUpdate(
      updatedRows.map((r) => ({
        label: r.label,
        amount: Number(r.amount) || 0,
      }))
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[100] p-4 transition-all duration-300">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Plus className="text-blue-600 dark:text-blue-400" />
            Remplir Tableau Résumé
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={22} />
          </button>
        </div>

        {/* Corps du Tableau */}
        <div className="space-y-4">
          <div className="flex gap-2 items-center font-bold text-sm text-gray-600 dark:text-gray-300 border-b border-gray-300 dark:border-gray-700 pb-2">
            <div className="flex-1">Libellé</div>
            <div className="w-32 text-right">Montant (FCFA)</div>
            <div className="w-5"></div> {/* Espace pour le bouton Supprimer */}
          </div>
          {rows.map((row, idx) => {
            const isRetenue = row.label === "Retenue à la source 5%";
            const isTotal = row.label === "TOTAL HT";

            return (
              <div key={idx} className="flex gap-2 items-center">
                {/* Libellé */}
                <select
                  className={`flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-400 ${isRetenue ? 'bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed' : ''}`}
                  value={row.label}
                  onChange={(e) => handleChange(idx, "label", e.target.value)}
                  disabled={isRetenue} // Désactiver le changement de libellé pour la retenue
                >
                  <option value="" disabled>-- Sélectionner un libellé --</option>
                  {LABEL_OPTIONS.map((opt) => (
                    <option 
                        key={opt} 
                        value={opt}
                        // Stylisation des options critiques (Retenue/Total)
                        className={opt.includes('TOTAL HT') ? 'font-bold' : opt.includes('Retenue') ? 'text-red-600 dark:text-red-400' : ''}
                    >
                      {opt}
                    </option>
                  ))}
                </select>

                {/* Montant */}
                <input
                  type="text" // Type text pour gérer le formatage personnalisé
                  disabled={isRetenue}
                  className={`w-32 p-2 border border-gray-300 dark:border-gray-700 rounded-md text-right focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-400 transition ${
                    isRetenue
                      ? "bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed font-medium text-red-600 dark:text-red-400"
                      : isTotal 
                      ? "font-bold bg-yellow-50 dark:bg-yellow-900/30" // Surligner TOTAL HT
                      : "bg-white dark:bg-gray-800"
                  }`}
                  placeholder="Montant"
                  // Affichage formaté (1 000 000)
                  value={row.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F")}
                  onChange={(e) =>
                    handleChange(
                      idx,
                      "amount",
                      e.target.value.replace(/\u202F/g, "") // Supprime l'espace insécable avant de stocker
                    )
                  }
                />

                {/* ❌ Supprimer ligne */}
                <button
                  onClick={() => handleRemoveRow(idx)}
                  className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 transition"
                  title="Supprimer la ligne"
                  disabled={rows.length === 1} // Empêcher la suppression de la dernière ligne
                >
                  <X size={18} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Actions et Total Final */}
        <div className="flex flex-col md:flex-row justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 items-center gap-3">
          
          {/* Ligne de Total HTVA Calculé */}
          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg flex-1 w-full md:w-auto">
            <span className="text-blue-700 dark:text-blue-300 font-bold text-lg flex items-center gap-2">
              <span className="text-2xl"></span>
              Total (HTVA) :
              <span className="ml-2 text-blue-900 dark:text-blue-100">
                {formatCurrency(totalHTVA)}
              </span>
            </span>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 transition"
            >
              <Plus size={16} /> Ajouter ligne
            </button>
            <Button
              onClick={handleSave}
              className="flex items-center gap-1 bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700 transition"
            >
              <Save size={16} /> Enregistrer & Fermer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}