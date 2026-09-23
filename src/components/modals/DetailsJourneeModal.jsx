import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../ui/button.jsx";
import { Loader2, Fuel, Ship, Weight, X } from "lucide-react";

export default function DetailsJourneeModal({ journee, setShowModal }) {
  const [voyages, setVoyages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
          .select("id, voyage_num, tonnage")
          .eq("journee_id", journee.id)
          .order("voyage_num");

        if (fetchError) throw new Error(fetchError.message);
        setVoyages(data || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVoyages();
  }, [journee.id]);

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-[100] p-2 md:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden transform transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER - Fixe */}
        <div className="flex justify-between items-center border-b p-4 md:p-6 dark:border-gray-700">
          <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white truncate">
            Journée <span className="text-indigo-600">#{journee.id}</span>
          </h3>
          <button 
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" 
            onClick={handleClose}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* CORPS - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          
          {/* Section Synthèse */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-3">
              Synthèse Globale
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <DetailCard icon={<Fuel className="w-5 h-5 text-indigo-500" />} label="Fuel restant" value={`${journee.fuel_restant} L`} />
              <DetailCard icon={<Fuel className="w-5 h-5 text-green-500" />} label="Fuel complément" value={`${journee.fuel_complement} L`} />
              <DetailCard icon={<Ship className="w-5 h-5 text-yellow-500" />} label="Total voyages" value={journee.voyages} />
              <DetailCard icon={<Weight className="w-5 h-5 text-red-500" />} label="Total tonnage" value={`${journee.tonnage} t`} />
            </div>
          </div>

          {/* Section Historique */}
          <div className="border-t pt-4 dark:border-gray-700">
            <h4 className="font-bold text-sm uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-3">
              Historique des Voyages
            </h4>
            
            {isLoading ? (
              <div className="flex flex-col justify-center items-center py-10 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                <span className="text-sm">Chargement...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 text-sm">
                {error}
              </div>
            ) : (
              <div className="space-y-2">
                {voyages.length > 0 ? (
                  voyages.map(v => (
                    <div
                      key={v.id}
                      className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center">
                        <Ship className="w-4 h-4 mr-3 text-indigo-400" />
                        Voyage <span className="font-bold ml-1">#{v.voyage_num}</span>
                      </span>
                      <span className="text-base font-black text-indigo-600 dark:text-indigo-300">
                        {v.tonnage} t
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600">
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                      Aucun voyage enregistré.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER - Fixe */}
        <div className="p-4 md:p-6 border-t dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <Button onClick={handleClose} className="w-full sm:w-auto float-right bg-indigo-600 hover:bg-indigo-700 text-white">
            Fermer les détails
          </Button>
        </div>
      </div>
    </div>
  );
}

const DetailCard = ({ icon, label, value }) => (
  <div className="flex items-center space-x-4 p-3 bg-white dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 leading-none mb-1">{label}</p>
      <p className="text-base font-black text-gray-900 dark:text-white truncate">{value}</p>
    </div>
  </div>
);