// src/components/modals/DetailsMissionModalGTS.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../ui/button.jsx";
import { Loader2, X } from "lucide-react";

export default function DetailsMissionModalGTS({ mission, setShowModal }) {
  const [chauffeur, setChauffeur] = useState(null);
  const [camion, setCamion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);

      if (mission?.chauffeur_id) {
        const { data: chauffeurData } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", mission.chauffeur_id)
          .single();
        setChauffeur(chauffeurData);
      }

      if (mission?.camion_id) {
        const { data: camionData } = await supabase
          .from("camions")
          .select("immatriculation")
          .eq("id", mission.camion_id)
          .single();
        setCamion(camionData);
      }

      setIsLoading(false);
    };

    if (mission) fetchDetails();
  }, [mission]);

  if (!mission) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={() => setShowModal(null)}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg p-6 text-gray-900 dark:text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b pb-3 border-gray-300 dark:border-gray-700">
          <h2 className="text-xl font-bold">Détails de la mission</h2>
          <button
            onClick={() => setShowModal(null)}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X className="w-6 h-6 text-neutral-900 dark:text-neutral-100" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p><strong>Chauffeur :</strong> {chauffeur?.name || "—"}</p>
            <p><strong>Camion :</strong> {camion?.immatriculation || "—"}</p>
            <p><strong>Date de début :</strong> {mission.date || "—"}</p>
            <p><strong>Date de clôture :</strong> {mission.date_cloture || "—"}</p>
            <p><strong>Tonnage prévu :</strong> {mission.tonnage || 0} T</p>
            <p><strong>Tonnage chargé :</strong> {mission.tonnage_charge || 0} T</p>
            <p><strong>Tonnage déchargé :</strong> {mission.tonnage_decharge || 0} T</p>
            <p><strong>Rapport chargement :</strong> {mission.rapport_charge || "—"}</p>
            <p><strong>Rapport déchargement :</strong> {mission.rapport_decharge || "—"}</p>
            <p><strong>Frais mission :</strong> {mission.frais_mission || 0} FCFA</p>
            <p><strong>Frais fuel :</strong> {mission.frais_fuel || 0} FCFA</p>
            <p><strong>Voyages :</strong> {mission.voyages || 0}</p>
            <p><strong>Statut :</strong> {mission.statut}</p>
            <p><strong>Structure :</strong> {mission.structure}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end mt-6">
          <Button
            onClick={() => setShowModal(null)}
            variant="outline"
            className="
              border-gray-400 dark:border-gray-600
              text-gray-900 dark:text-white
              hover:text-gray-900 dark:hover:text-white
            "
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
