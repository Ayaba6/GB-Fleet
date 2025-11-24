import React, { useState } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../ui/button.jsx";
import { useToast } from "../ui/use-toast.jsx";
import { X } from "lucide-react";

export default function EditMissionModalGTS({ editingMission, setShowModal, fetchMissions }) {
  const { toast } = useToast();
  const isChargementPhase = editingMission.tonnage_charge === 0;

  const [tonnageCharge, setTonnageCharge] = useState(editingMission.tonnage_charge || 0);
  const [rapportCharge, setRapportCharge] = useState(editingMission.rapport_charge || "");
  const [tonnageDecharge, setTonnageDecharge] = useState(editingMission.tonnage_decharge || 0);
  const [rapportDecharge, setRapportDecharge] = useState(editingMission.rapport_decharge || "");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);

    const updates = isChargementPhase
      ? { tonnage_charge: tonnageCharge, rapport_charge: rapportCharge }
      : {
          tonnage_decharge: tonnageDecharge,
          rapport_decharge: rapportDecharge,
          statut: "Clôturée",
          date_cloture: new Date().toISOString().split("T")[0],
        };

    const { error } = await supabase
      .from("missions_gts")
      .update(updates)
      .eq("id", editingMission.id);

    setLoading(false);

    if (error) {
      setFormError(error.message);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Mission mise à jour !" });
      fetchMissions();
      setShowModal(null);
    }
  };

  const inputBaseClass =
    "w-full border rounded-lg p-2 focus:outline-none focus:ring-2 transition " +
    "bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600";

  const inputDisabledClass =
    "w-full border rounded-lg p-2 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600";

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={() => setShowModal(null)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-6 transform transition-all duration-300 hover:scale-105"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {isChargementPhase ? "Chargement à Lomé" : "Déchargement à Ouaga"}
          </h2>
          <Button variant="ghost" onClick={() => setShowModal(null)}>
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors" />
          </Button>
        </div>

        {formError && (
          <div className="p-3 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded text-sm">
            {formError}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isChargementPhase ? (
            <>
              <div>
                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
                  Tonnage chargé (T)
                </label>
                <input
                  type="number"
                  className={inputBaseClass}
                  value={tonnageCharge}
                  onChange={(e) => setTonnageCharge(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
                  Rapport de chargement
                </label>
                <textarea
                  className={inputBaseClass + " resize-none"}
                  rows={3}
                  value={rapportCharge}
                  onChange={(e) => setRapportCharge(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
                  Tonnage chargé (T) - Lomé
                </label>
                <input
                  type="number"
                  className={inputDisabledClass}
                  value={tonnageCharge}
                  disabled
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
                  Rapport chargement - Lomé
                </label>
                <textarea
                  className={inputDisabledClass + " resize-none"}
                  rows={3}
                  value={rapportCharge}
                  disabled
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
                  Tonnage déchargé (T)
                </label>
                <input
                  type="number"
                  className={inputBaseClass}
                  value={tonnageDecharge}
                  onChange={(e) => setTonnageDecharge(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
                  Rapport déchargement
                </label>
                <textarea
                  className={inputBaseClass + " resize-none"}
                  rows={3}
                  value={rapportDecharge}
                  onChange={(e) => setRapportDecharge(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white transition px-4 py-2 rounded-lg"
              disabled={loading}
            >
              {loading ? "Chargement..." : "Enregistrer"}
            </Button>
            <Button
              variant="outline"
              className="px-4 py-2 rounded-lg border-gray-400 dark:border-gray-500 dark:text-gray-200 text-gray-900 bg-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              onClick={() => setShowModal(null)}
            >
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
