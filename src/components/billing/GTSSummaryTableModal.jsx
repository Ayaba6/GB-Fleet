import React, { useState, useEffect, useMemo } from "react";
import { X, Plus, Save } from "lucide-react";
import { Button } from "../ui/button.jsx";
import { supabase } from "../../config/supabaseClient.js";

const PRIX_PAR_TONNE = 33000;

const parseDecimal = (value) => {
  if (!value) return 0;
  const stringValue = String(value).replace(",", ".");
  return parseFloat(stringValue) || 0;
};

const formatCurrency = (amount) => {
  return Number(amount || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
  }).replace("XOF", "FCFA");
};

export default function GTSSummaryTableModal({ isOpen, onClose, onUpdate, initialData = [] }) {
  const emptyRow = { immatriculation: "", bonLivraison: "", dateDechargement: "", quantite: "", tarif: 0, retenue: 0, montantNet: 0 };

  // État local des lignes
  const [rows, setRows] = useState([emptyRow]);
  const [camions, setCamions] = useState([]);

  // 1. Synchronisation forcée à l'ouverture
  useEffect(() => {
    if (isOpen) {
      if (Array.isArray(initialData) && initialData.length > 0) {
        setRows([...initialData]); // On crée une copie pour éviter les références directes
      } else {
        setRows([{ ...emptyRow }]);
      }
    }
  }, [isOpen, initialData]);

  // 2. Chargement des camions
  useEffect(() => {
    if (isOpen) {
      const fetchCamions = async () => {
        const { data } = await supabase.from("camions").select("id, immatriculation").eq("structure", "GTS").order("immatriculation");
        if (data) setCamions(data);
      };
      fetchCamions();
    }
  }, [isOpen]);

  // 3. Calculs dynamiques (useMemo est parfait ici pour ne pas bloquer l'UI)
  const computedData = useMemo(() => {
    const computedRows = rows.map((row) => {
      const quantite = parseDecimal(row.quantite);
      const tarif = Math.round(quantite * PRIX_PAR_TONNE);
      const retenue = Math.round(tarif * 0.05);
      const montantNet = tarif - retenue;
      return { ...row, tarif, retenue, montantNet };
    });
    const total = computedRows.reduce((acc, r) => acc + r.montantNet, 0);
    return { rows: computedRows, total };
  }, [rows]);

  const handleChange = (idx, field, value) => {
    const newRows = [...rows];
    newRows[idx] = { ...newRows[idx], [field]: value };
    setRows(newRows);
  };

  const handleSave = () => {
    onUpdate(computedData.rows); // On renvoie les lignes calculées au parent
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl p-6 max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Plus className="text-blue-600" /> 
            {initialData.length > 0 ? "Modifier Résumé GTS" : "Nouveau Résumé GTS"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500"><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
              <tr className="text-xs uppercase text-gray-500 border-b">
                <th className="p-2 w-10">N°</th>
                <th className="p-2">Immatriculation</th>
                <th className="p-2">Bon Livr.</th>
                <th className="p-2 w-40">Date</th>
                <th className="p-2 w-28 text-right">Qté (T)</th>
                <th className="p-2 text-right">Net à payer</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-2 text-gray-400 text-sm">{idx + 1}</td>
                  <td className="p-2">
                    <select className="w-full p-1 border rounded dark:bg-gray-800" value={row.immatriculation} onChange={(e) => handleChange(idx, "immatriculation", e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {camions.map(c => <option key={c.id} value={c.immatriculation}>{c.immatriculation}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <input className="w-full p-1 border rounded dark:bg-gray-800" value={row.bonLivraison} onChange={(e) => handleChange(idx, "bonLivraison", e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="date" className="w-full p-1 border rounded dark:bg-gray-800" value={row.dateDechargement} onChange={(e) => handleChange(idx, "dateDechargement", e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="text" className="w-full p-1 border rounded text-right font-bold dark:bg-gray-800" value={row.quantite} onChange={(e) => handleChange(idx, "quantite", e.target.value.replace(",", "."))} />
                  </td>
                  <td className="p-2 text-right font-bold text-green-600">
                    {formatCurrency(computedData.rows[idx].montantNet)}
                  </td>
                  <td className="p-2">
                    <button onClick={() => setRows(rows.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500"><X size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button onClick={() => setRows([...rows, { ...emptyRow }])} variant="outline" className="mt-4 w-full border-dashed">
            + Ajouter un camion
          </Button>
        </div>

        <div className="mt-6 pt-4 border-t flex justify-between items-center">
          <div className="text-lg">Total Net : <span className="font-bold text-blue-600">{formatCurrency(computedData.total)}</span></div>
          <div className="flex gap-3">
            <Button onClick={onClose} variant="ghost">Annuler</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 px-8">Enregistrer le tableau</Button>
          </div>
        </div>
      </div>
    </div>
  );
}