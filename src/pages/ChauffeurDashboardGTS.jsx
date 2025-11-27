// src/pages/ChauffeurDashboardGTS.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabaseClient.js";
import { ClipboardList, Truck, MessageSquare, LogOut, Clock } from "lucide-react";

import IncidentModalGTS from "../components/modals/IncidentModalGTS.jsx";
import NewMissionModalGTS from "../components/modals/NewMissionModalGTS.jsx";
import HistoriqueGTS from "../components/HistoriqueGTS.jsx";
import { Button } from "../components/ui/button.jsx";
import { Loader2 } from "lucide-react";

export default function ChauffeurDashboardGTS() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [missions, setMissions] = useState([]);
  const [activeMission, setActiveMission] = useState(null);
  const [newMission, setNewMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("dashboard");
  const [showNewMissionModal, setShowNewMissionModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedMissionForIncident, setSelectedMissionForIncident] = useState(null);

  const menuItemsConfig = [
    { key: "dashboard", label: "Tableau de Bord", icon: Clock },
    { key: "historique", label: "Historique", icon: ClipboardList },
    { key: "messages", label: "Messages", icon: MessageSquare },
    { key: "vehicule", label: "Véhicule", icon: Truck },
  ];

  // --- LOGIQUE SUPABASE ---
  const fetchMissions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) return navigate("/login");
      setUser(authUser.user);

      const { data: missionsData, error } = await supabase
        .from("missions_gts")
        .select("*")
        .eq("chauffeur_id", authUser.user.id)
        .order("date", { ascending: true });

      if (error) throw error;

      // 1. Mission active
      const currentActive = missionsData.find(m => m.statut === "En Cours" || m.statut === "Affectée");
      setActiveMission(currentActive || null);

      // 2. Nouvelle mission à accepter
      const missionToAccept = missionsData.find(m => m.statut === "Affectée" && !m.started_at);
      if (missionToAccept && missionToAccept.id !== currentActive?.id) {
        setNewMission(missionToAccept);
        setShowNewMissionModal(true);
      } else {
        setNewMission(null);
        setShowNewMissionModal(false);
      }

      setMissions(missionsData || []);
    } catch (err) {
      console.error("Erreur récupération missions:", err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/login");
  }, [navigate]);

  // --- ACTIONS MISSION ---
  const handleNavigation = (mission) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mission.destination)}`, "_blank");
  };

  const handleSignalEntry = async (mission) => {
    await supabase.from("missions_gts").update({ statut: "En Chargement", entered_lome_at: new Date().toISOString() }).eq("id", mission.id);
    fetchMissions();
  };

  const handleSignalReturn = async (mission) => {
    await supabase.from("missions_gts").update({ statut: "Terminée", returned_ouaga_at: new Date().toISOString() }).eq("id", mission.id);
    fetchMissions();
  };

  const handleDeclareIncident = (mission) => {
    setSelectedMissionForIncident(mission);
    setShowIncidentModal(true);
  };

  // --- CONTENU DASHBOARD ---
  const DashboardContent = () => (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-3xl font-extrabold text-blue-900">Tableau de Bord</h1>

      <div className={`p-4 rounded-xl shadow-lg text-white font-bold text-center ${
        activeMission?.statut === "En Cours" ? "bg-green-600" :
        activeMission?.statut === "Affectée" ? "bg-yellow-600" : "bg-gray-500"
      }`}>
        <p className="text-lg">
          {activeMission?.statut === "En Cours" ? "EN MISSION" :
           activeMission?.statut === "Affectée" ? "MISSION A ACCEPTER" : "DISPONIBLE"}
        </p>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-blue-500">
        {activeMission ? (
          <div className="space-y-3">
            <p className="font-bold text-gray-800 dark:text-gray-100">{activeMission.titre}</p>
            <p className="text-gray-700">Départ : {activeMission.depart}</p>
            <p className="text-gray-700">Destination : {activeMission.destination}</p>

            <div className="space-y-2 pt-4">
              {activeMission.statut === "Affectée" && (
                <Button onClick={() => setShowNewMissionModal(true)}>Accepter la mission</Button>
              )}
              {activeMission.statut === "En Cours" && (
                <>
                  <Button onClick={() => handleSignalEntry(activeMission)}>🚛 Signal entrée à Lomé</Button>
                  <Button onClick={() => handleSignalReturn(activeMission)}>🏁 Signal retour à Ouaga</Button>
                  <Button onClick={() => handleDeclareIncident(activeMission)} variant="destructive">🚨 Déclarer panne/incident</Button>
                  <Button onClick={() => handleNavigation(activeMission)}>Démarrer Navigation</Button>
                </>
              )}
            </div>
          </div>
        ) : (
          newMission && (
            <Button onClick={() => setShowNewMissionModal(true)}>Nouvelle mission à consulter</Button>
          )
        )}
      </div>
    </div>
  );

  // --- RENDU SECTIONS ---
  const sectionsMap = useMemo(() => ({
    dashboard: DashboardContent,
    historique: () => <HistoriqueGTS chauffeurId={user?.id} />,
    messages: () => <div className="p-4 text-gray-600">Messages (à implémenter)</div>,
    vehicule: () => <div className="p-4 text-gray-600">Véhicule (à implémenter)</div>,
  }), [activeMission, newMission, user]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Loader2 className="animate-spin mr-2" size={28} />
      Chargement des données...
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 pb-20">
      <header className="bg-white sticky top-0 z-40 shadow-md px-4 py-4 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-2xl font-extrabold text-blue-900 capitalize">{menuItemsConfig.find(i => i.key === section)?.label}</h1>
        <button onClick={handleLogout} className="text-red-600 p-2 rounded-full hover:bg-red-50">
          <LogOut size={24} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">{sectionsMap[section]()}</main>

      {/* Nav mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t border-gray-200 z-50 md:hidden">
        <div className="flex justify-around">
          {menuItemsConfig.map(item => (
            <button key={item.key} onClick={() => setSection(item.key)}
              className={`flex flex-col items-center p-3 text-xs font-semibold transition-colors w-1/4 ${
                section === item.key ? "text-blue-600 border-t-2 border-blue-600 pt-[10px]" : "text-gray-500 hover:text-blue-500"
              }`}>
              <item.icon size={22} />
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      {showNewMissionModal && newMission && (
        <NewMissionModalGTS mission={newMission} setShowModal={setShowNewMissionModal} fetchMissions={fetchMissions} />
      )}
      {showIncidentModal && selectedMissionForIncident && (
        <IncidentModalGTS mission={selectedMissionForIncident} setShowModal={setShowIncidentModal} fetchMissions={fetchMissions} />
      )}
    </div>
  );
}
