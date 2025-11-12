// src/components/DetailsJourneeModal.js

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../ui/button.jsx"; // J'imagine que c'est une composant de bouton stylisé
import { Loader2, Fuel, Ship, Weight } from "lucide-react"; // Ajout d'icônes pour un rendu plus visuel

/**
 * Modal d'affichage des détails d'une journée de travail et des voyages associés.
 * @param {object} props
 * @param {object} props.journee - Les données de la journée.
 * @param {function} props.setShowModal - Fonction pour fermer la modale.
 */
export default function DetailsJourneeModal({ journee, setShowModal }) {
  const [voyages, setVoyages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Utilisation de useCallback pour la fonction de fermeture pour plus de stabilité si elle était passée à des composants enfants
  const handleClose = useCallback(() => {
    setShowModal(null);
  }, [setShowModal]);

  useEffect(() => {
    const fetchVoyages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("journee_voyages")
          .select("id, voyage_num, tonnage") // Ne sélectionner que les champs nécessaires
          .eq("journee_id", journee.id)
          .order("voyage_num");

        if (fetchError) {
          throw new Error(fetchError.message || "Erreur lors du chargement des voyages.");
        }
        setVoyages(data || []);
      } catch (e) {
        console.error("Erreur de récupération des voyages:", e.message);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVoyages();
  }, [journee.id]); // Dépendance mise à jour pour être plus précise

  return (
    // Amélioration de l'accessibilité: ajout d'un rôle "dialog" et d'un mécanisme de fermeture par clic sur le fond
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      {/* Empêche la fermeture de la modale en cliquant à l'intérieur */}
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg transform transition-all duration-300 scale-100 opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête de la Modale */}
        <div className="flex justify-between items-center border-b pb-3 mb-4 dark:border-gray-700">
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            Détails Journée <span className="text-indigo-600">#{journee.id}</span>
          </h3>
          <Button variant="ghost" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" onClick={handleClose}>
            &times;
          </Button>
        </div>

        {/* Corps de la Modale */}
        <div className="space-y-4">
          {/* Section Récapitulatif (Utilisation d'une grille pour l'alignement professionnel) */}
          <h4 className="font-semibold text-lg text-indigo-700 dark:text-indigo-400 mb-3">Synthèse Globale</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Carte 1: Fuel Restant */}
            <DetailCard icon={<Fuel className="w-5 h-5 text-indigo-500" />} label="Fuel restant" value={`${journee.fuel_restant} L`} />

            {/* Carte 2: Fuel Complément */}
            <DetailCard icon={<Fuel className="w-5 h-5 text-green-500" />} label="Fuel complément" value={`${journee.fuel_complement} L`} />

            {/* Carte 3: Total Voyages */}
            <DetailCard icon={<Ship className="w-5 h-5 text-yellow-500" />} label="Total voyages" value={journee.voyages} />

            {/* Carte 4: Total Tonnage */}
            <DetailCard icon={<Weight className="w-5 h-5 text-red-500" />} label="Total tonnage" value={`${journee.tonnage} t`} />
          </div>

          <div className="border-t pt-4 mt-4 dark:border-gray-700">
            <h4 className="font-semibold text-lg text-indigo-700 dark:text-indigo-400 mb-3">Historique des Voyages</h4>
            
            {/* Gestion des états de chargement/erreur */}
            {isLoading ? (
              <div className="flex justify-center items-center py-6 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Chargement des voyages...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-100 text-red-700 rounded-lg border border-red-300">
                Erreur: {error}
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {voyages.length > 0 ? (
                  voyages.map(v => (
                    // Design des lignes de voyage amélioré (avec des couleurs conditionnelles si besoin)
                    <div
                      key={v.id}
                      className="flex justify-between items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 transition duration-150"
                    >
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        <Ship className="w-4 h-4 inline-block mr-2 text-indigo-500" /> Voyage <span className="font-bold">#{v.voyage_num}</span>
                      </span>
                      <span className="text-lg font-bold text-indigo-600 dark:text-indigo-300">
                        {v.tonnage} t
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic text-center py-4">
                    Aucun voyage enregistré pour cette journée. 😔
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pied de Modale */}
        <div className="flex justify-end mt-6 pt-4 border-t dark:border-gray-700">
          <Button onClick={handleClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}

// Composant utilitaire pour les cartes de détail (rendu plus propre)
const DetailCard = ({ icon, label, value }) => (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
        {icon}
        <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-base font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
    </div>
);