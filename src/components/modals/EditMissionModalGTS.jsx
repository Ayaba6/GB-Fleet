// src/components/modals/EditMissionModalGTS.jsx
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

    let updates = {};
    if (isChargementPhase) {
      updates = { tonnage_charge: tonnageCharge, rapport_charge: rapportCharge };
    } else {
      updates = {
        tonnage_decharge: tonnageDecharge,
        rapport_decharge: rapportDecharge,
        statut: "Clôturée",
        date_cloture: new Date().toISOString().split("T")[0],
      };
    }

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

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={() => setShowModal(null)}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-2xl font-bold text-indigo-600">
            {isChargementPhase ? "Chargement à Lomé" : "Déchargement à Ouaga"}
          </h2>
          <Button variant="ghost" onClick={() => setShowModal(null)}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        {formError && (
          <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{formError}</div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isChargementPhase && (
            <>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Tonnage chargé (T)</label>
                <input
                  type="number"
                  className="w-full border rounded-lg p-2"
                  value={tonnageCharge}
                  onChange={(e) => setTonnageCharge(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Rapport de chargement</label>
                <textarea
                  className="w-full border rounded-lg p-2"
                  rows={3}
                  value={rapportCharge}
                  onChange={(e) => setRapportCharge(e.target.value)}
                />
              </div>
            </>
          )}

          {!isChargementPhase && (
            <>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Tonnage chargé (T) - Lomé</label>
                <input
                  type="number"
                  className="w-full border rounded-lg p-2 bg-gray-100"
                  value={tonnageCharge}
                  disabled
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Rapport chargement - Lomé</label>
                <textarea
                  className="w-full border rounded-lg p-2 bg-gray-100"
                  rows={3}
                  value={rapportCharge}
                  disabled
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Tonnage déchargé (T)</label>
                <input
                  type="number"
                  className="w-full border rounded-lg p-2"
                  value={tonnageDecharge}
                  onChange={(e) => setTonnageDecharge(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Rapport déchargement</label>
                <textarea
                  className="w-full border rounded-lg p-2"
                  rows={3}
                  value={rapportDecharge}
                  onChange={(e) => setRapportDecharge(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loading}>
              {loading ? "Chargement..." : "Enregistrer"}
            </Button>
            <Button variant="outline" onClick={() => setShowModal(null)}>Annuler</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
