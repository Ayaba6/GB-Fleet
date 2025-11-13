// src/components/modals/OpenDayModalBaticom.jsx
import React, { useState } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../../components/ui/button.jsx";
import { Loader2, X } from "lucide-react";

export default function OpenDayModalBaticom({ setShowModal, fetchJournees, chauffeurs, camions }) {
  const [chauffeurId, setChauffeurId] = useState("");
  const [camionId, setCamionId] = useState("");
  const [fuelRestant, setFuelRestant] = useState("");
  const [fuelComplement, setFuelComplement] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleCreate = async () => {
    setFormError(null);

    if (!chauffeurId || !camionId) {
      setFormError("Veuillez sélectionner un chauffeur et un camion.");
      return;
    }

    setLoading(true);

    // Vérifier si une journée ouverte existe déjà pour ce chauffeur
    const { data: existing, error: checkError } = await supabase
      .from("journee_chauffeur")
      .select("id")
      .eq("chauffeur_id", chauffeurId)
      .eq("statut", "ouverte");

    if (checkError) {
      setFormError("Erreur lors de la vérification des journées existantes.");
      setLoading(false);
      return;
    }

    if (existing?.length > 0) {
      setFormError("Ce chauffeur a déjà une journée ouverte. Veuillez la clôturer avant d’en créer une nouvelle.");
      setLoading(false);
      return;
    }

    // Créer la journée
    const { error } = await supabase.from("journee_chauffeur").insert([
      {
        chauffeur_id: chauffeurId,
        camion_id: camionId,
        fuel_restant: Number(fuelRestant) || 0,
        fuel_complement: Number(fuelComplement) || 0,
        statut: "ouverte",
        structure: "BATICOM",
        date: new Date().toISOString().split("T")[0],
      },
    ]);

    setLoading(false);

    if (error) {
      setFormError("Erreur : " + error.message);
    } else {
      setShowModal(false);
      fetchJournees();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={() => setShowModal(false)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md md:max-w-lg space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
          <h2 className="text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            Ouvrir Journée BATICOM
          </h2>
          <Button variant="ghost" onClick={() => setShowModal(false)}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Erreur */}
        {formError && (
          <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-sm">
            {formError}
          </div>
        )}

        {/* Formulaire */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">Chauffeur</label>
            <select
              value={chauffeurId}
              onChange={(e) => setChauffeurId(e.target.value)}
              className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            >
              <option value="">-- Sélectionner --</option>
              {chauffeurs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">Camion</label>
            <select
              value={camionId}
              onChange={(e) => setCamionId(e.target.value)}
              className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            >
              <option value="">-- Sélectionner --</option>
              {camions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.immatriculation}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">Fuel restant</label>
              <input
                type="number"
                value={fuelRestant}
                onChange={(e) => setFuelRestant(e.target.value)}
                className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">Fuel complément</label>
              <input
                type="number"
                value={fuelComplement}
                onChange={(e) => setFuelComplement(e.target.value)}
                className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
          <Button variant="outline" onClick={() => setShowModal(false)}>
            Annuler
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ouvrir la journée"}
          </Button>
        </div>
      </div>
    </div>
  );
}
