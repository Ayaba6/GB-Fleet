import React, { useState } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../../components/ui/button.jsx";
import { User, Truck, Fuel, Loader2, X } from "lucide-react";

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

    // ✅ Étape 1 : Vérifier si une journée ouverte existe déjà pour ce chauffeur
   const { data: existing, error: checkError } = await supabase
  .from("journee_chauffeur")
  .select("id")
  .eq("chauffeur_id", chauffeurId)
  .eq("statut", "ouverte");

if (checkError) {
  console.error("Erreur de vérification :", checkError);
  setFormError("Erreur lors de la vérification des journées existantes.");
  setLoading(false);
  return;
}

if (existing && existing.length > 0) {
  setFormError("Ce chauffeur a déjà une journée ouverte. Veuillez la clôturer avant d’en créer une nouvelle.");
  setLoading(false);
  return;
}


    // ✅ Étape 2 : Insérer la nouvelle journée
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
      console.error(error);
      setFormError("Erreur : " + error.message);
    } else {
      setShowModal(false);
      fetchJournees();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={() => setShowModal(false)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b pb-3 dark:border-gray-700">
          <h2 className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            Ouvrir Journée BATICOM
          </h2>
          <Button variant="ghost" onClick={() => setShowModal(false)}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        {formError && (
          <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
            {formError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-gray-700">Chauffeur</label>
            <select
              value={chauffeurId}
              onChange={(e) => setChauffeurId(e.target.value)}
              className="w-full border rounded-lg p-2"
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
            <label className="block mb-1 font-medium text-gray-700">Camion</label>
            <select
              value={camionId}
              onChange={(e) => setCamionId(e.target.value)}
              className="w-full border rounded-lg p-2"
            >
              <option value="">-- Sélectionner --</option>
              {camions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.immatriculation}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-medium text-gray-700">Fuel restant</label>
              <input
                type="number"
                value={fuelRestant}
                onChange={(e) => setFuelRestant(e.target.value)}
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-gray-700">Fuel complément</label>
              <input
                type="number"
                value={fuelComplement}
                onChange={(e) => setFuelComplement(e.target.value)}
                className="w-full border rounded-lg p-2"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
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
