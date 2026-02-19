import React, { useEffect, useState, useCallback, useRef } from "react";
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

// --- UI COMPONENTS ---
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

export default function SuperviseurDashboardGTS() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null); 
  const [section, setSection] = useState("dashboard");
  const [stats, setStats] = useState({ missions: 0, pannes: 0, docs: 0, camions: 0 });
  const [camions, setCamions] = useState([]); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const audioRef = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"));

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

  const fetchStats = useCallback(async () => {
    const maStructure = "GTS"; 
    const activeStatus = ["En Cours", "En Chargement", "En Déchargement"];
    
    try {
      const [missionsRes, pannesRes, camionsRes, profilesDocs, camionsDocs] = await Promise.all([
        supabase.from("missions_gts").select("id", { count: 'exact' }).in("statut", activeStatus),
        supabase.from("alertespannes").select("id", { count: 'exact' }).eq("statut", "en_cours").eq("structure", maStructure),
        supabase.from("camions").select("*").eq("structure", maStructure),
        supabase.from("profiles").select("cnib_expiration, permis_expiration, carte_expiration").eq("structure", maStructure),
        supabase.from("camions").select("cartegriseexpiry, assuranceexpiry, visitetechniqueexpiry").eq("structure", maStructure)
      ]);

      const today = new Date();
      let redDocsCount = 0;
      const isRed = (dateStr) => {
        if (!dateStr) return false;
        const diff = Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24));
        return diff <= 7;
      };

      profilesDocs.data?.forEach(p => {
        if (isRed(p.cnib_expiration)) redDocsCount++;
        if (isRed(p.permis_expiration)) redDocsCount++;
        if (isRed(p.carte_expiration)) redDocsCount++;
      });

      camionsDocs.data?.forEach(c => {
        if (isRed(c.cartegriseexpiry)) redDocsCount++;
        if (isRed(c.assuranceexpiry)) redDocsCount++;
        if (isRed(c.visitetechniqueexpiry)) redDocsCount++;
      });

      const pannesCount = pannesRes.count || 0;

      // Alerte sonore au chargement initial si alertes présentes
      if (redDocsCount > 0 || pannesCount > 0) {
        audioRef.current.play().catch(() => console.log("Audio en attente d'interaction"));
      }

      setStats({
        missions: missionsRes.count || 0,
        pannes: pannesCount,
        camions: camionsRes.data?.length || 0,
        docs: redDocsCount 
      });
      setCamions(camionsRes.data || []);
    } catch (err) {
      console.error("Erreur stats:", err.message);
    }
  }, []);

  // --- MISE À JOUR : REALTIME POUR LES COMPTEURS DASHBOARD ---
  useEffect(() => {
    const maStructure = "GTS";
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alertespannes", filter: `structure=eq.${maStructure}` },
        (payload) => {
          // On rafraîchit les compteurs si une panne est ajoutée, modifiée ou supprimée
          fetchStats();
          if (payload.eventType === "INSERT" && payload.new.statut === "en_cours") {
            audioRef.current.play().catch(() => {});
            toast.error("🚨 NOUVELLE PANNE SIGNALÉE !");
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchStats]);

  const checkAccess = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { navigate("/login"); return null; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
      if (profile?.role !== "superviseur" && profile?.role !== "admin") {
        navigate("/login"); return null;
      }
      setUserProfile({ ...profile, display_name: profile.name || profile.full_name || "GTS User" });
      setLoading(false);
      return profile;
    } catch (err) {
      setLoading(false); return null;
    }
  }, [navigate]);

  useEffect(() => {
    checkAccess().then(profile => { if (profile) fetchStats(); });
  }, [checkAccess, fetchStats]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 font-sans">
      <Toaster position="top-right" />
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 md:translate-x-0 md:relative md:flex md:flex-col ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-8 text-center bg-slate-950/40">
           <h1 className="text-3xl font-black text-blue-500">GTS</h1>
           <p className="text-[9px] opacity-40 uppercase tracking-[0.3em]">Superviseur Dashboard</p>
        </div>
        <nav className="mt-6 flex-1 overflow-y-auto">
          <ul>
            <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" active={section === "dashboard"} onClick={() => setSection("dashboard")} />
            <NavItem id="missions" icon={Truck} label="Missions" active={section === "missions"} onClick={() => setSection("missions")} />
            <NavItem id="pannes" icon={AlertTriangle} label="Pannes" active={section === "pannes"} onClick={() => setSection("pannes")} />
            <NavItem id="maintenance" icon={Wrench} label="Maintenance" active={section === "maintenance"} onClick={() => setSection("maintenance")} />
            <NavItem id="documents" icon={FileWarning} label="Documents" active={section === "documents"} onClick={() => setSection("documents")} />
            <NavItem id="billing" icon={Receipt} label="Dépenses" active={section === "billing"} onClick={() => setSection("billing")} />
          </ul>
        </nav>
        
        <div className="p-6 bg-slate-950/50 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">{userProfile?.display_name?.charAt(0)}</div>
            <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{userProfile?.display_name}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={toggleDarkMode} className="p-3 bg-white/5 rounded-xl flex justify-center hover:bg-white/10">{darkMode ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-blue-400" />}</button>
            <button onClick={() => supabase.auth.signOut().then(() => navigate("/login"))} className="p-3 bg-red-500/10 rounded-xl flex justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-8 z-30">
          <button className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}><Menu size={24} /></button>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">GTS | {section.toUpperCase()}</h2>
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-500/20">{userProfile?.display_name?.charAt(0)}</div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {section === "dashboard" ? (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Missions Actives" value={stats.missions} icon={Truck} color="blue" onClick={() => setSection("missions")} />
                <StatCard title="Flotte Camions" value={stats.camions} icon={ClipboardList} color="green" onClick={() => setSection("maintenance")} />
                
                {/* COMPTEUR PANNES : CLIGNOTE SI > 0 */}
                <StatCard title="Pannes Alertes" value={stats.pannes} icon={AlertTriangle} color="red" blink={stats.pannes > 0} onClick={() => setSection("pannes")} />
                
                {/* COMPTEUR DOCUMENTS : CLIGNOTE SI > 0 */}
                <StatCard title="Alertes Docs" value={stats.docs} icon={FileWarning} color="purple" blink={stats.docs > 0} onClick={() => setSection("documents")} />
              </div>

              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                <CardHeader className="border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-bold">Localisation Flotte GTS</h3>
                  <span className="flex items-center gap-2 text-[10px] uppercase font-bold text-green-500">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Live Fleet
                  </span>
                </CardHeader>
                <CardContent className="p-0 h-[500px]">
                  <CarteFlotte camions={camions} center={[12.37, -1.53]} />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {section === "missions" && <MissionsSectionAdmin structure="GTS" />}
              {section === "pannes" && <PannesSection structure="GTS" />}
              {section === "maintenance" && <MaintenanceSection camions={camions} />}
              {section === "documents" && <AlertesDocuments role="superviseur" structure="GTS" />}
              {section === "billing" && <BillingExpenses structure="GTS" />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const NavItem = ({ id, icon: Icon, label, active, onClick }) => (
  <li onClick={onClick} className={`px-6 py-4 flex items-center gap-3 cursor-pointer transition-all ${active ? "bg-blue-600/10 border-l-4 border-blue-500 text-blue-500" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
    <Icon size={20} />
    <span className="font-bold text-[10px] uppercase tracking-widest">{label}</span>
  </li>
);