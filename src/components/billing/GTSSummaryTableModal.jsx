// src/components/billing/SummaryTableModal.jsx
import React, { useState, useEffect } from "react";
import { X, Plus, Save } from "lucide-react"; 
import { Button } from "../ui/button.jsx";

// Fonction pour formater en FCFA avec espace insécable
const formatCurrency = (amount) => {
  return Number(amount).toLocaleString("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
  }).replace("XOF", "FCFA").replace(/\s/g, "\u202F");
};

export default function SummaryTableModal({ isOpen, onClose, onUpdate, initialData = [] }) {
  const initialRows = initialData.length
    ? initialData
    : [
        {
          no: "",
          immatriculation: "",
          bonLivraison: "",
          dateDechargement: "",
          quantite: "",
          tarif: "",
          retenue: "",
          montantTotal: "",
        },
      ];

  const [rows, setRows] = useState(initialRows);
  const [totalHTVA, setTotalHTVA] = useState(0);

  useEffect(() => {
    // Calcul automatique Montant Total et Total HTVA
    const updatedRows = rows.map((row) => {
      const quantite = Number(row.quantite) || 0;
      const tarif = Number(row.tarif) || 0;
      const retenue = Number(row.retenue) || 0;
      const montantTotal = quantite * tarif - retenue;
      return { ...row, montantTotal };
    });

    setRows(updatedRows);

    const total = updatedRows.reduce((sum, r) => sum + (r.montantTotal || 0), 0);
    setTotalHTVA(total);
  }, [rows]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        no: "",
        immatriculation: "",
        bonLivraison: "",
        dateDechargement: "",
        quantite: "",
        tarif: "",
        retenue: "",
        montantTotal: "",
      },
    ]);
  };

  const handleRemoveRow = (idx) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleChange = (idx, field, value) => {
    const newRows = [...rows];
    if (["quantite", "tarif", "retenue"].includes(field)) {
      newRows[idx][field] = value.replace(/[^0-9]/g, "");
    } else {
      newRows[idx][field] = value;
    }
    setRows(newRows);
  };

  const handleSave = () => {
    onUpdate(rows);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[100] p-4 transition-all duration-300">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl w-full max-w-6xl p-6 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">

        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Plus className="text-blue-600 dark:text-blue-400" /> Remplir Tableau Résumé
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={22} />
          </button>
        </div>

        {/* Tableau */}
        <div className="space-y-4">
          {/* Header tableau */}
          <div className="flex gap-2 items-center font-bold text-sm text-gray-600 dark:text-gray-300 border-b border-gray-300 dark:border-gray-700 pb-2">
            <div className="w-10 text-center">N°</div>
            <div className="flex-1">Immatriculation</div>
            <div className="flex-1">Bon de livraison</div>
            <div className="w-32 text-center">Date de déchargement</div>
            <div className="w-32 text-right">Quantité déchargée</div>
            <div className="w-32 text-right">Tarif Lomé-Ouaga</div>
            <div className="w-32 text-right">Retenue 5%</div>
            <div className="w-32 text-right">Montant Total</div>
            <div className="w-5"></div>
          </div>

          {rows.map((row, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                className="w-10 text-center border p-1 rounded-md"
                value={row.no || ""}
                onChange={(e) => handleChange(idx, "no", e.target.value)}
              />
              <input
                type="text"
                className="flex-1 border p-1 rounded-md"
                value={row.immatriculation || ""}
                onChange={(e) => handleChange(idx, "immatriculation", e.target.value)}
              />
              <input
                type="text"
                className="flex-1 border p-1 rounded-md"
                value={row.bonLivraison || ""}
                onChange={(e) => handleChange(idx, "bonLivraison", e.target.value)}
              />
              <input
                type="date"
                className="w-32 text-center border p-1 rounded-md"
                value={row.dateDechargement || ""}
                onChange={(e) => handleChange(idx, "dateDechargement", e.target.value)}
              />
              <input
                type="number"
                className="w-32 text-right border p-1 rounded-md"
                value={row.quantite || ""}
                onChange={(e) => handleChange(idx, "quantite", e.target.value)}
              />
              <input
                type="number"
                className="w-32 text-right border p-1 rounded-md"
                value={row.tarif || ""}
                onChange={(e) => handleChange(idx, "tarif", e.target.value)}
              />
              <input
                type="number"
                className="w-32 text-right border p-1 rounded-md"
                value={row.retenue || ""}
                onChange={(e) => handleChange(idx, "retenue", e.target.value)}
              />
              <input
                type="text"
                className="w-32 text-right border p-1 rounded-md bg-gray-100 dark:bg-gray-800 font-bold"
                value={formatCurrency(row.montantTotal || 0)}
                readOnly
              />
              <button
                onClick={() => handleRemoveRow(idx)}
                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 transition"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Actions et total HTVA */}
        <div className="flex flex-col md:flex-row justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 items-center gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg flex-1 w-full md:w-auto">
            <span className="text-blue-700 dark:text-blue-300 font-bold text-lg flex items-center gap-2">
              Total (HTVA) : <span className="ml-2 text-blue-900 dark:text-blue-100">{formatCurrency(totalHTVA)}</span>
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
