// src/components/MissionsSectionAdmin.jsx
import React, { useState } from "react";
import MissionsSectionBaticom from "./MissionsSectionBaticom.jsx";
import MissionsSectionGTS from "./MissionsSectionGTS.jsx"; 
import { Button } from "./ui/button.jsx";

export default function MissionsSectionAdmin() {
  const [activeTab, setActiveTab] = useState("BATICOM");

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-6">
      <div className="w-full px-4 md:px-6 lg:px-8 space-y-6 mx-auto max-w-[1440px]">
        {/* Onglets */}
        <div className="flex gap-2 mb-6 justify-center md:justify-start flex-wrap">
          <Button
            size="sm"
            variant={activeTab === "BATICOM" ? "default" : "outline"}
            onClick={() => setActiveTab("BATICOM")}
          >
            BATICOM
          </Button>
          <Button
            size="sm"
            variant={activeTab === "GTS" ? "default" : "outline"}
            onClick={() => setActiveTab("GTS")}
          >
            GTS
          </Button>
        </div>

        {/* Contenu onglet actif */}
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-700 p-4 md:p-6 w-full overflow-x-auto">
          <div className="min-w-[900px] w-full">
            {activeTab === "BATICOM" && <MissionsSectionBaticom />}
            {activeTab === "GTS" && <MissionsSectionGTS />}
          </div>
        </div>
      </div>
    </div>
  );
}
