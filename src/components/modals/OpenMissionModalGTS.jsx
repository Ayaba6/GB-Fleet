import React, { useState } from "react";
import { Button } from "../ui/button.jsx";
import { useToast } from "../ui/use-toast.jsx";
import { Loader2, X, Truck, User, DollarSign, Calendar, Briefcase } from "lucide-react";
import { supabase } from "../../config/supabaseClient.js"; // ton vrai import Supabase

const BASE_INPUT_STYLE =
  "w-full border rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors";

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
      const today = new Date().toISOString().split("T")[0];

      const missionPayload = {
        titre,
        chauffeur_id: chauffeurId,
        camion_id: camionId,
        date_depart: dateDepart,
        date: today,             // ✅ colonne obligatoire
        statut: "En cours",
        structure: "GTS",
        frais_mission: Number(fraisMission) || 0,
        frais_fuel: Number(fraisFuel) || 0,
        voyages: 0,
        tonnage: 0,
        tonnage_charge: 0,
        tonnage_decharge: 0,
      };

      const { error: insertError } = await supabase.from("missions_gts").insert([missionPayload]);
      if (insertError) throw insertError;

      // Update statut camion
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

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm"
      onClick={() => setShowModal(false)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
          <h2 className="text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <Briefcase className="w-6 h-6"/> Ouvrir Mission GTS
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
          <div className="space-y-1">
            <label className="block font-medium text-gray-700 dark:text-gray-200">Titre de la mission *</label>
            <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} className={BASE_INPUT_STYLE} placeholder="Ex: Livraison ciment Tanger" required />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <User size={18} className="text-indigo-500"/> Chauffeur *
            </label>
            <select value={chauffeurId} onChange={(e) => setChauffeurId(e.target.value)} className={BASE_INPUT_STYLE} required>
              <option value="">-- Sélectionner un chauffeur GTS --</option>
              {gtsChauffeurs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

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

          <div className="space-y-1">
            <label className="block font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-500"/> Date de départ *
            </label>
            <input type="date" value={dateDepart} onChange={(e) => setDateDepart(e.target.value)} className={BASE_INPUT_STYLE} required />
          </div>

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

        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
          <Button type="button" onClick={() => setShowModal(false)} variant="outline">Annuler</Button>
          <Button type="button" onClick={handleCreate} disabled={loading}>
            {loading ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16}/> Enregistrement...</span> : "Créer la mission"}
          </Button>
        </div>
      </div>
    </div>
  );
}
