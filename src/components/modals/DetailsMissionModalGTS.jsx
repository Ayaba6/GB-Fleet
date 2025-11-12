import React, { useEffect, useState } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../ui/button.jsx";
import { Loader2 } from "lucide-react";

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-center">Détails de la mission</h2>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="animate-spin text-blue-500" size={28} />
          </div>
        ) : (
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Chauffeur :</strong> {chauffeur?.name || "—"}</p>
            <p><strong>Camion :</strong> {camion?.immatriculation || "—"}</p>
            <p><strong>Date :</strong> {mission.date || "—"}</p>
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

        <div className="flex justify-end mt-6">
          <Button onClick={() => setShowModal(null)} variant="outline">
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
