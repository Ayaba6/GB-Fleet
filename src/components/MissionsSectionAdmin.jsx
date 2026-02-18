import React, { useState, useMemo, useEffect } from "react";
import MissionsSectionBaticom from "./MissionsSectionBaticom.jsx";
import MissionsSectionGts from "./MissionsSectionGts.jsx";
import { Button } from "./ui/button.jsx";

const TABS = [
  { id: "BATICOM", label: "BATICOM", component: MissionsSectionBaticom },
  { id: "GTS", label: "GTS", component: MissionsSectionGts },
];

export default function MissionsSectionAdmin({ structure }) {
  // Si une structure est passée (cas du superviseur), on l'utilise par défaut.
  // Sinon, on met "BATICOM" (cas de l'admin par défaut).
  const [activeTab, setActiveTab] = useState(structure || "BATICOM");

  // Synchroniser l'onglet si la prop structure change
  useEffect(() => {
    if (structure) {
      setActiveTab(structure);
    }
  }, [structure]);

  const ActiveComponent = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab.toUpperCase());
    return tab ? tab.component : null;
  }, [activeTab]);

  // Si l'utilisateur est un superviseur (structure définie), on cache les onglets
  const isSuperviseur = !!structure;

  return (
    <div className="flex-1 flex flex-col space-y-4 animate-fadeInUp">
      
      {/* Affichage des onglets SEULEMENT pour l'Admin (si structure n'est pas imposée) */}
      {!isSuperviseur && (
        <div className="flex gap-2 flex-wrap justify-center md:justify-start mb-4 p-2">
          {TABS.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={activeTab === tab.id ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl shadow-md transition-all ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 border-gray-200"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      )}

      {/* Affichage d'un petit badge si c'est un superviseur pour confirmer sa structure */}
      {isSuperviseur && (
        <div className="px-6 py-2">
          <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 px-3 py-1 rounded-full font-bold tracking-widest uppercase">
            Vue Opérationnelle : {structure}
          </span>
        </div>
      )}

      {/* Section dynamique */}
      <div className="flex-1">
        {ActiveComponent ? (
          <div className="rounded-xl overflow-hidden">
            {/* On passe la structure au composant enfant pour être sûr qu'il filtre bien */}
            <ActiveComponent structure={activeTab} />
          </div>
        ) : (
          <div className="p-10 text-center text-gray-500">
            Structure non reconnue ou accès restreint.
          </div>
        )}
      </div>

    </div>
  );
}