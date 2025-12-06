import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabaseClient.js";

import {
  Users,
  Truck,
  ClipboardList,
  Wrench,
  FileWarning,
  Sun,
  Moon,
  Menu,
  Loader2,
  GaugeCircle
} from "lucide-react";

import AdminSidebar from "../components/AdminSidebar.jsx";
import UserSection from "../components/UserSection.jsx";
import CamionsSection from "../components/CamionsSection.jsx";
import MissionsSection from "../components/MissionsSectionAdmin.jsx";
import PannesDeclarees from "../components/PannesSectionAdmin.jsx";
import AlertesExpiration from "../components/AlertesExpiration.jsx";
import CarteFlotte from "../components/CarteFlotte.jsx";
import BillingExpenses from "../components/BillingExpenses.jsx";

// ShadCN mock components
const Card = ({ className = "", children }) => (
  <div className={`rounded-xl ${className}`}>{children}</div>
);

const CardHeader = ({ className = "", children }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

const CardContent = ({ className = "", children }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

// Sections titles
const SECTION_TITLES = {
  dashboard: "Tableau de Bord",
  users: "Gestion des Utilisateurs",
  camions: "Gestion de la Flotte",
  missions: "Missions",
  pannes: "Pannes Déclarées",
  documents: "Alertes Documents",
  billing: "Facturation et Dépenses",
};

// Colors
const COLOR_SCHEMES = {
  blue: { text: "text-blue-700 dark:text-blue-300" },
  green: { text: "text-green-700 dark:text-green-300" },
  orange: { text: "text-orange-700 dark:text-orange-300" },
  red: { text: "text-red-700 dark:text-red-300" },
  purple: { text: "text-purple-700 dark:text-purple-300" },
};

// Card Component
const StatCard = ({ title, value, icon: Icon, color, onClick }) => {
  const scheme = COLOR_SCHEMES[color] || COLOR_SCHEMES.blue;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-6 rounded-xl 
      border border-gray-200 dark:border-gray-700
      bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
      hover:shadow-2xl hover:scale-[1.03] transition-all
      w-full text-center group"
    >
      <Icon
        className={`w-10 h-10 mb-2 ${scheme.text} group-hover:rotate-6 transition-transform`}
      />
      <h3 className={`font-semibold text-lg mb-1 ${scheme.text}`}>
        {title}
      </h3>
      <p className={`text-3xl font-extrabold ${scheme.text}`}>
        {value}
      </p>
    </button>
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    users: 0,
    camions: 0,
    missions: 0,
    pannes: 0
  });

  const [camions, setCamions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Dark mode init
  useEffect(() => {
    const stored = localStorage.getItem("darkMode");
    const initial =
      stored ? stored === "true" :
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    setDarkMode(initial);
    document.documentElement.classList.toggle("dark", initial);
  }, []);

  const toggleDarkMode = () => {
    const mode = !darkMode;
    setDarkMode(mode);
    document.documentElement.classList.toggle("dark", mode);
    localStorage.setItem("darkMode", mode);
  };

  // ✅ FETCH DASHBOARD DATA
  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return navigate("/login");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (!profile || profile.role !== "admin") {
        await supabase.auth.signOut();
        return navigate("/login");
      }

      setUser({
        ...authUser,
        full_name: profile.full_name || authUser.email,
        avatar: profile.avatar_url
      });

      const [
        usersRes,
        camionsRes,
        missionsBaticomRes,
        missionsGtsRes,
        pannesRes
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),

        supabase.from("camions").select("*"),

        supabase.from("journee_baticom")
          .select("id", { count: "exact", head: true }),

        supabase.from("missions_gts")
          .select("id", { count: "exact", head: true }),

        supabase.from("alertespannes")
          .select("id", { count: "exact", head: true })
      ]);

      const totalMissions =
        (missionsBaticomRes.count || 0) +
        (missionsGtsRes.count || 0);

      setStats({
        users: usersRes.count || 0,
        camions: camionsRes.data?.length || 0,
        missions: totalMissions,
        pannes: pannesRes.count || 0
      });

      setCamions(camionsRes.data || []);

    } catch (e) {
      console.error("Erreur fetch dashboard:", e);
    }

    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-900">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const sectionsMap = {
    dashboard: (
      <div className="space-y-6 w-full">

        <Card className="shadow-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 w-full backdrop-blur-sm">
          <CardHeader>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              <GaugeCircle size={24} className="text-blue-600 dark:text-blue-400" />
              Tableau de Bord Synthétique
            </h2>
          </CardHeader>
        </Card>

        <Card className="shadow-lg p-4 bg-white/80 dark:bg-gray-800/80 border w-full backdrop-blur-sm">
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard
                title="Utilisateurs"
                value={stats.users}
                icon={Users}
                color="blue"
                onClick={() => setSection("users")}
              />
              <StatCard
                title="Flotte"
                value={stats.camions}
                icon={Truck}
                color="green"
                onClick={() => setSection("camions")}
              />
              <StatCard
                title="Missions"
                value={stats.missions}
                icon={ClipboardList}
                color="orange"
                onClick={() => setSection("missions")}
              />
              <StatCard
                title="Pannes"
                value={stats.pannes}
                icon={Wrench}
                color="red"
                onClick={() => setSection("pannes")}
              />
              <StatCard
                title="Docs"
                value={""}
                icon={FileWarning}
                color="purple"
                onClick={() => setSection("documents")}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg p-4 bg-white/80 dark:bg-gray-800/80 border w-full">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Localisation de la Flotte
            </h3>
          </CardHeader>
          <CardContent>
            <div className="h-80 rounded-xl overflow-hidden border">
              <CarteFlotte camions={camions} center={[12.37, -1.53]} />
            </div>
          </CardContent>
        </Card>

      </div>
    ),

    users: <UserSection />,
    camions: <CamionsSection />,
    missions: <MissionsSection />,
    pannes: <PannesDeclarees />,
    documents: <AlertesExpiration />,
    billing: <BillingExpenses />
  };

  return (
    <div className="relative min-h-screen bg-gray-100 dark:bg-gray-900 w-full">

      <AdminSidebar
        user={user}
        section={section}
        setSection={setSection}
        handleLogout={handleLogout}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 w-full md:pl-72">

        <header className="bg-white/80 dark:bg-gray-800/80 shadow px-6 py-4 flex justify-between items-center sticky top-0 z-10 w-full backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden p-2 rounded-lg 
                bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm transition-all
                hover:bg-white/80 dark:hover:bg-gray-700/80" 
            >
              <Menu className="w-6 h-6 text-gray-800 dark:text-gray-100" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {SECTION_TITLES[section]}
            </h1>
          </div>

          <button 
            onClick={toggleDarkMode} 
            className="p-2 rounded-lg 
              bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm transition-all
              hover:bg-white/80 dark:hover:bg-gray-700/80" 
          >
            {darkMode
              ? <Sun className="w-6 h-6 text-yellow-400" />
              : <Moon className="w-6 h-6 text-gray-700 dark:text-gray-100" />
            }
          </button>
        </header>

        <main className="flex-1 w-full overflow-y-auto px-6 py-4">
          {/* CONTENEUR DE LARGEUR MAXIMALE ET CENTRÉ (max-w-7xl) */}
          <div className="max-w-7xl mx-auto">
            {sectionsMap[section]}
          </div>
        </main>

      </div>
    </div>
  );
}