// src/pages/AdminDashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabaseClient.js";
import { 
  Users, Truck, ClipboardList, Wrench, FileWarning, Sun, Moon 
} from "lucide-react";
import AdminSidebar from "../components/AdminSidebar.jsx";
import UserSection from "../components/UserSection.jsx";
import CamionsSection from "../components/CamionsSection.jsx";
import MissionsSection from "../components/MissionsSectionAdmin.jsx";
import PannesDeclarees from "../components/PannesDeclarees.jsx";
import AlertesExpiration from "../components/AlertesExpiration.jsx";
import CarteFlotte from "../components/CarteFlotte.jsx";
import BillingExpenses from "../components/BillingExpenses.jsx";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, camions: 0, missions: 0 });
  const [camions, setCamions] = useState([]);
  const [section, setSection] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    document.body.classList.toggle("dark");
    setDarkMode(!darkMode);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) return navigate("/login");
      setUser({
        ...authUser,
        full_name: authUser.user_metadata?.full_name || authUser.email,
        avatar: authUser.user_metadata?.avatar_url || null
      });

      const [usersRes, camionsRes, missionsRes] = await Promise.all([
        supabase.from("profiles").select("id"),
        supabase.from("camions").select("*"),
        supabase.from("missions").select("id"),
      ]);

      setStats({
        users: usersRes.data?.length || 0,
        camions: camionsRes.data?.length || 0,
        missions: missionsRes.data?.length || 0,
      });
      setCamions(camionsRes.data || []);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("camions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "camions" }, (payload) => {
        setCamions(prev => {
          const payloadNew = payload.new || payload.old;
          if (!payloadNew) return prev;
          switch(payload.eventType) {
            case "DELETE": return prev.filter(c => c.id !== payloadNew.id);
            case "UPDATE": return prev.map(c => (c.id === payloadNew.id ? payload.new : c));
            case "INSERT": return [payload.new, ...prev];
            default: return prev;
          }
        });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchData]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/login");
  }, [navigate]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center animate-pulse">
          <div className="rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
          <p className="text-gray-500 dark:text-gray-300 mt-4 font-medium">Chargement des données...</p>
        </div>
      </div>
    );

  const StatCard = ({ title, value, icon: Icon, color = "blue", onClick }) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 sm:p-6 rounded-xl shadow-md bg-${color}-50 dark:bg-${color}-900 
      hover:shadow-xl hover:scale-[1.02] transition w-full text-center`}
    >
      <Icon className={`w-8 h-8 sm:w-10 sm:h-10 mb-2 text-${color}-600 dark:text-${color}-300`} />
      <h3 className={`font-semibold text-sm sm:text-lg mb-1 text-${color}-800 dark:text-${color}-100`}>{title}</h3>
      {value !== undefined && (
        <p className={`text-lg sm:text-2xl font-extrabold text-${color}-700 dark:text-${color}-200`}>
          {value}
        </p>
      )}
    </button>
  );

  const sectionsMap = {
    users: <UserSection />,
    camions: <CamionsSection />,
    missions: <MissionsSection />,
    pannes: <PannesDeclarees />,
    documents: <AlertesExpiration />,
    billing: <BillingExpenses />,
    dashboard: (
      <>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 sm:mb-6">
          Localisation de la Flotte
        </h2>
        <div className="h-64 sm:h-80 md:h-96 w-full rounded-xl shadow-lg overflow-hidden mb-6 border border-gray-200 dark:border-gray-700">
          <CarteFlotte camions={camions} center={[12.37, -1.53]} />
        </div>

        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 mt-6">
          Statistiques Clés
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          <StatCard title="Utilisateurs" value={stats.users} icon={Users} color="blue" onClick={() => setSection("users")} />
          <StatCard title="Véhicules" value={stats.camions} icon={Truck} color="green" onClick={() => setSection("camions")} />
          <StatCard title="Missions" value={stats.missions} icon={ClipboardList} color="orange" onClick={() => setSection("missions")} />
          <StatCard title="Alertes Pannes" icon={Wrench} color="red" onClick={() => setSection("pannes")} />
          <StatCard title="Alertes Documents" icon={FileWarning} color="purple" onClick={() => setSection("documents")} />
        </div>
      </>
    )
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 dark:bg-gray-900 overflow-x-hidden">
      <AdminSidebar
        user={user}
        section={section}
        setSection={setSection}
        handleLogout={handleLogout}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />

      <div className="flex-1 flex flex-col w-full md:w-auto">
        <header className="bg-white dark:bg-gray-800 sticky top-0 z-40 shadow-sm px-3 sm:px-6 py-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-blue-900 dark:text-gray-200 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
            >
              ☰
            </button>
            <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900 dark:text-white truncate">
              {section === "dashboard" ? "Tableau de Bord" : section.charAt(0).toUpperCase() + section.slice(1)}
            </h1>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            {darkMode ? <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" /> : <Moon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800 dark:text-gray-200" />}
          </button>
        </header>

        <main className="flex-1 flex flex-col p-3 sm:p-6 md:p-8 animate-fadeIn max-w-full">
          {sectionsMap[section] || sectionsMap.dashboard}
        </main>
      </div>
    </div>
  );
}
