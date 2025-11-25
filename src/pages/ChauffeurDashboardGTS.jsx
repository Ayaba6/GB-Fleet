// src/pages/ChauffeurDashboardGTS.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabaseClient.js";
import { ClipboardList, Truck, MessageSquare, LogOut, CheckCircle, Clock, MapPin } from "lucide-react";
import IncidentModalGTS from "../components/modals/IncidentModalGTS.jsx";
import NewMissionModalGTS from "../components/modals/NewMissionModalGTS.jsx";

const HistorySection = () => <div className="p-4 text-gray-600">Historique des missions terminées et des rapports de route. (À implémenter)</div>;
const MessagesSection = () => <div className="p-4 text-gray-600">Système de messagerie instantanée avec le gestionnaire de flotte. (À implémenter)</div>;
const VehicleSection = () => <div className="p-4 text-gray-600">Rapports d'inspection et données véhicule. (À implémenter)</div>;

export default function ChauffeurDashboardGTS() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("dashboard");

  const [activeMission, setActiveMission] = useState(null);
  const [newMission, setNewMission] = useState(null);
  const [showNewMissionModal, setShowNewMissionModal] = useState(false);

  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedMissionForIncident, setSelectedMissionForIncident] = useState(null);

  const menuItemsConfig = [
    { key: "dashboard", label: "Tableau de Bord", icon: Clock },
    { key: "historique", label: "Historique", icon: ClipboardList },
    { key: "messages", label: "Messages", icon: MessageSquare },
    { key: "vehicule", label: "Véhicule", icon: Truck },
  ];

  // --- Récupération des missions assignées au chauffeur ---
  const fetchData = useCallback(async () => {
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

      // Mission active : En Cours
      const currentActive = missionsData.find(m => m.statut === 'En Cours');
      setActiveMission(currentActive || null);

      // Nouvelle mission à accepter
      const missionToAccept = missionsData.find(m => m.statut === 'Affectée' && !m.started_at);
      if (missionToAccept) {
        setNewMission(missionToAccept);
        setShowNewMissionModal(true);
      } else {
        setNewMission(null);
        setShowNewMissionModal(false);
      }

      setMissions(missionsData || []);
    } catch (error) {
      console.error("Erreur récupération missions:", error.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/login");
  }, [navigate]);

  const handleNavigation = (mission) => {
    const address = mission.destination;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
  };

  const handleDeclareIncident = (mission) => {
    setSelectedMissionForIncident(mission);
    setShowIncidentModal(true);
  };

  // --- Tableau de bord ---
  const DashboardContent = () => (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-3xl font-extrabold text-blue-900">Tableau de Bord</h1>

      {/* Statut */}
      <div className={`p-4 rounded-xl shadow-lg text-white font-bold text-center ${
        activeMission?.statut === 'En Cours' ? 'bg-green-600' :
        activeMission?.statut === 'Affectée' ? 'bg-yellow-600' : 'bg-gray-500'
      }`}>
        <p className="text-lg">{activeMission?.statut === 'En Cours' ? "EN MISSION" :
          activeMission?.statut === 'Affectée' ? "MISSION À ACCEPTER" : "DISPONIBLE"}
        </p>
      </div>

      {/* Liste des missions */}
      <div className="space-y-4">
        {missions.length === 0 && <p className="text-gray-500">Aucune mission assignée</p>}
        {missions.map(m => (
          <div key={m.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow flex flex-col gap-2">
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{m.titre}</h3>
            <p className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <MapPin size={16} className="mr-2 text-blue-500"/> Destination : {m.destination}
            </p>
            <p className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <CheckCircle size={16} className="mr-2 text-green-500"/> Statut : {m.statut}
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => handleNavigation(m)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition"
              >
                Démarrer la Navigation
              </button>

              {m.statut === 'En Cours' && (
                <button
                  onClick={() => handleDeclareIncident(m)}
                  className="w-full bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition"
                >
                  🚨 Déclarer un Incident
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Nouvelle mission à accepter */}
      {!activeMission && newMission && (
        <button
          onClick={() => setShowNewMissionModal(true)}
          className="w-full bg-yellow-500 text-white py-3 rounded-lg font-bold hover:bg-yellow-600 transition mt-4"
        >
          Consulter la Nouvelle Mission
        </button>
      )}
    </div>
  );

  const sectionsMap = useMemo(() => ({
    dashboard: DashboardContent,
    historique: HistorySection,
    messages: MessagesSection,
    vehicule: VehicleSection,
  }), [missions, activeMission, newMission]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      <p className="text-gray-500 ml-4">Chargement des données...</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 pb-20">
      <header className="bg-white sticky top-0 z-40 shadow-md px-4 py-4 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-2xl font-extrabold text-blue-900 capitalize">{menuItemsConfig.find(i => i.key === section)?.label}</h1>
        <button onClick={handleLogout} className="text-red-600 p-2 rounded-full hover:bg-red-50 transition">
          <LogOut size={24} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        {sectionsMap[section]()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t border-gray-200 z-50 md:hidden">
        <div className="flex justify-around">
          {menuItemsConfig.map(item => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={`flex flex-col items-center p-3 text-xs font-semibold transition-colors duration-200 w-1/4 ${
                section === item.key ? "text-blue-600 border-t-2 border-blue-600 pt-[10px]" : "text-gray-500 hover:text-blue-500"
              }`}
            >
              <item.icon size={22} />
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      {showNewMissionModal && newMission && (
        <NewMissionModalGTS 
          mission={newMission} 
          setShowModal={setShowNewMissionModal} 
          fetchMissions={fetchData} 
        />
      )}

      {showIncidentModal && selectedMissionForIncident && (
        <IncidentModalGTS 
          mission={selectedMissionForIncident} 
          setShowModal={setShowIncidentModal} 
          fetchMissions={fetchData} 
        />
      )}
    </div>
  );
}
