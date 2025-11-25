// src/components/HistoriqueGTS.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../config/supabaseClient.js";
import DetailsMissionModalGTS from "./modals/DetailsMissionModalGTS.jsx";
import { Button } from "./ui/button.jsx";
import { Loader2 } from "lucide-react";

export default function HistoriqueGTS({ chauffeurId }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState(null);

  const fetchHistorique = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("missions_gts")
        .select("*")
        .eq("chauffeur_id", chauffeurId)
        .neq("statut", "Affectée") // récupérer missions en cours ou terminées
        .order("date", { ascending: false });

      if (error) throw error;
      setMissions(data || []);
    } catch (err) {
      console.error("Erreur récupération historique:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chauffeurId) fetchHistorique();
  }, [chauffeurId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="animate-spin mr-2" />
        <span>Chargement...</span>
      </div>
    );
  }

  if (missions.length === 0) {
    return <p className="text-gray-500 text-center py-4">Aucune mission terminée pour le moment.</p>;
  }

  return (
    <div className="space-y-4">
      {missions.map((mission) => (
        <div key={mission.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex justify-between items-center">
          <div>
            <p className="font-bold text-gray-800 dark:text-gray-100">{mission.titre}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {mission.depart} → {mission.destination}
            </p>
          </div>
          <Button size="sm" onClick={() => setSelectedMission(mission)}>
            Détails
          </Button>
        </div>
      ))}

      {selectedMission && (
        <DetailsMissionModalGTS
          mission={selectedMission}
          setShowModal={setSelectedMission}
        />
      )}
    </div>
  );
}
