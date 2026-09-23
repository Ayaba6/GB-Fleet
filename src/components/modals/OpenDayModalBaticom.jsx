import React, { useState } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../../components/ui/button.jsx";
import { useToast } from "../../components/ui/use-toast.jsx";
import { Loader2, X, Truck, User, Fuel } from "lucide-react";

const BASE_INPUT_STYLE =
  "w-full border rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm md:text-base";

export default function OpenDayModalBaticom({
  setShowModal,
  fetchJournees,
  chauffeurs = [],
  camions = [],
}) {
  const { toast } = useToast();
  const [chauffeurId, setChauffeurId] = useState("");
  const [camionId, setCamionId] = useState("");
  const [fuelRestant, setFuelRestant] = useState("");
  const [fuelComplement, setFuelComplement] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const baticomCamions = camions.filter(
    (c) => c.structure === "BATICOM" && c.statut === "Disponible"
  );
  const baticomChauffeurs = chauffeurs.filter((c) => c.structure === "BATICOM");

  const handleCreate = async () => {
    setFormError(null);
    if (!chauffeurId || !camionId) {
      setFormError("Veuillez sélectionner un chauffeur et un camion.");
      return;
    }
    setLoading(true);

    try {
      const { data: existing, error: checkError } = await supabase
        .from("journee_baticom")
        .select("id")
        .match({ chauffeur_id: chauffeurId, statut: "affectée" });

      if (checkError) throw new Error(checkError.message);
      if (existing?.length > 0) {
        setFormError("Ce chauffeur a déjà une journée affectée. Veuillez la clôturer.");
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("journee_baticom").insert([
        {
          chauffeur_id: chauffeurId,
          camion_id: camionId,
          fuel_restant: Number(fuelRestant) || 0,
          fuel_complement: Number(fuelComplement) || 0,
          statut: "affectée",
          structure: "BATICOM",
          date: new Date().toISOString().split("T")[0],
        },
      ]);

      if (insertError) throw insertError;

      await supabase.from("camions").update({ statut: "En mission" }).eq("id", camionId);

      toast({ title: "🎉 Journée Affectée", description: "Succès !" });
      setShowModal(false);
      fetchJournees();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-2 md:p-4 backdrop-blur-sm"
      onClick={() => setShowModal(false)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[95%] max-w-lg flex flex-col max-h-[90vh] overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER - Fixe */}
        <div className="flex justify-between items-center border-b dark:border-gray-700 p-4 md:p-6">
          <h2 className="text-lg md:text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <User className="w-5 h-5 md:w-6 md:h-6" /> <span className="truncate">Ouvrir Journée BATICOM</span>
          </h2>
          <button
            onClick={() => setShowModal(false)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* CONTENT - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {formError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs md:text-sm border border-red-200 dark:border-red-800">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            {/* Chauffeur */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <User size={16} className="text-indigo-500" /> Chauffeur
              </label>
              <select
                value={chauffeurId}
                onChange={(e) => setChauffeurId(e.target.value)}
                className={BASE_INPUT_STYLE}
              >
                <option value="">Sélectionner chauffeur...</option>
                {baticomChauffeurs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Camion */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <Truck size={16} className="text-indigo-500" /> Camion
              </label>
              <select
                value={camionId}
                onChange={(e) => setCamionId(e.target.value)}
                className={BASE_INPUT_STYLE}
              >
                <option value="">Sélectionner camion...</option>
                {baticomCamions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.immatriculation} ({c.marquemodele})
                  </option>
                ))}
              </select>
            </div>

            {/* Fuel - Grid responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <Fuel size={16} className="text-green-500" /> Fuel restant (L)
                </label>
                <input
                  type="number"
                  value={fuelRestant}
                  onChange={(e) => setFuelRestant(e.target.value)}
                  className={BASE_INPUT_STYLE}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <Fuel size={16} className="text-yellow-500" /> Fuel complément (L)
                </label>
                <input
                  type="number"
                  value={fuelComplement}
                  onChange={(e) => setFuelComplement(e.target.value)}
                  className={BASE_INPUT_STYLE}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER - Fixe */}
        <div className="p-4 md:p-6 border-t dark:border-gray-700 flex flex-col-reverse sm:flex-row gap-3 bg-gray-50 dark:bg-gray-800/50">
          <Button
            variant="outline"
            onClick={() => setShowModal(false)}
            className="w-full sm:w-auto dark:text-white"
          >
            Annuler
          </Button>
          <Button
            className="w-full sm:flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleCreate}
            disabled={loading || !chauffeurId || !camionId}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Ouvrir la journée"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}