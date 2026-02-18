import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabaseClient.js";
import { 
  LogOut, Truck, ClipboardList, LayoutDashboard, 
  AlertTriangle, Wrench, FileWarning, Receipt,
  Loader2, Menu, X, Sun, Moon, GaugeCircle 
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";

// Import des sections
import MissionsSectionAdmin from "../components/MissionsSectionAdmin.jsx";
import PannesSection from "../components/PannesSectionAdmin.jsx";
import MaintenanceSection from "../components/MaintenanceSection.jsx";
import AlertesDocuments from "../components/AlertesExpiration.jsx"; 
import BillingExpenses from "../components/BillingExpenses.jsx";
import CarteFlotte from "../components/CarteFlotte.jsx";

// --- UI COMPONENTS (Style Admin) ---
const Card = ({ className = "", children }) => <div className={`rounded-xl ${className}`}>{children}</div>;
const CardHeader = ({ className = "", children }) => <div className={`p-4 ${className}`}>{children}</div>;
const CardContent = ({ className = "", children }) => <div className={`p-4 ${className}`}>{children}</div>;

const COLOR_SCHEMES = {
  blue: { text: "text-blue-700 dark:text-blue-300" },
  green: { text: "text-green-700 dark:text-green-300" },
  orange: { text: "text-orange-700 dark:text-orange-300" },
  red: { text: "text-red-700 dark:text-red-400" },
  purple: { text: "text-purple-700 dark:text-purple-300" },
};

const StatCard = ({ title, value, icon: Icon, color, onClick, blink = false }) => {
  const scheme = COLOR_SCHEMES[color] || COLOR_SCHEMES.blue;
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-2xl hover:scale-[1.03] transition-all w-full text-center group relative ${blink ? "border-red-500 ring-2 ring-red-500/20" : ""}`}
    >
      {blink && <span className="absolute top-2 right-2 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
      <Icon className={`w-10 h-10 mb-2 ${blink ? "text-red-600 animate-pulse" : scheme.text} group-hover:rotate-6 transition-transform`} />
      <h3 className={`font-semibold text-xs uppercase tracking-wider mb-1 ${scheme.text}`}>{title}</h3>
      <p className={`text-3xl font-extrabold ${scheme.text}`}>{value}</p>
    </button>
  );
};

const SECTION_TITLES = {
  dashboard: "Tableau de Bord GTS",
  missions: "Suivi des Missions GTS",
  pannes: "Pannes & Réparations",
  maintenance: "Entretien Véhicules",
  documents: "Validité Documents",
  billing: "Frais & Facturation",
};

export default function SuperviseurDashboardGTS() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null); 
  const [section, setSection] = useState("dashboard");
  const [stats, setStats] = useState({ missions: 0, pannes: 0, docs: 0, camions: 0 });
  const [camions, setCamions] = useState([]); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("darkMode");
    const initial = stored ? stored === "true" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(initial);
    document.documentElement.classList.toggle("dark", initial);
  }, []);

  const checkAccess = useCallback(async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) { navigate("/login"); return null; }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();

      if (profile?.role !== "superviseur" && profile?.role !== "admin") {
        await supabase.auth.signOut();
        navigate("/login");
        return null;
      }

      const userData = { ...profile, display_name: profile.full_name || authUser.email || "Utilisateur GTS" };
      setUserProfile(userData);
      setLoading(false);
      return userData;
    } catch (err) {
      setLoading(false);
      return null;
    }
  }, [navigate]);

  const fetchStats = useCallback(async () => {
    const maStructure = "GTS"; 
    const activeStatus = ["En cours", "En chargement", "En dechargement"];
    
    try {
      const [missionsRes, pannesRes, camionsRes] = await Promise.all([
        supabase.from("missions_gts").select("id", { count: 'exact' }).in("statut", activeStatus),
        supabase.from("alertespannes").select("id", { count: 'exact' }).eq("statut", "en_cours").eq("structure", maStructure),
        supabase.from("camions").select("*").eq("structure", maStructure)
      ]);

      setStats({
        missions: missionsRes.count || 0,
        pannes: pannesRes.count || 0,
        camions: camionsRes.count || (camionsRes.data?.length || 0),
        docs: 0 // Logique d'alerte document peut être ajoutée ici
      });
      setCamions(camionsRes.data || []);
    } catch (err) {
      console.error("Erreur stats:", err.message);
    }
  }, []);

  useEffect(() => {
    checkAccess().then(profile => { if (profile) fetchStats(); });
  }, [checkAccess, fetchStats]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const NavItem = ({ id, icon: Icon, label }) => (
    <li 
      onClick={() => { setSection(id); setIsMobileMenuOpen(false); }}
      className={`px-6 py-4 flex items-center gap-3 cursor-pointer transition-all ${
        section === id 
        ? "bg-blue-600/10 border-l-4 border-blue-500 text-blue-400" 
        : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon size={20} />
      <span className="font-bold text-[10px] uppercase tracking-[0.15em]">{label}</span>
    </li>
  );

  return (
    <div className={`flex min-h-screen ${darkMode ? 'dark' : ''} bg-gray-50 dark:bg-gray-950 font-sans`}>
      <Toaster position="top-right" />

      {/* Sidebar (Logique Sidebar GTS originale, Design Amélioré) */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-white shadow-2xl transform transition-transform duration-300
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static
      `}>
        <div className="flex flex-col h-full">
          <div className="p-8 text-center bg-slate-950/40">
            <h1 className="text-3xl font-black tracking-tighter text-blue-500">GTS</h1>
            <p className="text-[9px] text-blue-300/40 mt-1 uppercase tracking-[0.3em] font-bold">Logistics Division</p>
          </div>
          
          <nav className="mt-6 flex-1">
            <ul>
              <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
              <NavItem id="missions" icon={Truck} label="Missions" />
              <NavItem id="pannes" icon={AlertTriangle} label="Pannes" />
              <NavItem id="maintenance" icon={Wrench} label="Maintenance" />
              <NavItem id="documents" icon={FileWarning} label="Documents" />
              <NavItem id="billing" icon={Receipt} label="Dépenses" />
            </ul>
          </nav>
          
          {/* Profil Emplacement Admin-Style */}
          <div className="p-6 space-y-4 bg-slate-950/50 border-t border-white/5">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20">
                    {userProfile?.display_name?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-blue-400 font-black uppercase">Superviseur</p>
                    <p className="text-xs truncate font-bold text-white/90">{userProfile?.display_name}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => {
                    const mode = !darkMode;
                    setDarkMode(mode);
                    document.documentElement.classList.toggle("dark", mode);
                    localStorage.setItem("darkMode", mode);
                }} className="flex items-center justify-center p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5">
                {darkMode ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-blue-400" />}
                </button>
                <button onClick={handleLogout} className="flex items-center justify-center p-3 bg-red-500/10 rounded-xl hover:bg-red-500 transition-all border border-red-500/20 text-red-500 hover:text-white">
                <LogOut size={16} />
                </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Harmonisé Admin */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-gray-600" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
               {SECTION_TITLES[section]}
            </h2>
          </div>
          <div className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black tracking-widest uppercase">
            Branche GTS
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {section === "dashboard" ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                
                {/* Header Card Style Admin */}
                <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <CardHeader>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
                      <GaugeCircle size={24} className="text-blue-600" /> 
                      Vue d'ensemble GTS
                    </h2>
                  </CardHeader>
                </Card>

                {/* StatCards Harmonisé Admin */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Missions Actives" value={stats.missions} icon={Truck} color="blue" onClick={() => setSection("missions")} />
                  <StatCard title="Flotte Camions" value={stats.camions} icon={ClipboardList} color="green" onClick={() => setSection("maintenance")} />
                  <StatCard title="Pannes Alertes" value={stats.pannes} icon={AlertTriangle} color="red" blink={stats.pannes > 0} onClick={() => setSection("pannes")} />
                  <StatCard title="Documents" value={stats.docs} icon={FileWarning} color="purple" onClick={() => setSection("documents")} />
                </div>

                {/* Carte de Flotte Intégrée */}
                <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <CardHeader className="border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Localisation Flotte GTS</h3>
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Live Update</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 sm:p-4">
                    <div className="h-96 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                      <CarteFlotte camions={camions} center={[12.37, -1.53]} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {section === "missions" && <MissionsSectionAdmin structure="GTS" />}
                {section === "pannes" && <PannesSection structure="GTS" />}
                {section === "maintenance" && <MaintenanceSection camions={camions} />}
                {section === "documents" && <AlertesDocuments role="superviseur" structure="GTS" />}
                {section === "billing" && <BillingExpenses structure="GTS" />}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}