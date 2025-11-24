import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../ui/button.jsx";
import {
  Plus, X, Fuel, Ship, Save, Loader2, AlertTriangle, Pencil, Lock, Weight
} from "lucide-react";

// Modal de confirmation
const ConfirmCloseModal = ({ onConfirm, onCancel, title, message }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm space-y-4 border border-red-300 dark:border-red-700">
      <h4 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center">
        <AlertTriangle className="w-6 h-6 mr-2" /> {title}
      </h4>
      <p className="text-gray-700 dark:text-gray-300">{message}</p>
      <div className="flex justify-end gap-3">
        <Button
          className="bg-muted text-foreground hover:bg-muted/70"
          onClick={onCancel}
        >
          Annuler
        </Button>
        <Button
          className="bg-red-600 hover:bg-red-700 text-white"
          onClick={onConfirm}
        >
          <Lock className="w-4 h-4 mr-2" /> Confirmer la Clôture
        </Button>
      </div>
    </div>
  </div>
);

export default function EditDayModalBaticom({ editingJournee, setShowModal, fetchJournees }) {
  const [addedFuel, setAddedFuel] = useState("");
  const [voyages, setVoyages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isClosed = editingJournee?.statut === "clôturée";

  // Fetch voyages
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

  const handleAddVoyage = () => {
    if (isClosed) return;
    setVoyages(prev => [...prev, { voyage_num: prev.length + 1, tonnage: 0 }]);
  };

  const handleRemoveVoyage = (index) => {
    if (isClosed) return;
    setVoyages(voyages.filter((_, i) => i !== index).map((v, i) => ({ ...v, voyage_num: i + 1 })));
  };

  const handleTonnageChange = (index, value) => {
    if (isClosed) return;
    const newVoyages = [...voyages];
    newVoyages[index].tonnage = Math.max(0, parseFloat(value) || 0);
    setVoyages(newVoyages);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isClosed) return;

    const tonnageSum = voyages.reduce((sum, v) => sum + v.tonnage, 0);
    if (voyages.length > 0 && tonnageSum <= 0) {
      setFormError("Veuillez saisir un tonnage valide (> 0).");
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
          .from("journee_baticom")
          .update({ fuel_complement: newFuelComplement })
          .eq("id", editingJournee.id);
        if (fuelError) throw fuelError;
      }

      for (const v of voyages) {
        if (!v.id) {
          const { error: insertError } = await supabase
            .from("journee_voyages")
            .insert({ journee_id: editingJournee.id, voyage_num: v.voyage_num, tonnage: v.tonnage });
          if (insertError) throw insertError;
        } else {
          const { error: updateError } = await supabase
            .from("journee_voyages")
            .update({ tonnage: v.tonnage })
            .eq("id", v.id);
          if (updateError) throw updateError;
        }
      }

      const { error: updateTotalsError } = await supabase
        .from("journee_baticom")
        .update({ voyages: voyages.length, tonnage: tonnageSum, updated_at: new Date().toISOString() })
        .eq("id", editingJournee.id);
      if (updateTotalsError) throw updateTotalsError;

      await fetchJournees();
      setShowModal(null);
    } catch (err) {
      setFormError(`Erreur lors de l'enregistrement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDay = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("journee_baticom")
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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => !loading && setShowModal(null)}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-lg space-y-5" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            {isClosed ? (
              <>
                <Lock className="w-5 h-5 mr-2 text-gray-500" />
                Journée <span className="ml-1 text-red-500">(Clôturée)</span>
              </>
            ) : (
              <>
                <Pencil className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                Modifier Journée #{editingJournee.id}
              </>
            )}
          </h3>
          <Button variant="ghost" onClick={() => setShowModal(null)} className="hover:bg-muted/70 p-2 rounded-full">
            <X className="w-5 h-5 text-foreground" />
          </Button>
        </div>

        {/* ERROR */}
        {formError && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {formError}
          </div>
        )}

        {/* LOADING */}
        {loading && !formError && (
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Chargement...
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* FUEL BLOCK */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
            <h4 className="font-semibold text-lg text-blue-700 dark:text-blue-400 flex items-center mb-3">
              <Fuel className="w-5 h-5 mr-2" /> Carburant
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm font-medium">
              <div className="text-gray-900 dark:text-gray-200">
                <p className="text-xs">Initial</p>
                <p className="font-bold">{editingJournee.fuel_restant ?? 0} L</p>
              </div>
              <div className="text-gray-900 dark:text-gray-200">
                <p className="text-xs">Complément</p>
                <p className="font-bold">{editingJournee.fuel_complement ?? 0} L</p>
              </div>
              <div className="text-gray-900 dark:text-gray-200">
                <p className="text-xs">Total</p>
                <p className="font-bold">
                  {((editingJournee.fuel_restant || 0) + (editingJournee.fuel_complement || 0)).toFixed(1)} L
                </p>
              </div>
            </div>
            {!isClosed && (
              <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">Ajouter carburant (L)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={addedFuel}
                  onChange={(e) => setAddedFuel(e.target.value)}
                  placeholder="0.0"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* VOYAGES */}
          <div className="space-y-3">
            <h4 className="font-semibold text-lg text-blue-700 dark:text-blue-400 flex items-center mb-2">
              <Ship className="w-5 h-5 mr-2" /> Voyages ({voyages.length})
            </h4>
            <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
              {voyages.length === 0 && !isClosed ? (
                <div className="text-center text-gray-500 dark:text-gray-400 p-4 border border-dashed rounded-lg">
                  Aucun voyage. Cliquez sur "Ajouter".
                </div>
              ) : (
                voyages.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <span className="font-bold text-gray-900 dark:text-gray-200 w-20">#{v.voyage_num}</span>
                    <div className="flex items-center flex-grow">
                      <Weight className="w-4 h-4 mr-2 text-indigo-500" />
                      {!isClosed ? (
                        <input
                          type="number"
                          value={v.tonnage}
                          onChange={(e) => handleTonnageChange(i, e.target.value)}
                          min="0"
                          step="0.1"
                          className="border rounded-lg w-full px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 text-center"
                        />
                      ) : (
                        <span className="font-bold text-gray-900 dark:text-gray-200">{v.tonnage} t</span>
                      )}
                    </div>
                    {!isClosed && (
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveVoyage(i)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40">
                        <X className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>

            {!isClosed && (
              <Button type="button" className="bg-muted text-foreground hover:bg-muted/70 w-full" onClick={handleAddVoyage} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" /> Ajouter un voyage
              </Button>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
            <Button className="bg-muted text-foreground hover:bg-muted/70" onClick={() => setShowModal(null)}>
              {isClosed ? "Fermer" : "Annuler"}
            </Button>
            {!isClosed && (
              <div className="flex gap-3">
                <Button type="button" className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2" onClick={() => setShowConfirmModal(true)}>
                  <Lock className="w-4 h-4" /> Clôturer
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600" disabled={loading}>
                  {loading ? <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</span> :
                  <span className="flex items-center"><Save className="w-4 h-4 mr-2" />Enregistrer</span>}
                </Button>
              </div>
            )}
          </div>
        </form>
      </div>

      {showConfirmModal && (
        <ConfirmCloseModal
          title="Confirmer la Clôture"
          message={`Voulez-vous vraiment clôturer la journée #${editingJournee.id} ?`}
          onConfirm={handleCloseDay}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}
