import React, { useState } from "react";
import { Button } from "../ui/button.jsx";
import { useToast } from "../ui/use-toast.jsx";
import { Loader2, X } from "lucide-react";
import { supabase } from "../../config/supabaseClient.js";

const BASE_INPUT =
  "w-full border rounded-lg p-2.5 bg-white text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200";

export default function EditMissionModalGTS({ editingMission, setShowModal, fetchMissions }) {
  const { toast } = useToast();

  const [tonnageDecharge, setTonnageDecharge] = useState(editingMission.tonnage_decharge || 0);
  const [rapportDecharge, setRapportDecharge] = useState(editingMission.rapport_decharge || "");

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates = {
        tonnage_decharge: Number(tonnageDecharge) || 0,
        rapport_decharge: rapportDecharge || null,
      };

      const { error } = await supabase
        .from("missions_gts")
        .update(updates)
        .eq("id", editingMission.id);

      if (error) throw error;

      toast({
        title: "✔ Mise à jour réussie",
        description: "Les données de déchargement ont été enregistrées.",
      });

      fetchMissions();
      setShowModal(null);
    } catch (err) {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4"
      onClick={() => setShowModal(null)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
          <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            Modifier (Admin Ouaga)
          </h2>

          <Button variant="ghost" onClick={() => setShowModal(null)} className="p-1">
            <X className="w-6 h-6 text-gray-500 dark:text-gray-300" />
          </Button>
        </div>

        {/* TONNAGE DECHARGE */}
        <div className="space-y-1">
          <label className="font-medium text-gray-700 dark:text-gray-200">
            Tonnage déchargé (T)
          </label>
          <input
            type="number"
            min="0"
            value={tonnageDecharge}
            onChange={(e) => setTonnageDecharge(e.target.value)}
            className={BASE_INPUT}
          />
        </div>

        {/* RAPPORT DECHARGE */}
        <div className="space-y-1">
          <label className="font-medium text-gray-700 dark:text-gray-200">
            Rapport de déchargement
          </label>
          <textarea
            value={rapportDecharge}
            onChange={(e) => setRapportDecharge(e.target.value)}
            rows={4}
            className={BASE_INPUT}
            placeholder="Notes, anomalies, observation..."
          />
        </div>

        {/* Action */}
        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
          <Button variant="outline" onClick={() => setShowModal(null)}>
            Annuler
          </Button>

          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Mise à jour...
              </span>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
