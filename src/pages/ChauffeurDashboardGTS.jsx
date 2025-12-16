// src/pages/ChauffeurDashboardGTS.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabaseClient.js";
import { Card, CardHeader, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { useToast } from "../components/ui/use-toast.jsx";
import {
  LogOut, Moon, Sun, Loader2, User, Home, History, Truck, Clock, Calendar,
  MessageSquare, Wrench, Route, CheckCircle, Scale
} from "lucide-react";

import IncidentModalGTS from "../components/modals/IncidentModalGTS.jsx";
import NewMissionModalGTS from "../components/modals/NewMissionModalGTS.jsx";
import HistoriqueGTS from "../components/HistoriqueGTS.jsx";
import DeclarePanneModal from "../components/modals/DeclarePanneModal.jsx";
import CarteFlotte from "../components/CarteFlotte.jsx"; // Carte avec markers

// --- Formatage date/heure ---
const formatDateTime = (isoDate, timeOnly = false) => {
  if (!isoDate) return "N/A";
  const date = new Date(isoDate);
  if (timeOnly) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('fr-FR');
};

export default function ChauffeurDashboardGTS({ session }) {
  const navigate = useNavigate();
  const chauffeurId = session?.user?.id;
  const { toast } = useToast();

  const [activeMission, setActiveMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const [showNewMissionModal, setShowNewMissionModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [panneDialog, setPanneDialog] = useState(false);

  const [openProfileMenu, setOpenProfileMenu] = useState(false);
  const profileMenuRef = useRef();

  const [positions, setPositions] = useState([]); // Stocke positions GPS pour la carte

  // --- Dark mode ---
  useEffect(() => { document.documentElement.classList.toggle("dark", darkMode); }, [darkMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) setOpenProfileMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Fetch missions ---
  const fetchMissions = useCallback(async () => {
    if (!chauffeurId) return navigate("/login");
    setLoading(true);
    try {
      const { data: missionsData, error } = await supabase
        .from("missions_gts")
        .select("*")
        .eq("chauffeur_id", chauffeurId)
        .in("statut", ["Affectée", "En Cours", "En Chargement", "En Déchargement"])
        .order("date", { ascending: true });

      if (error) throw error;

      const currentActive =
        missionsData.find((m) => m.statut === "En Cours") ||
        missionsData.find((m) => m.statut === "En Chargement") ||
        missionsData.find((m) => m.statut === "En Déchargement") ||
        missionsData.find((m) => m.statut === "Affectée");

      setActiveMission(currentActive || null);
      setShowNewMissionModal(currentActive?.statut === "Affectée");
    } catch (err) {
      toast({ title: "Erreur de chargement", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [chauffeurId, navigate, toast]);

  useEffect(() => {
    fetchMissions();
    const channel = supabase
      .channel(`missions_gts_chauffeur_${chauffeurId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "missions_gts", filter: `chauffeur_id=eq.${chauffeurId}` }, () => fetchMissions())
      .subscribe();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [chauffeurId, fetchMissions]);

  // --- Déconnexion ---
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      navigate("/login");
    } catch (err) {
      try {
        const { error: e2 } = await supabase.auth.signOut();
        if (e2) throw e2;
        navigate("/login");
      } catch (err2) {
        toast({ title: "Erreur déconnexion", description: (err2?.message || err.message), variant: "destructive" });
      }
    }
  };

  // --- Start mission ---
  const handleStartMission = async (mission) => {
    try {
      setLoading(true);
      const { error } = await supabase.from("missions_gts").update({ statut: "En Cours", started_at: new Date().toISOString() }).eq("id", mission.id);
      if (error) throw error;
      toast({ title: "Mission démarrée", description: "Le statut a été mis à jour à 'En Cours'." });
      await fetchMissions();
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- Signal entry (transition mission) ---
  const handleSignalEntry = async (mission) => {
    setLoading(true);
    try {
      let newStatut = null;
      const now = new Date().toISOString();

      if (mission.statut === "En Cours") newStatut = "En Chargement";
      else if (mission.statut === "En Chargement") newStatut = "En Déchargement";

      if (!newStatut) return setLoading(false);

      const updates = { statut: newStatut };
      if (newStatut === "En Chargement") updates.entered_lome_at = now;
      if (newStatut === "En Déchargement") updates.returned_ouaga_at = now;

      const { error } = await supabase.from("missions_gts").update(updates).eq("id", mission.id);
      if (error) throw error;

      toast({ title: "✅ Statut mis à jour", description: `Mission passée à "${newStatut}".` });
      await fetchMissions();
    } catch (err) {
      toast({ title: "❌ Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- Suivi GPS en temps réel ---
  useEffect(() => {
    if (!activeMission || activeMission.statut !== "En Cours") return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        try {
          // Insert position in missions_position
          const { error } = await supabase.from("missions_position").insert([{
            mission_id: activeMission.id,
            camion_id: activeMission.camion_id,
            chauffeur_id: chauffeurId,
            latitude,
            longitude,
            speed: speed || 0,
          }]);
          if (error) console.error("Erreur insertion position:", error);

          // Mettre à jour localement pour la carte
          setPositions(prev => [...prev, { latitude, longitude }]);
        } catch (err) {
          console.error("Erreur GPS:", err);
        }
      },
      (err) => console.error("Erreur geolocation:", err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeMission, chauffeurId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Loader2 className="animate-spin w-12 h-12 text-purple-600 dark:text-purple-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-4 py-3 bg-white dark:bg-gray-900 border-b dark:border-gray-800 shadow-md">
        <div ref={profileMenuRef} className="relative">
          <button
            onClick={() => setOpenProfileMenu(!openProfileMenu)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <User size={22} className="text-blue-600 dark:text-blue-400" />
          </button>
          {openProfileMenu && (
            <div className="absolute left-0 mt-3 w-40 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
              <div className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 truncate">
                Bonjour, <strong>{session?.user?.email?.split("@")[0]}</strong>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
              >
                <LogOut size={18} /> Déconnexion
              </button>
            </div>
          )}
        </div>

        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Route size={20} className="text-purple-600" /> GTS Dashboard
        </h1>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Main */}
      <main className="px-4 pt-24 pb-20 space-y-6">

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-4">
            {activeMission ? (
              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
                <CardHeader className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Route size={22} className="text-purple-600" /> Mission Active
                  </h2>
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    {activeMission.statut}
                  </span>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p><strong>Titre :</strong> {activeMission.titre || "Mission GTS"}</p>
                  <p><strong>Départ :</strong> {activeMission.depart || "Ouaga"}</p>
                  <p><strong>Destination :</strong> {activeMission.destination || "Lomé"}</p>
                  <p><strong>Début réel :</strong> {formatDateTime(activeMission.started_at, true)}</p>

                  {/* Carte */}
                  <div className="h-80 rounded-xl overflow-hidden border">
                    <CarteFlotte camions={[...positions]} center={[12.37, -1.53]} />
                  </div>

                  {/* Boutons mission */}
                  {activeMission.statut === "Affectée" && (
                    <Button onClick={() => handleStartMission(activeMission)} className="w-full bg-green-600 hover:bg-green-700 text-white h-12 shadow-lg">
                      <CheckCircle size={20} className="mr-2" /> Démarrer la Mission
                    </Button>
                  )}
                  {activeMission.statut === "En Cours" && (
                    <Button onClick={() => handleSignalEntry(activeMission)} className="w-full bg-orange-500 hover:bg-orange-600 text-white h-10 shadow-lg">
                      🚛 Entrée à Lomé / Début Chargement
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg text-center">
                <p>Aucune mission en cours ou affectée.</p>
              </Card>
            )}
          </div>
        )}

        {/* Historique */}
        {activeTab === "historique" && <HistoriqueGTS chauffeurId={chauffeurId} structure="gts" />}

        {/* Messages */}
        {activeTab === "messages" && (
          <Card className="p-6 text-center">
            <h2>Centre de Messages</h2>
            <p>Bientôt disponible</p>
          </Card>
        )}

        {/* Véhicule */}
        {activeTab === "vehicule" && (
          <Card className="p-6 text-center">
            <h2>Informations Véhicule</h2>
            <p>Détails, documents et maintenance</p>
          </Card>
        )}
      </main>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-700 shadow-2xl flex justify-around py-2">
        {["dashboard","historique","messages","vehicule"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center text-xs p-1 rounded-lg ${activeTab===tab?"text-blue-600 dark:text-blue-400 font-bold":"text-gray-500 dark:text-gray-400"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Modals */}
      {showNewMissionModal && activeMission?.statut === "Affectée" && <NewMissionModalGTS mission={activeMission} setShowModal={setShowNewMissionModal} fetchMissions={fetchMissions} />}
      {showIncidentModal && activeMission && <IncidentModalGTS open={showIncidentModal} onClose={() => setShowIncidentModal(false)} chauffeurId={chauffeurId} missionId={activeMission.id} />}
      {panneDialog && <DeclarePanneModal open={panneDialog} onClose={() => setPanneDialog(false)} chauffeurId={chauffeurId} missionId={activeMission?.id || null} structure="gts" />}
    </div>
  );
}
