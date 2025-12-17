import React, { useState, useEffect } from "react";
import { X, Plus, Save } from "lucide-react";
import { Button } from "../ui/button.jsx";
import { supabase } from "../../config/supabaseClient.js";

const PRIX_PAR_TONNE = 33000;

/* ===========================
   Utils
=========================== */

// Convertit "43,28" → 43.28
const parseDecimal = (value) => {
  if (!value) return 0;
  return Number(value.replace(",", "."));
};

// Format FCFA
const formatCurrency = (amount) => {
  return Number(amount || 0)
    .toLocaleString("fr-FR", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0,
    })
    .replace("XOF", "FCFA")
    .replace(/\s/g, "\u202F");
};

export default function SummaryTableModal({
  isOpen,
  onClose,
  onUpdate,
  initialData = [],
}) {
  const emptyRow = {
    immatriculation: "",
    bonLivraison: "",
    dateDechargement: "",
    quantite: "",
    tarif: 0,
    retenue: 0,
    montantNet: 0,
  };

  const [rows, setRows] = useState(
    initialData.length ? initialData : [emptyRow]
  );
  const [camions, setCamions] = useState([]);
  const [totalHTVA, setTotalHTVA] = useState(0);

  /* ===========================
     Charger camions GTS
  ============================ */
  useEffect(() => {
    const fetchCamionsGTS = async () => {
      const { data, error } = await supabase
        .from("camions")
        .select("id, immatriculation")
        .eq("structure", "GTS")
        .order("immatriculation");

      if (!error) setCamions(data || []);
    };

    fetchCamionsGTS();
  }, []);

  /* ===========================
     Calculs automatiques
  ============================ */
  useEffect(() => {
    let total = 0;

    const updatedRows = rows.map((row) => {
      const quantite = parseDecimal(row.quantite);
      const tarif = quantite * PRIX_PAR_TONNE;
      const retenue = Math.round(tarif * 0.05);
      const montantNet = tarif - retenue;

      total += montantNet;

      return {
        ...row,
        tarif,
        retenue,
        montantNet,
      };
    });

    setTotalHTVA(total);
    setRows(updatedRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map((r) => r.quantite).join("|")]);

  if (!isOpen) return null;

  /* ===========================
     Handlers
  ============================ */
  const handleAddRow = () => {
    setRows([...rows, { ...emptyRow }]);
  };

  const handleRemoveRow = (idx) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleChange = (idx, field, value) => {
    const newRows = [...rows];

    if (field === "quantite") {
      newRows[idx][field] = value
        .replace(/[^0-9,]/g, "")
        .replace(/(,.*),/g, "$1"); // une seule virgule
    } else {
      newRows[idx][field] = value;
    }

    setRows(newRows);
  };

  const handleSave = () => {
    onUpdate(rows);
    onClose();
  };

  /* ===========================
     Render
  ============================ */
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl p-6 max-h-[90vh] overflow-y-auto border">

        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Plus className="text-blue-600" /> Remplir Tableau Résumé
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500">
            <X size={22} />
          </button>
        </div>

        {/* Table header */}
        <div className="flex gap-2 font-bold text-sm border-b pb-2">
          <div className="w-10 text-center">N°</div>
          <div className="flex-1">Immatriculation</div>
          <div className="flex-1">Bon de livraison</div>
          <div className="w-32 text-center">Date</div>
          <div className="w-32 text-right">Quantité</div>
          <div className="w-32 text-right">Tarif</div>
          <div className="w-32 text-right">Retenue 5%</div>
          <div className="w-32 text-right">Montant net</div>
          <div className="w-5"></div>
        </div>

        {/* Rows */}
        {rows.map((row, idx) => (
          <div key={idx} className="flex gap-2 items-center mt-2">
            <div className="w-10 text-center font-semibold">{idx + 1}</div>

            <select
              className="flex-1 border p-1 rounded-md"
              value={row.immatriculation}
              onChange={(e) =>
                handleChange(idx, "immatriculation", e.target.value)
              }
            >
              <option value="">-- Camion GTS --</option>
              {camions.map((camion) => (
                <option key={camion.id} value={camion.immatriculation}>
                  {camion.immatriculation}
                </option>
              ))}
            </select>

            <input
              className="flex-1 border p-1 rounded-md"
              value={row.bonLivraison}
              onChange={(e) =>
                handleChange(idx, "bonLivraison", e.target.value)
              }
            />

            <input
              type="date"
              className="w-32 border p-1 rounded-md"
              value={row.dateDechargement}
              onChange={(e) =>
                handleChange(idx, "dateDechargement", e.target.value)
              }
            />

            <input
              type="text"
              placeholder="0,00"
              className="w-32 text-right border p-1 rounded-md"
              value={row.quantite}
              onChange={(e) =>
                handleChange(idx, "quantite", e.target.value)
              }
            />

            <input
              className="w-32 text-right border p-1 rounded-md bg-gray-100 font-bold"
              value={formatCurrency(row.tarif)}
              readOnly
            />

            <input
              className="w-32 text-right border p-1 rounded-md bg-gray-100 font-bold"
              value={formatCurrency(row.retenue)}
              readOnly
            />

            <input
              className="w-32 text-right border p-1 rounded-md bg-gray-100 font-bold"
              value={formatCurrency(row.montantNet)}
              readOnly
            />

            <button
              onClick={() => handleRemoveRow(idx)}
              className="text-gray-400 hover:text-red-600"
            >
              <X size={18} />
            </button>
          </div>
        ))}

        {/* Footer */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <div className="font-bold text-lg">
            Total HTVA : {formatCurrency(totalHTVA)}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAddRow}
              className="px-4 py-2 bg-green-600 text-white rounded-md"
            >
              <Plus size={16} /> Ajouter ligne
            </button>

            <Button onClick={handleSave}>
              <Save size={16} /> Enregistrer & Fermer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
