import React, { useState, useMemo } from "react";
import PannesDeclareesCardsBaticom from "./PannesDeclareesCardsBaticom.jsx";
import PannesDeclareesCardsGTS from "./PannesDeclareesCardsGTS.jsx";
import { Button } from "./ui/button.jsx";

const TABS = [
  { id: "BATICOM", label: "BATICOM", component: PannesDeclareesCardsBaticom },
  { id: "GTS", label: "GTS", component: PannesDeclareesCardsGTS },
];

export default function PannesSectionAdmin() {
  const [activeTab, setActiveTab] = useState("BATICOM");

  const ActiveComponent = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab);
    return tab ? tab.component : null;
  }, [activeTab]);

  return (
    <div className="flex-1 flex flex-col min-h-screen py-6 animate-fadeInUp bg-gray-50 dark:bg-gray-900">
      
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap justify-center md:justify-start px-4 md:px-6 lg:px-8 mb-4">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={activeTab === tab.id ? "default" : "outline"}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl shadow-lg ${
              activeTab === tab.id
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 backdrop-blur-sm"
            }`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Section dynamique */}
      <div className="flex-1 space-y-4 px-4 md:px-6 lg:px-8">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}
