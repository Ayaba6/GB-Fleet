import React, { useState, useEffect, useCallback } from "react";
import { X, Save } from "lucide-react";
import { Button } from "../ui/button.jsx";

const LABEL_OPTIONS = [
  "Transport minerais",
  "Consommation Fuel",
  "Back charge",
  "TOTAL HT",
  "Retenue à la source 5%",
];

const formatCurrency = (amount) => {
  return Number(amount).toLocaleString("fr-FR").replace(/\s/g, '\u00A0') + " FCFA";
};

export default function SummaryTableModal({ isOpen, onClose, onUpdate, initialData = [], itemsData = [] }) {
  const [rows, setRows] = useState([]);
  const [totalHTVA, setTotalHTVA] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // On ne pré-remplit automatiquement QUE si c'est une nouvelle saisie (initialData vide)
      if (!initialData || initialData.length === 0) {
        
        // Fonction pour extraire le total d'une ligne du premier tableau
        const getVal = (keyword) => {
          const item = itemsData.find(i => 
            (i.description || "").toLowerCase().includes(keyword.toLowerCase())
          );
          return item ? Number(item.total) : 0;
        };

        // Récupération des 3 montants clés
        const tonnageTotal = getVal("Tonnages"); 
        const fuelTotal = getVal("Fuel");
        const backChargeTotal = getVal("Back charge");
        
        // Calcul : TOTAL HT = Tonnages - Fuel - Back charge
        const calculatedHT = tonnageTotal - fuelTotal - backChargeTotal;
        const retenue = Math.round(calculatedHT * 0.05);

        setRows([
          { label: "Transport minerais", amount: tonnageTotal },
          { label: "Consommation Fuel", amount: fuelTotal },
          { label: "Back charge", amount: backChargeTotal },
          { label: "TOTAL HT", amount: calculatedHT },
          { label: "Retenue à la source 5%", amount: retenue }
        ]);
      } else {
        // Si des données existent déjà (modification), on les affiche
        setRows(initialData.filter(r => r.label !== "TOTAL HTVA"));
      }
    }
  }, [isOpen, initialData, itemsData]);

  // Recalcul du Net à payer dès que les lignes changent
  const calculateFinalTotal = useCallback(() => {
    const htRow = rows.find(r => r.label === "TOTAL HT");
    const totalHT = htRow ? Number(htRow.amount) : 0;
    const retenue = Math.round(totalHT * 0.05);
    setTotalHTVA(totalHT - retenue);
  }, [rows]);

  useEffect(() => {
    calculateFinalTotal();
  }, [calculateFinalTotal]);

  const handleSave = () => {
    const finalData = [
      ...rows,
      { label: "TOTAL HTVA", amount: totalHTVA }
    ].map(r => ({ label: r.label, amount: Number(r.amount) || 0 }));
    
    onUpdate(finalData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[120] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl p-6 border">
        <div className="flex justify-between items-center border-b pb-4 mb-4 text-black dark:text-white">
          <h2 className="text-xl font-bold font-sans">Résumé d'Exploitation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
        </div>

        <div className="space-y-3">
          {rows.map((row, idx) => {
            const isAuto = ["TOTAL HT", "Retenue à la source 5%"].includes(row.label);
            return (
              <div key={idx} className="flex gap-4 items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                <span className="flex-1 font-semibold text-gray-700 dark:text-gray-200">{row.label}</span>
                <input
                  type="text"
                  readOnly={isAuto}
                  className={`w-44 p-2 text-right border rounded-lg font-bold text-lg ${
                    isAuto ? 'bg-gray-100 text-gray-600' : 'bg-white text-blue-600'
                  }`}
                  value={Number(row.amount).toLocaleString("fr-FR")}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-4 border-t">
          <div className="flex justify-between items-center p-5 bg-blue-600 rounded-2xl text-white mb-6">
            <span className="text-sm font-black uppercase">NET À PAYER (HTVA)</span>
            <span className="text-3xl font-black">{formatCurrency(totalHTVA)}</span>
          </div>
          <Button onClick={handleSave} className="w-full bg-gray-900 text-white py-7 text-xl font-black rounded-2xl">
            Enregistrer le Résumé
          </Button>
        </div>
      </div>
    </div>
  );
}