// src/components/MissionsSectionAdmin.jsx
import React, { useState, useMemo } from "react";
import MissionsSectionBaticom from "./MissionsSectionBaticom.jsx";
import MissionsSectionGTS from "./MissionsSectionGts.jsx";
import { Button } from "./ui/button.jsx";

const TABS = [
  { id: "BATICOM", label: "BATICOM", component: MissionsSectionBaticom },
  { id: "GTS", label: "GTS", component: MissionsSectionGTS },
];

export default function MissionsSectionAdmin() {
  const [activeTab, setActiveTab] = useState("BATICOM");

  const ActiveComponent = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab);
    return tab ? tab.component : null;
  }, [activeTab]);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-6">
      <div className="w-full px-4 md:px-6 lg:px-8 space-y-6 mx-auto max-w-[1440px]">

        {/* Onglets */}
        <div className="flex gap-2 mb-6 justify-center md:justify-start flex-wrap">
          {TABS.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={activeTab === tab.id ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Conteneur responsive */}
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-700 p-4 md:p-6 w-full">

          {/* Desktop: tableau */}
          <div className="hidden md:block">
            {ActiveComponent && <ActiveComponent />}
          </div>

          {/* Mobile: cartes */}
          <div className="block md:hidden">
            {ActiveComponent && <ActiveComponent mobile />}
          </div>

        </div>
      </div>
    </div>
  );
}
