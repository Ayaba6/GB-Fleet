// src/components/EditDayModalBaticom.js
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../ui/button.jsx";
import {
  Plus, X, Fuel, Ship, Weight, Save, Loader2, AlertTriangle, Pencil
} from "lucide-react";

export default function EditDayModalBaticom({ editingJournee, setShowModal, fetchJournees }) {
  const [addedFuel, setAddedFuel] = useState("");
  const [voyages, setVoyages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isClosed = editingJournee?.statut === "clôturée";

  /** 🔹 Récupération des voyages liés à la journée */
  const fetchVoyages = useCallback(async (journeeId) => {
    setFormError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("journee_voyages")
        .select("id, voyage_num, tonnage")
        .eq("journee_id", journeeId)
        .order("voyage_num", { ascending: true });

      if (error) throw error;
      setVoyages(data || []);
    } catch (err) {
      console.error("Erreur de récupération des voyages:", err.message);
      setFormError(`Erreur de chargement des voyages: ${err.message}`);
      setVoyages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!editingJournee) return;
    fetchVoyages(editingJournee.id);
    setAddedFuel("");
    setFormError(null);
  }, [editingJournee, fetchVoyages]);

  if (!editingJournee) return null;

  /** 🔹 Ajouter un voyage */
  const handleAddVoyage = () => {
    if (isClosed) return;
    setVoyages((prev) => [
      ...prev,
      { voyage_num: prev.length + 1, tonnage: 0 },
    ]);
  };

  /** 🔹 Supprimer un voyage */
  const handleRemoveVoyage = (index) => {
    if (isClosed) return;
    const newVoyages = voyages
      .filter((_, i) => i !== index)
      .map((v, i) => ({ ...v, voyage_num: i + 1 }));
    setVoyages(newVoyages);
  };

  /** 🔹 Modifier le tonnage d’un voyage */
  const handleTonnageChange = (index, value) => {
    if (isClosed) return;
    const newVoyages = [...voyages];
    const tonnage = Math.max(0, parseFloat(value) || 0);
    newVoyages[index].tonnage = tonnage;
    setVoyages(newVoyages);
  };

  /** 🔹 Sauvegarde des modifications */
  const handleSave = async (e) => {
    e.preventDefault();
    if (isClosed) return;

    const invalidVoyage = voyages.some((v) => v.tonnage <= 0);
    if (invalidVoyage && voyages.length > 0) {
      setFormError("Tous les voyages doivent avoir un tonnage supérieur à 0.");
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      const fuelToAdd = parseFloat(addedFuel) || 0;
      const currentComplement = parseFloat(editingJournee.fuel_complement) || 0;
      const newFuelComplement = currentComplement + fuelToAdd;

      if (fuelToAdd > 0) {
        const { error: fuelError } = await supabase
          .from("journee_chauffeur")
          .update({ fuel_complement: newFuelComplement })
          .eq("id", editingJournee.id);
        if (fuelError) throw fuelError;
      }

      const voyagesToUpsert = voyages.map((v) => ({
        journee_id: editingJournee.id,
        voyage_num: v.voyage_num,
        tonnage: v.tonnage,
      }));

      if (voyagesToUpsert.length > 0) {
        const { error: voyageError } = await supabase
          .from("journee_voyages")
          .upsert(voyagesToUpsert, {
            onConflict: ["journee_id", "voyage_num"],
          });
        if (voyageError) throw voyageError;
      }

      const totalVoyages = voyages.length;
      const totalTonnage = voyages.reduce((sum, v) => sum + v.tonnage, 0);

      const { error: updateError } = await supabase
        .from("journee_chauffeur")
        .update({
          voyages: totalVoyages,
          tonnage: totalTonnage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingJournee.id);
      if (updateError) throw updateError;

      await fetchJournees();
      setShowModal(null);
    } catch (err) {
      console.error("Erreur mise à jour :", err.message);
      setFormError(`Erreur lors de l'enregistrement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /** 🔹 Clôture d'une journée */
  const handleCloseDay = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("journee_chauffeur")
        .update({ statut: "clôturée" })
        .eq("id", editingJournee.id);
      if (error) throw error;

      await fetchJournees();
      setShowModal(null);
    } catch (err) {
      setFormError(`Erreur lors de la clôture : ${err.message}`);
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  /** 🔹 Confirmation de clôture */
  const ConfirmModal = ({ onConfirm, onCancel, title, message }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm space-y-4">
        <h4 className="text-xl font-bold text-red-600 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" /> {title}
        </h4>
        <p className="text-gray-700 dark:text-gray-300">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={onConfirm}>
            Confirmer
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={() => setShowModal(null)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- En-tête --- */}
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            {isClosed ? (
              <>Journée <span className="ml-1 text-gray-500">(Clôturée)</span></>
            ) : (
              <>
                <Pencil className="w-5 h-5 mr-2 text-indigo-500" /> Modifier Journée #{editingJournee.id}
              </>
            )}
          </h3>
          <Button variant="ghost" onClick={() => setShowModal(null)}>
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>

        {formError && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
            {formError}
          </div>
        )}

        {/* --- FORMULAIRE PRINCIPAL --- */}
        <form onSubmit={handleSave} className="space-y-5">
          {/* --- Carburant --- */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h4 className="font-semibold text-lg text-indigo-700 flex items-center mb-2">
              <Fuel className="w-5 h-5 mr-2" /> Carburant
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Initial</p>
                <p className="font-bold">{editingJournee.fuel_restant ?? 0} L</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Complément</p>
                <p className="font-bold">{editingJournee.fuel_complement ?? 0} L</p>
              </div>
            </div>
            {!isClosed && (
              <div className="mt-3 border-t pt-3">
                <label className="block text-sm text-gray-700 mb-1">
                  Ajouter du carburant
                </label>
                <input
                  type="number"
                  min="0"
                  value={addedFuel}
                  onChange={(e) => setAddedFuel(e.target.value)}
                  placeholder="Litres à ajouter..."
                  className="border w-full rounded-lg px-3 py-2"
                />
              </div>
            )}
          </div>

          {/* --- Voyages --- */}
          <div>
            <h4 className="font-semibold text-lg text-indigo-700 flex items-center mb-2">
              <Ship className="w-5 h-5 mr-2" /> Voyages ({voyages.length})
            </h4>
            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {voyages.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 border rounded-lg bg-white dark:bg-gray-900"
                >
                  <span className="font-semibold text-gray-700 w-20">
                    #{v.voyage_num}
                  </span>
                  {!isClosed ? (
                    <input
                      type="number"
                      value={v.tonnage}
                      onChange={(e) =>
                        handleTonnageChange(i, e.target.value)
                      }
                      min="0"
                      className="border rounded-lg w-24 px-2 py-1 text-center"
                    />
                  ) : (
                    <span className="font-bold">{v.tonnage} t</span>
                  )}
                  {!isClosed && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleRemoveVoyage(i)}
                      className="text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {!isClosed && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAddVoyage}
                className="mt-3 text-indigo-600 border-indigo-300"
              >
                <Plus className="w-4 h-4 mr-2" /> Ajouter un voyage
              </Button>
            )}
          </div>

          {/* --- Boutons d'action --- */}
          <div className="flex justify-between border-t pt-3">
            {isClosed ? (
              <Button onClick={() => setShowModal(null)}>Fermer</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowModal(null)}>
                  Annuler
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    onClick={() => setShowConfirmModal(true)}
                  >
                    Clôturer
                  </Button>
                  <Button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enregistrement...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Save className="w-4 h-4 mr-2" /> Enregistrer
                      </span>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>

      {/* --- Modale de confirmation de clôture --- */}
      {showConfirmModal && (
        <ConfirmModal
          title="Clôturer la journée"
          message={`Voulez-vous vraiment clôturer la journée #${editingJournee.id} ? Cette action est irréversible.`}
          onConfirm={handleCloseDay}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}
