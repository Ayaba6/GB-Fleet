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
  GaugeCircle // Ajout de GaugeCircle
} from "lucide-react";

import AdminSidebar from "../components/AdminSidebar.jsx";
import UserSection from "../components/UserSection.jsx"; // Assurez-vous que ce fichier existe
import CamionsSection from "../components/CamionsSection.jsx"; // Assurez-vous que ce fichier existe
import MissionsSection from "../components/MissionsSectionAdmin.jsx"; // Assurez-vous que ce fichier existe
import PannesDeclarees from "../components/PannesDeclarees.jsx"; // Assurez-vous que ce fichier existe
import AlertesExpiration from "../components/AlertesExpiration.jsx"; // Assurez-vous que ce fichier existe
import CarteFlotte from "../components/CarteFlotte.jsx"; // Assurez-vous que ce fichier existe
import BillingExpenses from "../components/BillingExpenses.jsx"; // Assurez-vous que ce fichier existe

// Composants Shadcn/UI mockés (assurez-vous d'avoir les imports corrects pour vos vrais composants)
const Card = ({ className = "", children }) => <div className={`rounded-xl ${className}`}>{children}</div>;
const CardHeader = ({ className = "", children }) => <div className={`p-4 ${className}`}>{children}</div>;
const CardContent = ({ className = "", children }) => <div className={`p-4 ${className}`}>{children}</div>;


// TITRES DES SECTIONS
const SECTION_TITLES = {
  dashboard: "Tableau de Bord",
  users: "Gestion des Utilisateurs",
  camions: "Gestion de la Flotte",
  missions: "Missions",
  pannes: "Pannes Déclarées",
  documents: "Alertes Documents",
  billing: "Facturation et Dépenses",
};

// STAT CARD
const COLOR_SCHEMES = {
  blue: { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-700 dark:text-blue-300" },
  green: { bg: "bg-green-100 dark:bg-green-900", text: "text-green-700 dark:text-green-300" },
  orange: { bg: "bg-orange-100 dark:bg-orange-900", text: "text-orange-700 dark:text-orange-300" },
  red: { bg: "bg-red-100 dark:bg-red-900", text: "text-red-700 dark:text-red-300" },
  purple: { bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-700 dark:text-purple-300" }
};

const StatCard = ({ title, value, icon: Icon, color, onClick }) => {
  const scheme = COLOR_SCHEMES[color] || COLOR_SCHEMES.blue;

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 
        ${scheme.bg} hover:shadow-2xl hover:scale-[1.03] transition-all w-full text-center group`}
    >
      <Icon className={`w-10 h-10 mb-2 ${scheme.text} group-hover:rotate-6 transition-transform`} />
      <h3 className={`font-semibold text-lg mb-1 ${scheme.text}`}>{title}</h3>
      {value !== undefined && (
        <p className={`text-3xl font-extrabold ${scheme.text}`}>{value}</p>
      )}
    </button>
  );
};

// ADMIN DASHBOARD
export default function AdminDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ users: 0, camions: 0, missions: 0 });
  const [camions, setCamions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // DARK MODE INIT
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

  // FETCH DATA
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

  // SECTIONS
  const sectionsMap = {
    dashboard: (
      <div className="space-y-6">
        
        {/* En-tête du Dashboard */}
        <Card className="shadow-lg bg-white/90 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              <GaugeCircle size={24} className="text-blue-600 dark:text-blue-400" /> Tableau de Bord Synthétique
            </h2>
          </CardHeader>
        </Card>

        {/* STATISTIQUES CLÉS (dans une Card cohérente) */}
        <Card className="shadow-lg p-4 bg-white/90 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="px-0 pt-0 pb-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Indicateurs Principaux</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard title="Utilisateurs" value={stats.users} icon={Users} color="blue" onClick={() => setSection("users")} />
              <StatCard title="Flotte" value={stats.camions} icon={Truck} color="green" onClick={() => setSection("camions")} />
              <StatCard title="Missions" value={stats.missions} icon={ClipboardList} color="orange" onClick={() => setSection("missions")} />
              <StatCard title="Pannes" icon={Wrench} color="red" onClick={() => setSection("pannes")} />
              <StatCard title="Docs" icon={FileWarning} color="purple" onClick={() => setSection("documents")} />
            </div>
          </CardContent>
        </Card>
        
        {/* CARTE FLOTTE */}
        <Card className="shadow-lg p-4 bg-white/90 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
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
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">

      {/* SIDEBAR */}
      <AdminSidebar
        user={user}
        section={section}
        setSection={(s) => { setSection(s); setMenuOpen(false); }}
        handleLogout={handleLogout}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />

      {/* CONTENU PRINCIPAL */}
      <div className="flex-1 flex flex-col md:ml-72 transition-all duration-300 min-w-0">
        {/* ^-- min-w-0 garantit que le contenu s'étire correctement */}

        {/* HEADER */}
        <header className="bg-white dark:bg-gray-800 shadow px-6 py-4 flex justify-between items-center border-b border-gray-300 dark:border-gray-700 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 z-50"
            >
              <Menu className="w-6 h-6 text-gray-900 dark:text-gray-100" />
            </button>
            <h1 className="text-xl font-bold dark:text-white">
              {SECTION_TITLES[section]}
            </h1>
          </div>

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {darkMode ? <Sun className="w-6 h-6 text-yellow-300" /> : <Moon className="w-6 h-6 text-gray-900 dark:text-gray-200" />}
          </button>
        </header>

        {/* CONTENU */}
        <main className="flex-1 p-3 sm:p-6 overflow-y-auto z-0 animate-fadeInUp">
          <div className="container mx-auto"> 
            {sectionsMap[section]}
          </div>
        </main>

      </div>
    </div>
  );
}