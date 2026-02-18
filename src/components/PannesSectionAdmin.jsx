import React, { useState, useMemo, useEffect } from "react";
import PannesDeclareesCardsBaticom from "./PannesDeclareesCardsBaticom.jsx";
import PannesDeclareesCardsGTS from "./PannesDeclareesCardsGTS.jsx";
import { Button } from "./ui/button.jsx";

const TABS = [
  { id: "BATICOM", label: "BATICOM", component: PannesDeclareesCardsBaticom },
  { id: "GTS", label: "GTS", component: PannesDeclareesCardsGTS },
];

export default function PannesSectionAdmin({ structure }) {
  // Si le dashboard passe une structure (superviseur), on l'utilise. 
  // Sinon "BATICOM" par défaut (admin).
  const [activeTab, setActiveTab] = useState(structure || "BATICOM");

  // On synchronise si la prop change (ex: switch de profil)
  useEffect(() => {
    if (structure) {
      setActiveTab(structure);
    }
  }, [structure]);

  const ActiveComponent = useMemo(() => {
    // On s'assure que la comparaison se fait en majuscules pour correspondre aux IDs des TABS
    const tab = TABS.find((t) => t.id === activeTab.toUpperCase());
    return tab ? tab.component : null;
  }, [activeTab]);

  // Si 'structure' est présent, c'est un superviseur : on cache les onglets
  const isSuperviseur = !!structure;

  return (
    <div className="flex-1 flex flex-col min-h-screen space-y-4 animate-fadeInUp">

      {/* Affichage des Onglets : Uniquement pour l'Admin */}
      {!isSuperviseur && (
        <div className="flex gap-2 flex-wrap justify-center md:justify-start mb-4">
          {TABS.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={activeTab === tab.id ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl shadow-lg transition-all ${
                activeTab === tab.id
                  ? "bg-red-600 text-white dark:bg-red-500" // Rouge pour les pannes c'est plus intuitif
                  : "bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 backdrop-blur-sm"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      )}

      {/* Titre de rappel pour le superviseur */}
      {isSuperviseur && (
        <div className="flex items-center gap-2 px-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
            Suivi des pannes : {structure}
          </h2>
        </div>
      )}

      {/* Section dynamique */}
      <div className="flex-1 space-y-4">
        {ActiveComponent ? (
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-lg backdrop-blur-sm overflow-hidden">
            {/* On passe la structure au composant de cartes pour filtrage interne si nécessaire */}
            <ActiveComponent structure={activeTab} />
          </div>
        ) : (
          <div className="p-10 text-center text-gray-500 bg-white/50 rounded-xl border border-dashed">
            Sélectionnez une structure pour voir les pannes.
          </div>
        )}
      </div>

    </div>
  );
}