import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../ui/button.jsx";
import { useToast } from "../ui/use-toast.jsx";
import { Loader2, X, Truck, User, Calendar, Briefcase } from "lucide-react";

const BASE_INPUT_STYLE =
  "w-full border rounded-lg p-2.5 bg-white text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors";

// --- Composant DateRangePicker simplifié ---
const DateRangePicker = ({ startDate, setStartDate, endDate, setEndDate }) => (
  <div className="flex space-x-2 items-center text-sm text-gray-700 dark:text-gray-300">
    <Calendar size={18} className="text-blue-500" />
    <span className="font-semibold">Période:</span>
    <input
      type="date"
      value={startDate ? startDate.toISOString().split("T")[0] : ""}
      onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
      className="p-1 border rounded text-gray-900 dark:text-gray-900"
    />
    <span>à</span>
    <input
      type="date"
      value={endDate ? endDate.toISOString().split("T")[0] : ""}
      onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
      className="p-1 border rounded text-gray-900 dark:text-gray-900"
    />
  </div>
);

export default function OpenMissionModalGTS({ setShowModal, fetchMissions }) {
  const { toast } = useToast();

  // Formulaire
  const [titre, setTitre] = useState("");
  const [chauffeurId, setChauffeurId] = useState("");
  const [camionId, setCamionId] = useState("");
  const [fraisMission, setFraisMission] = useState(0);
  const [fraisFuel, setFraisFuel] = useState(0);
  const [dateDepart, setDateDepart] = useState(new Date().toISOString().split("T")[0]);
  const [formError, setFormError] = useState(null);

  // Données chauffeurs / camions
  const [chauffeurs, setChauffeurs] = useState([]);
  const [camions, setCamions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const STRUCTURE = "GTS";

  // Fetch chauffeurs et camions
  const fetchData = async () => {
    setLoadingData(true);
    try {
      // Chauffeurs GTS
      const { data: chauffeursData, error: chauffeursError } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("role", "chauffeur")
        .eq("structure", STRUCTURE);
      if (chauffeursError) throw chauffeursError;
      setChauffeurs(chauffeursData || []);

      // Camions GTS disponibles
      const { data: camionsData, error: camionsError } = await supabase
        .from("camions")
        .select("id, immatriculation, marquemodele")
        .eq("structure", STRUCTURE)
        .eq("statut", "Disponible");
      if (camionsError) throw camionsError;
      setCamions(camionsData || []);
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    setFormError(null);

    if (!titre || !chauffeurId || !camionId || !dateDepart) {
      setFormError("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }

    setLoadingSubmit(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const missionPayload = {
        titre,
        chauffeur_id: chauffeurId,
        camion_id: camionId,
        date_depart: dateDepart,
        date: today,
        statut: "Affectée",
        structure: STRUCTURE,
        frais_mission: Number(fraisMission) || 0,
        frais_fuel: Number(fraisFuel) || 0,
      };

      const { error: insertError } = await supabase.from("missions_gts").insert([missionPayload]);
      if (insertError) throw insertError;

      // Mettre camion en mission
      const { error: updateCamionError } = await supabase
        .from("camions")
        .update({ statut: "En mission" })
        .eq("id", camionId);

      if (updateCamionError) {
        toast({
          title: "Alerte",
          description: "Mission créée mais le statut du camion n’a pas pu être mis à jour.",
          variant: "warning",
        });
      }

      toast({ title: "🎉 Mission Affectée", description: `La mission '${titre}' a été créée.` });
      setShowModal(false);
      fetchMissions();
    } catch (err) {
      setFormError(err.message);
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm"
      onClick={() => setShowModal(false)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-6 relative z-[10000]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
          <h2 className="text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <Briefcase className="w-6 h-6" /> Ouvrir Mission GTS
          </h2>
          <Button variant="ghost" onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </Button>
        </div>

        {formError && (
          <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-300 dark:border-red-700">
            {formError}
          </div>
        )}

        <div className="flex flex-col gap-5">
          {/* Titre */}
          <div className="space-y-1">
            <label className="block font-medium text-gray-700 dark:text-gray-200">Titre de la mission *</label>
            <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} className={BASE_INPUT_STYLE} placeholder="Ex: Livraison ciment Tanger" />
          </div>

          {/* Chauffeur */}
          <div className="space-y-1">
            <label className="block font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <User size={18} className="text-indigo-500" /> Chauffeur *
            </label>
            <select value={chauffeurId} onChange={(e) => setChauffeurId(e.target.value)} className={BASE_INPUT_STYLE}>
              <option value="">-- Sélectionner un chauffeur GTS --</option>
              {chauffeurs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Camion */}
          <div className="space-y-1">
            <label className="block font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Truck size={18} className="text-indigo-500" /> Camion *
            </label>
            <select value={camionId} onChange={(e) => setCamionId(e.target.value)} className={BASE_INPUT_STYLE}>
              <option value="">-- Sélectionner un camion GTS disponible --</option>
              {camions.map((c) => (
                <option key={c.id} value={c.id}>{c.immatriculation} ({c.marquemodele})</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="block font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-500" /> Date de départ *
            </label>
            <input type="date" value={dateDepart} onChange={(e) => setDateDepart(e.target.value)} className={BASE_INPUT_STYLE} />
          </div>

          {/* Frais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t dark:border-gray-700">
            <div className="space-y-1">
              <label className="block font-medium text-gray-700 dark:text-gray-200">Frais mission (FCFA)</label>
              <input type="number" value={fraisMission} onChange={(e) => setFraisMission(e.target.value)} className={BASE_INPUT_STYLE} min="0" />
            </div>
            <div className="space-y-1">
              <label className="block font-medium text-gray-700 dark:text-gray-200">Frais fuel (FCFA)</label>
              <input type="number" value={fraisFuel} onChange={(e) => setFraisFuel(e.target.value)} className={BASE_INPUT_STYLE} min="0" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
          <Button onClick={() => setShowModal(false)} variant="outline">Annuler</Button>
          <Button onClick={handleCreate} disabled={loadingSubmit}>
            {loadingSubmit ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Enregistrement...</span> : "Créer la mission"}
          </Button>
        </div>
      </div>
    </div>
  );
}
