import React, { useState, useMemo, useEffect } from "react";
import PannesDeclareesCardsBaticom from "./PannesDeclareesCardsBaticom.jsx";
import PannesDeclareesCardsGTS from "./PannesDeclareesCardsGTS.jsx";
import { Button } from "./ui/button.jsx";

const TABS = [
  { id: "BATICOM", label: "BATICOM", component: PannesDeclareesCardsBaticom },
  { id: "GTS", label: "GTS", component: PannesDeclareesCardsGTS },
];

export default function PannesSectionAdmin({ structure }) {
  // On gère l'onglet actif en MAJUSCULES pour l'interface utilisateur
  const [activeTab, setActiveTab] = useState(structure?.toUpperCase() || "BATICOM");

  useEffect(() => {
    if (structure) {
      setActiveTab(structure.toUpperCase());
    }
  }, [structure]);

  const ActiveComponent = useMemo(() => {
    if (!activeTab) return null;
    const tab = TABS.find((t) => t.id === activeTab.toUpperCase());
    return tab ? tab.component : null;
  }, [activeTab]);

  const isSuperviseur = !!structure;

  return (
    <div className="flex-1 flex flex-col min-h-screen space-y-4 animate-fadeInUp">

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
                  ? "bg-red-600 text-white dark:bg-red-500" 
                  : "bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 backdrop-blur-sm"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 px-2">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
          {isSuperviseur ? `Suivi des pannes : ${structure}` : `Pannes en cours : ${activeTab}`}
        </h2>
      </div>

      <div className="flex-1 space-y-4">
        {ActiveComponent ? (
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-lg backdrop-blur-sm overflow-hidden min-h-[200px]">
            {/* IMPORTANT : On envoie la structure en MINUSCULES 
               pour que la requête Supabase fonctionne avec votre table
            */}
            <ActiveComponent structure={activeTab.toLowerCase()} />
          </div>
        ) : (
          <div className="p-10 text-center text-gray-500">
            Structure non reconnue.
          </div>
        )}
      </div>
    </div>
  );
}