import React, { useEffect, useState } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Button } from "../components/ui/button.jsx";
import DetailsMissionModalGTS from "../components/modals/DetailsMissionModalGTS.jsx";
import { useToast } from "../components/ui/use-toast.jsx";
import { AlertTriangle, Loader2 } from "lucide-react";
import IncidentModalGTS from "../components/modals/IncidentModalGTS.jsx";

export default function ChauffeurDashboardGTS({ session }) {
  const { toast } = useToast();
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);

  const fetchMission = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("missions_gts")
      .select(
        `*, 
         profiles:chauffeur_id (name),
         camions:camion_id (immatriculation)`
      )
      .eq("chauffeur_id", session.user.id)
      .in("statut", ["Attribuée", "En route pour Lomé", "Arrivé à Lomé", "En retour vers Ouaga", "Arrivé à Ouaga", "En cours"])
      .order("date", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error(error);
      toast({ title: "Erreur", description: "Impossible de charger la mission.", variant: "destructive" });
    } else {
      setMission(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session?.user?.id) fetchMission();
  }, [session]);

  const updateStatut = async (newStatut) => {
    const updates = { statut: newStatut };
    if (newStatut === "En route pour Lomé") {
      updates.date_depart = new Date().toISOString().split("T")[0];
    }
    if (newStatut === "Arrivé à Ouaga") {
      updates.date_cloture = new Date().toISOString().split("T")[0];
    }

    const { error } = await supabase
      .from("missions_gts")
      .update(updates)
      .eq("id", mission.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: `Statut mis à jour : ${newStatut}` });
      fetchMission();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-10 w-10 text-gray-500" />
        <p className="text-gray-500 mt-3">Chargement de la mission...</p>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertTriangle className="text-gray-400 h-12 w-12" />
        <h2 className="text-lg font-semibold mt-4">Aucune mission en cours</h2>
        <p className="text-gray-500">Aucune mission ne vous a encore été attribuée.</p>
      </div>
    );
  }

  const actions = [];
  if (mission.statut === "Attribuée") {
    actions.push({
      label: "Démarrer la mission",
      onClick: () => updateStatut("En route pour Lomé"),
      color: "bg-green-600 hover:bg-green-700",
    });
  } else if (mission.statut === "En route pour Lomé") {
    actions.push({
      label: "Signaler arrivée à Lomé",
      onClick: () => updateStatut("Arrivé à Lomé"),
      color: "bg-blue-600 hover:bg-blue-700",
    });
  } else if (mission.statut === "Arrivé à Lomé") {
    actions.push({
      label: "Départ retour vers Ouaga",
      onClick: () => updateStatut("En retour vers Ouaga"),
      color: "bg-orange-600 hover:bg-orange-700",
    });
  } else if (mission.statut === "En retour vers Ouaga") {
    actions.push({
      label: "Signaler arrivée à Ouaga",
      onClick: () => updateStatut("Arrivé à Ouaga"),
      color: "bg-purple-600 hover:bg-purple-700",
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">🚛 Tableau de bord chauffeur GTS</h1>

        <div className="border rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">{mission.titre || "Mission sans titre"}</h2>
          <p><strong>Destination :</strong> {mission.destination || "—"}</p>
          <p><strong>Statut actuel :</strong> <span className="text-blue-600 font-medium">{mission.statut}</span></p>
          <p><strong>Tonnage prévu :</strong> {mission.tonnage} T</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setShowDetails(true)} className="bg-gray-700 hover:bg-gray-800">
            Voir les détails
          </Button>

          {actions.map((a, i) => (
            <Button key={i} onClick={a.onClick} className={a.color}>
              {a.label}
            </Button>
          ))}

          <Button onClick={() => setShowIncidentModal(true)} variant="destructive">
            Signaler un incident
          </Button>
        </div>
      </div>

      {showDetails && (
        <DetailsMissionModalGTS
          mission={{
            ...mission,
            chauffeur_nom: mission.profiles?.name,
            camion_nom: mission.camions?.immatriculation,
          }}
          onClose={() => setShowDetails(false)}
        />
      )}

      {showIncidentModal && (
        <IncidentModalGTS
          missionId={mission.id}
          chauffeurId={session.user.id}
          onClose={() => setShowIncidentModal(false)}
        />
      )}
    </div>
  );
}
