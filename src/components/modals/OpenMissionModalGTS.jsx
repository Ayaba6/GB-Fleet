import React, { useState } from "react";
import { Button } from "../ui/button.jsx";
import { useToast } from "../ui/use-toast.jsx";
import { Loader2, X, Truck, User, DollarSign, Calendar, Briefcase } from "lucide-react";

// --- MOCK SUPABASE POUR COMPILATION ---
const supabase = {
  from: (table) => ({
    insert: (payload) => ({ error: null }),
    update: (payload) => ({ eq: (field, value) => ({ error: null }) }),
  }),
};
// -------------------------------------

const BASE_INPUT_STYLE = "w-full border rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors";

export default function OpenMissionModalGTS({ setShowModal, fetchMissions, chauffeurs = [], camions = [] }) {
  const { toast } = useToast();
  const [titre, setTitre] = useState("");
  const [chauffeurId, setChauffeurId] = useState("");
  const [camionId, setCamionId] = useState("");
  const [fraisMission, setFraisMission] = useState(0);
  const [fraisFuel, setFraisFuel] = useState(0);
  const [dateDepart, setDateDepart] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const gtsCamions = camions.filter(c => c.structure === "GTS" && c.statut === "Disponible");
  const gtsChauffeurs = chauffeurs.filter(c => c.structure === "GTS");

  const handleCreate = async () => {
    setFormError(null);
    if (!titre || !chauffeurId || !camionId || !dateDepart) {
      setFormError("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }

    setLoading(true);
    try {
      // 1. Créer la mission
      const missionPayload = {
        titre,
        chauffeur_id: chauffeurId,
        camion_id: camionId,
        frais_mission: Number(fraisMission) || 0,
        frais_fuel: Number(fraisFuel) || 0,
        date_depart: dateDepart,
        statut: "En cours",
        structure: "GTS",
      };

      const { error: insertError } = await supabase.from("missions_gts").insert([missionPayload]);
      if (insertError) throw insertError;

      // 2. Mettre à jour le statut du camion
      const { error: updateCamionError } = await supabase.from("camions").update({ statut: "En mission" }).eq("id", camionId);
      if (updateCamionError) {
        toast({ title: "Alerte", description: "Mission ouverte mais le statut du camion n'a pas été mis à jour.", variant: "warning" });
      }

      toast({ title: "🚀 Mission Démarrée", description: `La mission '${titre}' a été ouverte pour GTS.` });
      setShowModal(false);
      fetchMissions();
    } catch (error) {
      setFormError(error.message);
      toast({ title: "❌ Erreur Critique", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = titre && chauffeurId && camionId && dateDepart;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm"
      onClick={() => setShowModal(false)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-6 transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
          <h2 className="text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <Briefcase className="w-6 h-6"/> Ouvrir Mission GTS
          </h2>
          <Button
            variant="ghost"
            onClick={() => setShowModal(false)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </Button>
        </div>

        {/* Erreur */}
        {formError && (
          <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-300 dark:border-red-700">
            {formError}
          </div>
        )}

        {/* Formulaire */}
        <div className="flex flex-col gap-5">
          {/* Titre */}
          <div className="space-y-1">
            <label className="block font-medium text-gray-700 dark:text-gray-200">Titre de la mission *</label>
            <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} className={BASE_INPUT_STYLE} placeholder="Ex: Livraison ciment Tanger" required />
          </div>

          {/* Chauffeur */}
          <div className="space-y-1">
            <label className="block font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <User size={18} className="text-indigo-500"/> Chauffeur *
            </label>
            <select value={chauffeurId} onChange={(e) => setChauffeurId(e.target.value)} className={BASE_INPUT_STYLE} required>
              <option value="">-- Sélectionner un chauffeur GTS --</option>
              {gtsChauffeurs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Camion */}
          <div className="space-y-1">
            <label className="block font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Truck size={18} className="text-indigo-500"/> Camion *
            </label>
            <select value={camionId} onChange={(e) => setCamionId(e.target.value)} className={BASE_INPUT_STYLE} required>
              <option value="">-- Sélectionner un camion GTS disponible --</option>
              {gtsCamions.map(c => <option key={c.id} value={c.id}>{c.immatriculation} ({c.marquemodele})</option>)}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Seuls les camions GTS avec le statut 'Disponible' sont affichés.
            </p>
          </div>

          {/* Date de départ */}
          <div className="space-y-1">
            <label className="block font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-500"/> Date de départ *
            </label>
            <input type="date" value={dateDepart} onChange={(e) => setDateDepart(e.target.value)} className={BASE_INPUT_STYLE} required />
          </div>

          {/* Frais mission/fuel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t dark:border-gray-700">
            <div className="space-y-1">
              <label className="block font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <DollarSign size={18} className="text-green-500"/> Frais mission (DH)
              </label>
              <input type="number" value={fraisMission} onChange={(e) => setFraisMission(e.target.value)} className={BASE_INPUT_STYLE} min="0" placeholder="0" />
            </div>
            <div className="space-y-1">
              <label className="block font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <DollarSign size={18} className="text-red-500"/> Frais fuel (DH)
              </label>
              <input type="number" value={fraisFuel} onChange={(e) => setFraisFuel(e.target.value)} className={BASE_INPUT_STYLE} min="0" placeholder="0" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
          <Button
            type="button"
            onClick={() => setShowModal(false)}
            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-black dark:text-white border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg"
          >
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !isFormValid}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2 rounded-lg"
          >
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ouverture en cours...</> : "Ouvrir la mission"}
          </Button>
        </div>
      </div>
    </div>
  );
}
