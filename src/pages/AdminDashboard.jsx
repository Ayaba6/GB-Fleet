// src/pages/AdminDashboard.jsx
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
const Card = ({ className = "", children }) => <div className={`rounded-xl ${className}`}>{children}</div>;
const CardHeader = ({ className = "", children }) => <div className={`p-4 ${className}`}>{children}</div>;
const CardContent = ({ className = "", children }) => <div className={`p-4 ${className}`}>{children}</div>;

// Sections & colors
const SECTION_TITLES = {
  dashboard: "Tableau de Bord",
  users: "Gestion des Utilisateurs",
  camions: "Gestion de la Flotte",
  missions: "Missions",
  pannes: "Pannes Déclarées",
  documents: "Alertes Documents",
  billing: "Facturation et Dépenses",
};

const COLOR_SCHEMES = {
  blue: { text: "text-blue-700 dark:text-blue-300" },
  green: { text: "text-green-700 dark:text-green-300" },
  orange: { text: "text-orange-700 dark:text-orange-300" },
  red: { text: "text-red-700 dark:text-red-300" },
  purple: { text: "text-purple-700 dark:text-purple-300" }
};

// StatCard avec fond semi-transparent glassmorphism
const StatCard = ({ title, value, icon: Icon, color, onClick }) => {
  const scheme = COLOR_SCHEMES[color] || COLOR_SCHEMES.blue;
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-6 rounded-xl border border-gray-200 dark:border-gray-700
        bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-2xl hover:scale-[1.03] transition-all w-full text-center group`}
    >
      <Icon className={`w-10 h-10 mb-2 ${scheme.text} group-hover:rotate-6 transition-transform`} />
      <h3 className={`font-semibold text-lg mb-1 ${scheme.text}`}>{title}</h3>
      {value !== undefined && <p className={`text-3xl font-extrabold ${scheme.text}`}>{value}</p>}
    </button>
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ users: 0, camions: 0, missions: 0 });
  const [camions, setCamions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("darkMode");
    const initial = stored ? stored === "true" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(initial);
    document.documentElement.classList.toggle("dark", initial);
  }, []);

  const toggleDarkMode = () => {
    const mode = !darkMode;
    setDarkMode(mode);
    document.documentElement.classList.toggle("dark", mode);
    localStorage.setItem("darkMode", mode);
  };

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

      setUser({ ...authUser, full_name: profile.full_name || authUser.email, avatar: profile.avatar_url });

      const [usersRes, camionsRes, missionsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("camions").select("*"),
        supabase.from("missions").select("id", { count: "exact" }),
      ]);

      setStats({
        users: usersRes.count || 0,
        camions: camionsRes.data?.length || 0,
        missions: missionsRes.count || 0,
      });

      setCamions(camionsRes.data || []);
    } catch (e) {
      console.error("Erreur fetch dashboard:", e);
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              <GaugeCircle size={24} className="text-blue-600 dark:text-blue-400" /> Tableau de Bord Synthétique
            </h2>
          </CardHeader>
        </Card>

        <Card className="shadow-lg p-4 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 w-full backdrop-blur-sm">
          <CardHeader className="px-0 pt-0 pb-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Indicateurs Principaux</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard title="Utilisateurs" value={stats.users} icon={Users} color="blue" onClick={() => setSection("users")} />
              <StatCard title="Flotte" value={stats.camions} icon={Truck} color="green" onClick={() => setSection("camions")} />
              <StatCard title="Missions" value={stats.missions} icon={ClipboardList} color="orange" onClick={() => setSection("missions")} />
              <StatCard title="Pannes" icon={Wrench} color="red" onClick={() => setSection("pannes")} />
              <StatCard title="Docs" icon={FileWarning} color="purple" onClick={() => setSection("documents")} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg p-4 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 w-full backdrop-blur-sm">
          <CardHeader className="px-0 pt-0 pb-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Localisation en Temps Réel</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-80 rounded-xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-700">
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
    billing: <BillingExpenses />,
  };

  return (
    <div className="relative min-h-screen bg-gray-100 dark:bg-gray-900 w-full">

      {/* Sidebar */}
      <AdminSidebar
        user={user}
        section={section}
        setSection={(s) => { setSection(s); setMenuOpen(false); }}
        handleLogout={handleLogout}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 w-full transition-all duration-300 md:pl-72">

        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow px-6 py-4 flex justify-between items-center border-b border-gray-300 dark:border-gray-700 sticky top-0 z-10 w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 z-50"
            >
              <Menu className="w-6 h-6 text-gray-900 dark:text-gray-100" />
            </button>
            <h1 className="text-xl font-bold dark:text-white">{SECTION_TITLES[section]}</h1>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
          >
            {darkMode ? <Sun className="w-6 h-6 text-yellow-300" /> : <Moon className="w-6 h-6 text-gray-900 dark:text-gray-200" />}
          </button>
        </header>

        {/* Main */}
        <main className="flex-1 w-full overflow-y-auto px-6 py-3 animate-fadeInUp">
          {sectionsMap[section]}
        </main>

      </div>
    </div>
  );
}
