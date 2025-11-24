import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../ui/button.jsx";
import {
  Plus, X, Fuel, Ship, Save, Loader2, AlertTriangle, Pencil, Lock, Weight
} from "lucide-react";

// Modal de confirmation stylisé (pour la clôture)
const ConfirmCloseModal = ({ onConfirm, onCancel, title, message }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm space-y-4 border border-red-300 dark:border-red-700">
      <h4 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center">
        <AlertTriangle className="w-6 h-6 mr-2" /> {title}
      </h4>
      <p className="text-gray-700 dark:text-gray-300">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm}>
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
    // Filtre et renumérote les voyages après suppression
    const newVoyages = voyages
      .filter((_, i) => i !== index)
      .map((v, i) => ({ ...v, voyage_num: i + 1 }));
    setVoyages(newVoyages);
  };

  /** 🔹 Modifier le tonnage d’un voyage */
  const handleTonnageChange = (index, value) => {
    if (isClosed) return;
    const newVoyages = [...voyages];
    // Assurer que la valeur est un nombre non négatif
    const tonnage = Math.max(0, parseFloat(value) || 0); 
    newVoyages[index].tonnage = tonnage;
    setVoyages(newVoyages);
  };

  /** 🔹 Sauvegarde des modifications */
  const handleSave = async (e) => {
    e.preventDefault();
    if (isClosed) return;

    // Validation: Si des voyages existent, le tonnage total doit être > 0
    const tonnageSum = voyages.reduce((sum, v) => sum + v.tonnage, 0);
    if (voyages.length > 0 && tonnageSum <= 0) {
      setFormError("Veuillez saisir un tonnage valide (> 0) pour au moins un voyage.");
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      const fuelToAdd = parseFloat(addedFuel) || 0;
      const currentComplement = parseFloat(editingJournee.fuel_complement) || 0;
      const newFuelComplement = currentComplement + fuelToAdd;

      // 1. Mise à jour du complément carburant si nécessaire
      if (fuelToAdd > 0) {
        const { error: fuelError } = await supabase
          .from("journee_chauffeur")
          .update({ fuel_complement: newFuelComplement })
          .eq("id", editingJournee.id);
        if (fuelError) throw fuelError;
      }

      // 2. Upsert (Insert/Update) des voyages
      // On filtre les voyages avec tonnage > 0 pour éviter d'insérer des lignes inutiles
      const voyagesToUpsert = voyages.filter(v => v.tonnage > 0).map((v) => ({
        // L'ID est inclus si déjà existant, Supabase gère l'upsert
        ...v, 
        journee_id: editingJournee.id,
        voyage_num: v.voyage_num,
        tonnage: v.tonnage,
      }));

      if (voyagesToUpsert.length > 0) {
        const { error: voyageError } = await supabase
          .from("journee_voyages")
          .upsert(voyagesToUpsert, { onConflict: ["journee_id", "voyage_num"] });
        if (voyageError) throw voyageError;
      }

      // 3. Mise à jour des totaux dans journee_chauffeur
      const totalVoyages = voyages.filter(v => v.tonnage > 0).length;
      const totalTonnage = tonnageSum; 

      const { error: updateError } = await supabase
        .from("journee_chauffeur")
        .update({
          voyages: totalVoyages,
          tonnage: totalTonnage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingJournee.id);
      if (updateError) throw updateError;

      // 4. Re-fetch et fermeture
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
    setFormError(null);
    try {
      // Optionnel: On pourrait appeler handleSave ici pour s'assurer que les données sont à jour avant clôture.
      // Pour l'instant, on se contente de changer le statut.
      
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


  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={() => !loading && setShowModal(null)}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-lg space-y-5 transform transition-all duration-300 scale-100 opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- En-tête --- */}
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            {isClosed ? (
              <>
                <Lock className="w-5 h-5 mr-2 text-gray-500" /> Journée <span className="ml-1 text-red-500">(Clôturée)</span>
              </>
            ) : (
              <>
                <Pencil className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" /> Modifier Journée #{editingJournee.id}
              </>
            )}
          </h3>
          <Button variant="ghost" onClick={() => setShowModal(null)} className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </Button>
        </div>

        {formError && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {formError}
          </div>
        )}
        
        {loading && !formError && (
             <div className="p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-lg text-sm flex items-center gap-2">
               <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Chargement en cours...
             </div>
        )}

        {/* --- FORMULAIRE PRINCIPAL --- */}
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* --- Carburant --- */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
            <h4 className="font-semibold text-lg text-blue-700 dark:text-blue-400 flex items-center mb-3">
              <Fuel className="w-5 h-5 mr-2" /> Carburant
            </h4>
            
            <div className="grid grid-cols-3 gap-4 text-sm font-medium">
              <div className="text-gray-600 dark:text-gray-400">
                <p className="text-xs">Initial au départ</p>
                <p className="font-bold text-gray-800 dark:text-gray-200">{editingJournee.fuel_restant ?? 0} L</p>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                <p className="text-xs">Complément total</p>
                <p className="font-bold text-gray-800 dark:text-gray-200">{editingJournee.fuel_complement ?? 0} L</p>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                <p className="text-xs">Total Carburant</p>
                <p className="font-bold text-gray-800 dark:text-gray-200">
                  {((editingJournee.fuel_restant || 0) + (editingJournee.fuel_complement || 0)).toFixed(1)} L
                </p>
              </div>
            </div>
            
            {!isClosed && (
              <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <label htmlFor="addedFuel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ajouter du carburant (Litres)
                </label>
                <input
                  id="addedFuel"
                  type="number"
                  min="0"
                  step="0.1"
                  value={addedFuel}
                  onChange={(e) => setAddedFuel(e.target.value)}
                  placeholder="0.0"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* --- Voyages --- */}
          <div className="space-y-3">
            <h4 className="font-semibold text-lg text-blue-700 dark:text-blue-400 flex items-center mb-2">
              <Ship className="w-5 h-5 mr-2" /> Voyages ({voyages.length})
            </h4>
            
            {/* Liste des voyages */}
            <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
              {voyages.length === 0 && !isClosed ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 p-4 border border-dashed rounded-lg">
                      Aucun voyage enregistré. Cliquez sur 'Ajouter' ci-dessous pour commencer.
                  </div>
              ) : voyages.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition duration-150"
                >
                  <span className="font-bold text-gray-700 dark:text-gray-200 w-16 flex-shrink-0">
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">Voyage</span> #{v.voyage_num}
                  </span>
                  
                  <div className="flex items-center flex-grow">
                    <Weight className="w-4 h-4 mr-2 text-indigo-500" />
                    {!isClosed ? (
                      <input
                        type="number"
                        value={v.tonnage}
                        onChange={(e) =>
                          handleTonnageChange(i, e.target.value)
                        }
                        min="0"
                        step="0.1"
                        placeholder="Tonnage (t)"
                        className="border rounded-lg w-full px-3 py-1 bg-white dark:bg-gray-700 text-center"
                        disabled={loading}
                      />
                    ) : (
                      <span className="font-bold text-gray-800 dark:text-gray-200">{v.tonnage} tonnes</span>
                    )}
                  </div>
                  
                  {!isClosed && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveVoyage(i)}
                      className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 p-1"
                      disabled={loading}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* --- Bouton d'ajout de voyage (position corrigée) --- */}
            {!isClosed && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddVoyage}
                    className="mt-3 w-full text-blue-600 border-blue-300 dark:text-blue-300 dark:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-gray-800"
                    disabled={loading}
                >
                    <Plus className="w-4 h-4 mr-2" /> Ajouter un nouveau voyage
                </Button>
            )}
          </div>

          {/* --- Boutons d'action --- */}
          <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
            <Button variant="outline" onClick={() => setShowModal(null)} disabled={loading}>
                {isClosed ? 'Fermer' : 'Annuler'}
            </Button>
            
            {!isClosed && (
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" /> Clôturer
                </Button>
                
                <Button
                  type="submit"a
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
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
            )}
          </div>
        </form>
      </div>

      {/* --- Modale de confirmation de clôture --- */}
      {showConfirmModal && (
        <ConfirmCloseModal
          title="Confirmer la Clôture"
          message={`Voulez-vous vraiment clôturer la journée #${editingJournee.id} ? Assurez-vous d'avoir enregistré toutes les modifications (carburant, voyages) avant de confirmer. Cette action est irréversible.`}
          onConfirm={handleCloseDay}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}