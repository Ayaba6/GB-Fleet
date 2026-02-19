import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabaseClient.js";
import { 
  LogOut, Truck, ClipboardList, LayoutDashboard, 
  AlertTriangle, Wrench, FileWarning, Receipt,
  Loader2, Menu, X, Sun, Moon 
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";

// Import des sections
import MissionsSectionAdmin from "../components/MissionsSectionAdmin.jsx";
import PannesSection from "../components/PannesSectionAdmin.jsx";
import MaintenanceSection from "../components/MaintenanceSection.jsx";
import AlertesDocuments from "../components/AlertesExpiration.jsx"; 
import BillingExpenses from "../components/BillingExpenses.jsx";
import CarteFlotte from "../components/CarteFlotte.jsx";

// --- UI COMPONENTS ---
const Card = ({ className = "", children }) => <div className={`rounded-xl ${className}`}>{children}</div>;
const CardHeader = ({ className = "", children }) => <div className={`p-4 ${className}`}>{children}</div>;
const CardContent = ({ className = "", children }) => <div className={`p-4 ${className}`}>{children}</div>;

const COLOR_SCHEMES = {
  blue: { text: "text-blue-700 dark:text-blue-300" },
  emerald: { text: "text-emerald-700 dark:text-emerald-300" },
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

export default function SuperviseurDashboardBaticom() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null); 
  const [section, setSection] = useState("dashboard");
  const [stats, setStats] = useState({ missions: 0, pannes: 0, docs: 0, camions: 0 });
  const [camions, setCamions] = useState([]); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const audioRef = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"));

  // --- DARK MODE LOGIC ---
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

  // --- NAVIGATION ET FERMETURE DU MENU ---
  const handleSectionChange = (id) => {
    setSection(id);
    setIsMobileMenuOpen(false); // Ferme le sidebar sur mobile après le clic
  };

  // --- FETCH STATS ---
  const fetchStats = useCallback(async (profile) => {
    const maStructure = "BATICOM"; 
    const tableMissions = "journee_baticom";
    const activeStatus = ["En cours", "En chargement", "En dechargement"];
    
    try {
      const [missionsRes, pannesRes, camionsRes, profilesDocs, camionsDocs] = await Promise.all([
        supabase.from(tableMissions).select("id", { count: 'exact' }).in("statut", activeStatus),
        supabase.from("alertespannes").select("id", { count: 'exact' }).eq("statut", "en_cours").eq("structure", maStructure),
        supabase.from("camions").select("*").eq("structure", maStructure),
        supabase.from("profiles").select("cnib_expiration, permis_expiration, carte_expiration").eq("structure", maStructure),
        supabase.from("camions").select("cartegriseexpiry, assuranceexpiry, visitetechniqueexpiry").eq("structure", maStructure)
      ]);

      const today = new Date();
      let redCount = 0;
      const checkRed = (dateStr) => {
        if (!dateStr) return false;
        const diff = Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24));
        return diff <= 7;
      };

      profilesDocs.data?.forEach(p => {
        if (checkRed(p.cnib_expiration)) redCount++;
        if (checkRed(p.permis_expiration)) redCount++;
        if (checkRed(p.carte_expiration)) redCount++;
      });

      camionsDocs.data?.forEach(c => {
        if (checkRed(c.cartegriseexpiry)) redCount++;
        if (checkRed(c.assuranceexpiry)) redCount++;
        if (checkRed(c.visitetechniqueexpiry)) redCount++;
      });

      setStats({
        missions: missionsRes.count || 0,
        pannes: pannesRes.count || 0,
        camions: camionsRes.data?.length || 0,
        docs: redCount 
      });
      setCamions(camionsRes.data || []);
    } catch (err) {
      console.error("Erreur stats:", err.message);
    }
  }, []);

  // --- REALTIME : Surveillance des pannes ---
  useEffect(() => {
    if (!userProfile) return;
    const maStructure = "BATICOM";
    const channel = supabase
      .channel("realtime-baticom-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alertespannes", filter: `structure=eq.${maStructure}` },
        (payload) => {
          fetchStats(userProfile);
          if (payload.eventType === "INSERT" && payload.new.statut === "en_cours") {
            audioRef.current.play().catch(() => {});
            toast.error(`NOUVELLE PANNE : ${payload.new.typepanne}`, { icon: '🚨', duration: 4000 });
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userProfile, fetchStats]);

  const checkAccess = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { navigate("/login"); return null; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
      
      if (profile?.role !== "superviseur" && profile?.role !== "admin") {
        await supabase.auth.signOut();
        navigate("/login");
        return null;
      }

      const userData = { ...profile, display_name: profile.name || profile.full_name || "Baticom User" };
      setUserProfile(userData);
      setLoading(false);
      return userData;
    } catch (err) {
      setLoading(false);
      return null;
    }
  }, [navigate]);

  useEffect(() => {
    checkAccess().then(profile => { if (profile) fetchStats(profile); });
  }, [checkAccess, fetchStats]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
    </div>
  );

  const isBaticomUI = userProfile?.structure?.toLowerCase() === "baticom";
  const mainColor = isBaticomUI ? "emerald" : "blue";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 font-sans">
      <Toaster position="top-right" />

      {/* OVERLAY MOBILE */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white shadow-2xl transform transition-transform duration-300 md:translate-x-0 md:relative md:flex md:flex-col ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          {/* Bouton fermeture mobile */}
          <div className="md:hidden absolute top-4 right-4">
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white/50 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="p-8 text-center bg-slate-950/40 relative">
            <h1 className={`text-3xl font-black tracking-tighter italic ${isBaticomUI ? "text-emerald-500" : "text-blue-500"}`}>
              {userProfile?.structure?.toUpperCase() || "SYSTEM"}
            </h1>
            <p className="text-[9px] opacity-40 mt-1 uppercase tracking-[0.3em] font-bold">Superviseur Dashboard</p>
          </div>
          
          <nav className="mt-6 flex-1 overflow-y-auto no-scrollbar">
            <ul>
              <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" active={section === "dashboard"} onClick={() => handleSectionChange("dashboard")} color={mainColor} />
              <NavItem id="missions" icon={Truck} label="Missions" active={section === "missions"} onClick={() => handleSectionChange("missions")} color={mainColor} />
              <NavItem id="pannes" icon={AlertTriangle} label="Pannes" active={section === "pannes"} onClick={() => handleSectionChange("pannes")} color={mainColor} />
              <NavItem id="maintenance" icon={Wrench} label="Maintenance" active={section === "maintenance"} onClick={() => handleSectionChange("maintenance")} color={mainColor} />
              <NavItem id="documents" icon={FileWarning} label="Documents" active={section === "documents"} onClick={() => handleSectionChange("documents")} color={mainColor} />
              <NavItem id="billing" icon={Receipt} label="Dépenses" active={section === "billing"} onClick={() => handleSectionChange("billing")} color={mainColor} />
            </ul>
          </nav>
          
          <div className="p-6 space-y-4 bg-slate-950/50 border-t border-white/5">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-white shadow-lg ${isBaticomUI ? "bg-emerald-600" : "bg-blue-600"}`}>
                    {userProfile?.display_name?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-black uppercase ${isBaticomUI ? "text-emerald-400" : "text-blue-400"}`}>Superviseur</p>
                    <p className="text-xs truncate font-bold text-white/90">{userProfile?.display_name}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={toggleDarkMode} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all flex justify-center">
                  {darkMode ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className={isBaticomUI ? "text-emerald-400" : "text-blue-400"} />}
                </button>
                <button onClick={() => supabase.auth.signOut().then(() => navigate("/login"))} className="p-3 bg-red-500/10 rounded-xl hover:bg-red-500 text-red-500 hover:text-white transition-all flex justify-center">
                  <LogOut size={16} />
                </button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-slate-600 dark:text-slate-300" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white italic">
               {section === "dashboard" ? `Vue d'ensemble ${userProfile?.structure}` : section.toUpperCase()}
            </h2>
          </div>
          <div className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${isBaticomUI ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"}`}>
            {userProfile?.structure}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {section === "dashboard" ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Missions Actives" value={stats.missions} icon={Truck} color={mainColor} onClick={() => handleSectionChange("missions")} />
                  <StatCard title="Flotte Camions" value={stats.camions} icon={ClipboardList} color="blue" onClick={() => handleSectionChange("maintenance")} />
                  <StatCard title="Pannes Alertes" value={stats.pannes} icon={AlertTriangle} color="red" blink={stats.pannes > 0} onClick={() => handleSectionChange("pannes")} />
                  <StatCard title="Documents Rouges" value={stats.docs} icon={FileWarning} color="purple" blink={stats.docs > 0} onClick={() => handleSectionChange("documents")} />
                </div>

                <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <CardHeader className="border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Localisation Flotte {userProfile?.structure}</h3>
                    <div className="flex items-center gap-2">
                        <span className={`flex h-2 w-2 rounded-full animate-pulse ${isBaticomUI ? "bg-emerald-500" : "bg-blue-500"}`}></span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Live Track</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 h-[500px]">
                      <CarteFlotte camions={camions} center={[12.37, -1.53]} />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {section === "missions" && <MissionsSectionAdmin structure={userProfile?.structure} />}
                {section === "pannes" && <PannesSection structure={userProfile?.structure} />}
                {section === "maintenance" && <MaintenanceSection camions={camions} />}
                {section === "documents" && <AlertesDocuments role="superviseur" structure={userProfile?.structure} />}
                {section === "billing" && <BillingExpenses structure={userProfile?.structure} />}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// NavItem composant interne
const NavItem = ({ id, icon: Icon, label, active, onClick, color }) => (
  <li 
    onClick={onClick}
    className={`px-6 py-4 flex items-center gap-3 cursor-pointer transition-all ${
      active 
      ? `bg-${color}-600/10 border-l-4 border-${color}-500 text-${color}-500` 
      : "text-slate-400 hover:bg-white/5 hover:text-white"
    }`}
  >
    <Icon size={20} />
    <span className="font-bold text-[10px] uppercase tracking-[0.15em]">{label}</span>
  </li>
);