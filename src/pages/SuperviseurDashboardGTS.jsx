// src/pages/SuperviseurDashboardGTS.jsx
import React from "react";
import { supabase } from "../config/supabaseClient.js";
import { LogOut, Truck, ClipboardList, LayoutDashboard } from "lucide-react";

export default function SuperviseurDashboardGTS() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 🧱 Sidebar */}
      <aside className="w-64 bg-blue-900 text-white flex flex-col justify-between">
        <div>
          <div className="p-5 text-center border-b border-blue-700">
            <h1 className="text-2xl font-bold">GTS SUPERVISEUR</h1>
          </div>
          <nav className="mt-6">
            <ul>
              <li className="px-6 py-3 hover:bg-blue-800 flex items-center gap-2 cursor-pointer">
                <LayoutDashboard size={18} /> Tableau de bord
              </li>
              <li className="px-6 py-3 hover:bg-blue-800 flex items-center gap-2 cursor-pointer">
                <Truck size={18} /> Missions GTS
              </li>
              <li className="px-6 py-3 hover:bg-blue-800 flex items-center gap-2 cursor-pointer">
                <ClipboardList size={18} /> Chauffeurs
              </li>
            </ul>
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="m-4 flex items-center justify-center gap-2 p-2 bg-red-600 hover:bg-red-700 rounded-lg"
        >
          <LogOut size={18} /> Déconnexion
        </button>
      </aside>

      {/* 🧩 Main Content */}
      <main className="flex-1 p-6">
        <h2 className="text-2xl font-bold mb-4">Tableau de bord GTS</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-2">Missions actives</h3>
            <p className="text-gray-600">Voir les missions en cours</p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-2">Chauffeurs</h3>
            <p className="text-gray-600">Liste des chauffeurs enregistrés</p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-2">Historique</h3>
            <p className="text-gray-600">Toutes les missions clôturées</p>
          </div>
        </div>
      </main>
    </div>
  );
}
