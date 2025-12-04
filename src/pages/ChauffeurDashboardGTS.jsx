// src/pages/ChauffeurDashboardGTS.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabaseClient.js";
import { Card, CardHeader, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { useToast } from "../components/ui/use-toast.jsx";
import {
  LogOut, Moon, Sun, Loader2, User, Home, History, Truck, Clock, Calendar,
  MessageSquare, Wrench, AlertTriangle, Route, CheckCircle, Scale, Map
} from "lucide-react";

// Imports des composants spécifiques GTS
import IncidentModalGTS from "../components/modals/IncidentModalGTS.jsx";
import NewMissionModalGTS from "../components/modals/NewMissionModalGTS.jsx";
import HistoriqueGTS from "../components/HistoriqueGTS.jsx";
import DeclarePanneModal from "../components/modals/DeclarePanneModal.jsx";

// --- Composant utilitaire pour le formatage des dates/heures ---
const formatDateTime = (isoDate, timeOnly = false) => {
  if (!isoDate) return "N/A";
  const date = new Date(isoDate);
  if (timeOnly) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('fr-FR');
};

// --- Header fixe ---
const DashboardHeaderGTS = ({
  session,
  darkMode,
  setDarkMode,
  handleSignOut,
  openProfileMenu,
  setOpenProfileMenu,
  profileMenuRef,
}) => {
  const userName = session?.user?.email?.split("@")[0] || "Chauffeur";

  return (
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
              Bonjour, <strong>{userName}</strong>
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
        <Route size={20} className="text-purple-600" />
        GTS Dashboard
      </h1>

      <button
        onClick={() => setDarkMode(!darkMode)}
        className="p-2 rounded-full text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Toggle dark mode"
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </div>
  );
};

// --- Bottom Navigation ---
const BottomNavigationGTS = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: "dashboard", icon: Home, label: "Accueil" },
    { id: "historique", icon: History, label: "Historique" },
    { id: "messages", icon: MessageSquare, label: "Messages" },
    { id: "vehicule", icon: Truck, label: "Véhicule" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-700 shadow-2xl flex justify-around py-2">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center text-xs p-1 rounded-lg transition-all ${
              isActive
                ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-gray-800"
                : "text-gray-500 dark:text-gray-400 font-medium hover:text-blue-500 dark:hover:text-blue-300"
            }`}
          >
            <Icon size={22} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

// --- Dashboard Content (Mission Active) ---
const DashboardContentGTS = ({
  activeMission,
  handleNavigation,
  handleSignalEntry,
  handleSignalReturn,
  setShowIncidentModal,
  setShowNewMissionModal,
  setPanneDialog,
  handleStartMission,
}) => {
  const statutMission = activeMission?.statut || "N/A";
  const missionStarted = !!activeMission?.started_at;
  const enteredLome = !!activeMission?.entered_lome_at;
  const isReadyForReturn = statutMission === "En Chargement" && enteredLome;

  let statusBadge;
  if (statutMission === "Terminée")
    statusBadge = (
      <span className="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
        Terminée
      </span>
    );
  else if (statutMission === "En Cours")
    statusBadge = (
      <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
        En Cours
      </span>
    );
  else if (statutMission === "Affectée")
    statusBadge = (
      <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
        Affectée
      </span>
    );
  else if (statutMission === "En Chargement")
    statusBadge = (
      <span className="px-3 py-1 text-sm font-semibold rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
        En Chargement
      </span>
    );
  else
    statusBadge = (
      <span className="px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
        Disponible
      </span>
    );

  const DetailItem = ({ icon: Icon, label, value, type = "text" }) => (
    <div className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-b-0">
      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
        <Icon size={18} className="text-purple-500 dark:text-purple-400" />
        <span className="font-medium">{label}</span>
      </div>
      <span
        className={`font-semibold ${
          type === "important"
            ? "text-lg text-blue-600 dark:text-blue-400"
            : "text-gray-800 dark:text-gray-100"
        }`}
      >
        {value}
      </span>
    </div>
  );

  if (!activeMission)
    return (
      <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg text-center">
        <Truck size={32} className="mx-auto mb-4 text-green-500" />
        <p className="text-gray-700 dark:text-gray-200 text-lg font-semibold">
          Aucune mission en cours ou affectée.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Vous êtes actuellement disponible pour une nouvelle affectation.
        </p>
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={() => setPanneDialog(true)}
            className="w-full h-10 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium"
          >
            <Wrench size={18} /> Déclarer une panne (Hors Mission)
          </Button>
        </div>
      </Card>
    );

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Route size={22} className="text-purple-600" /> Mission Active
        </h2>
        {statusBadge}
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <DetailItem
            icon={Calendar}
            label="Date Prévue"
            value={formatDateTime(activeMission.date)}
          />
          <DetailItem
            icon={Clock}
            label="Titre"
            value={activeMission.titre || "Mission GTS"}
          />
          <DetailItem
            icon={Route}
            label="Départ"
            value={activeMission.depart || "Ouaga"}
          />
          <DetailItem
            icon={Route}
            label="Destination"
            value={activeMission.destination || "Lomé"}
          />
          <DetailItem
            icon={Clock}
            label="Début réel"
            value={formatDateTime(activeMission.started_at, true)}
          />

          {activeMission.tonnage > 0 && (
            <DetailItem
              icon={Scale}
              label="Tonnage Prévu"
              value={`${activeMission.tonnage} t`}
              type="important"
            />
          )}
          {(activeMission.tonnage_charge > 0 || statutMission === "En Chargement") && (
            <DetailItem
              icon={Scale}
              label="Tonnage Chargé"
              value={
                activeMission.tonnage_charge > 0
                  ? `${activeMission.tonnage_charge} t`
                  : "En attente"
              }
            />
          )}
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {statutMission === "Affectée" && (
            <Button
              onClick={() => handleStartMission(activeMission)}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-semibold h-12 shadow-lg"
            >
              <CheckCircle size={20} className="mr-2" /> Démarrer la Mission
            </Button>
          )}

          {statutMission === "En Cours" && (
            <>
              <Button
                onClick={() => handleNavigation(activeMission)}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-10 shadow-lg"
              >
                <Map size={20} className="mr-2" /> Démarrer Navigation GPS
              </Button>

              <Button
                onClick={() => handleSignalEntry(activeMission)}
                variant="outline"
                className="w-full border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30"
              >
                🚛 Signal entrée destination / Début Chargement
              </Button>
            </>
          )}

          {statutMission === "En Chargement" && (
            <>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 font-semibold pt-1">
                En attente de la saisie du rapport de chargement par l'administrateur.
              </p>

              {isReadyForReturn && (
                <Button
                  onClick={() => handleSignalReturn(activeMission)}
                  variant="outline"
                  className="w-full border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 mt-3"
                >
                  🏁 Signal retour à Ouaga / Clôture Mission
                </Button>
              )}
            </>
          )}

          {statutMission !== "Terminée" && (
            <div className="pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => setShowIncidentModal(true)}
                className="w-full h-10 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                <Wrench size={18} /> Déclarer panne/incident
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// --- Composant Principal ---
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

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setOpenProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchMissions = useCallback(async () => {
    if (!chauffeurId) return navigate("/login");
    setLoading(true);
    try {
      const { data: missionsData, error } = await supabase
        .from("missions_gts")
        .select("*")
        .eq("chauffeur_id", chauffeurId)
        .in("statut", ["Affectée", "En Cours", "En Chargement"])
        .order("date", { ascending: true });

      if (error) throw error;

      const currentActive =
        missionsData.find((m) => m.statut === "En Cours") ||
        missionsData.find((m) => m.statut === "En Chargement") ||
        missionsData.find((m) => m.statut === "Affectée");

      setActiveMission(currentActive || null);

      if (currentActive && currentActive.statut === "Affectée") {
        setShowNewMissionModal(true);
      } else {
        setShowNewMissionModal(false);
      }
    } catch (err) {
      toast({ title: "Erreur de chargement", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [chauffeurId, navigate, toast]);

  useEffect(() => {
    fetchMissions();

    const channel = supabase
      .channel(`missions_gts_chauffeur_${chauffeurId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "missions_gts", filter: `chauffeur_id=eq.${chauffeurId}` },
        () => fetchMissions()
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [chauffeurId, fetchMissions]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleNavigation = (mission) => {
    const destination = mission.destination || "destination";
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(url, "_blank");
  };

  const handleSignalEntry = async (mission) => {
    setLoading(true);
    const { error } = await supabase.from("missions_gts").update({
      statut: "En Chargement",
      entered_lome_at: new Date().toISOString()
    }).eq("id", mission.id);
    if (!error) toast({ title: "✅ Entrée signalée", description: "Statut mis à jour à 'En Chargement'." });
    else toast({ title: "❌ Erreur", description: error.message, variant: "destructive" });
    fetchMissions();
  };

  const handleSignalReturn = async (mission) => {
    setLoading(true);
    const { error } = await supabase.from("missions_gts").update({
      statut: "Terminée",
      returned_ouaga_at: new Date().toISOString()
    }).eq("id", mission.id);
    if (!error) toast({ title: "✅ Retour signalé", description: "Mission clôturée." });
    else toast({ title: "❌ Erreur", description: error.message, variant: "destructive" });
    fetchMissions();
  };

  const handleStartMission = async (mission) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("missions_gts")
        .update({ statut: "En Cours", started_at: new Date().toISOString() })
        .eq("id", mission.id);

      if (error) throw error;

      toast({ title: "Mission démarrée", description: "Le statut a été mis à jour à 'En Cours'." });
      fetchMissions();
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
        <Loader2 className="animate-spin w-12 h-12 text-purple-600 dark:text-purple-400" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <DashboardHeaderGTS
        session={session}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        handleSignOut={handleSignOut}
        openProfileMenu={openProfileMenu}
        setOpenProfileMenu={setOpenProfileMenu}
        profileMenuRef={profileMenuRef}
      />

      <main className="px-4 pt-24 pb-20 space-y-6">
        {activeTab === "dashboard" && (
          <DashboardContentGTS
            activeMission={activeMission}
            handleNavigation={handleNavigation}
            handleSignalEntry={handleSignalEntry}
            handleSignalReturn={handleSignalReturn}
            setShowIncidentModal={setShowIncidentModal}
            setShowNewMissionModal={setShowNewMissionModal}
            setPanneDialog={setPanneDialog}
            handleStartMission={handleStartMission}
          />
        )}

        {activeTab === "historique" && (
          <div className="py-2">
            {chauffeurId ? (
              <HistoriqueGTS chauffeurId={chauffeurId} structure="gts" />
            ) : (
              <p className="text-center text-gray-500 pt-10">
                ID de chauffeur non disponible. Veuillez vous reconnecter.
              </p>
            )}
          </div>
        )}

        {activeTab === "messages" && (
          <div className="p-6 text-center bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Centre de Messages</h2>
            <p className="text-gray-700 dark:text-gray-200">Bientôt disponible : Chat direct avec le superviseur GTS.</p>
          </div>
        )}

        {activeTab === "vehicule" && (
          <div className="p-6 text-center bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Informations Véhicule</h2>
            <p className="text-gray-700 dark:text-gray-200">Détails, documents et maintenance du véhicule...</p>
          </div>
        )}
      </main>

      <BottomNavigationGTS activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Modals */}
      {showNewMissionModal && activeMission?.statut === "Affectée" && (
        <NewMissionModalGTS
          mission={activeMission}
          setShowModal={setShowNewMissionModal}
          fetchMissions={fetchMissions}
        />
      )}

      {showIncidentModal && activeMission && (
        <IncidentModalGTS
          open={showIncidentModal}
          onClose={() => setShowIncidentModal(false)}
          chauffeurId={chauffeurId}
          missionId={activeMission.id}
        />
      )}

      {panneDialog && (
        <DeclarePanneModal
          open={panneDialog}
          onClose={() => setPanneDialog(false)}
          chauffeurId={chauffeurId}
          missionId={activeMission?.id || null}
          structure="gts"
        />
      )}
    </div>
  );
}
