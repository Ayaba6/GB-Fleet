import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabaseClient.js";
import { Toaster, toast } from "react-hot-toast";

import {
  Users, Truck, ClipboardList, AlertTriangle, FileWarning,
  Sun, Moon, Menu, Loader2, Gauge, ShieldAlert, ChevronRight,
  LogOut, Activity, Circle
} from "lucide-react";

import AdminSidebar from "../components/AdminSidebar.jsx";
import UserSection from "../components/UserSection.jsx";
import CamionsSection from "../components/CamionsSection.jsx";
import MissionsSection from "../components/MissionsSectionAdmin.jsx";
import PannesDeclarees from "../components/PannesSectionAdmin.jsx";
import AlertesExpiration from "../components/AlertesExpiration.jsx";
import CarteFlotte from "../components/CarteFlotte.jsx";
import BillingExpenses from "../components/BillingExpenses.jsx";
import MaintenanceSection from "../components/MaintenanceSection.jsx";
import PneusSection from "../components/PneusSection.jsx";

const SECTION_TITLES = {
  dashboard: "Tableau de Bord",
  users: "Gestion des Utilisateurs",
  camions: "Gestion de la Flotte",
  pneus: "Gestion des Pneus",
  missions: "Missions Actives",
  pannes: "Pannes Déclarées",
  maintenance: "Maintenance Camions",
  documents: "Alertes Documents",
  billing: "Facturation et Dépenses",
};

const STAT_CONFIG = {
  blue: {
    bgLight: "bg-blue-50/50 hover:bg-blue-50 border-blue-100",
    bgDark: "dark:bg-blue-950/20 dark:hover:bg-blue-950/30 dark:border-blue-900/40",
    iconBg: "bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    text: "text-blue-950 dark:text-blue-100",
    accent: "bg-blue-500"
  },
  emerald: {
    bgLight: "bg-emerald-50/50 hover:bg-emerald-50 border-emerald-100",
    bgDark: "dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 dark:border-emerald-900/40",
    iconBg: "bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    text: "text-emerald-950 dark:text-emerald-100",
    accent: "bg-emerald-500"
  },
  amber: {
    bgLight: "bg-amber-50/50 hover:bg-amber-50 border-amber-100",
    bgDark: "dark:bg-amber-950/20 dark:hover:bg-amber-950/30 dark:border-amber-900/40",
    iconBg: "bg-amber-600/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    text: "text-amber-950 dark:text-amber-100",
    accent: "bg-amber-500"
  },
  rose: {
    bgLight: "bg-rose-50/50 hover:bg-rose-50 border-rose-100",
    bgDark: "dark:bg-rose-950/20 dark:hover:bg-rose-950/30 dark:border-rose-900/40",
    iconBg: "bg-rose-600/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
    text: "text-rose-950 dark:text-rose-100",
    accent: "bg-rose-500"
  },
  purple: {
    bgLight: "bg-purple-50/50 hover:bg-purple-50 border-purple-100",
    bgDark: "dark:bg-purple-950/20 dark:hover:bg-purple-950/30 dark:border-purple-900/40",
    iconBg: "bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    text: "text-purple-950 dark:text-purple-100",
    accent: "bg-purple-500"
  },
};

const StatCard = ({ title, value, icon: Icon, color = "blue", onClick, blink = false }) => {
  const config = STAT_CONFIG[color] || STAT_CONFIG.blue;

  return (
    <button
      onClick={onClick}
      className={`relative group flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl text-left w-full backdrop-blur-xl ${config.bgLight} ${config.bgDark} ${
        blink ? "ring-2 ring-rose-500/50 border-rose-500 animate-pulse" : ""
      }`}
    >
      {blink && (
        <span className="absolute top-3 right-3 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
        </span>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 ${config.iconBg}`}>
          <Icon className="w-6 h-6" />
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
          {title}
        </p>
        <div className="flex items-baseline justify-between">
          <span className={`text-3xl font-extrabold tracking-tight ${config.text}`}>
            {value}
          </span>
          <span className="text-xs text-slate-400 font-medium group-hover:underline">
            Voir détails
          </span>
        </div>
      </div>
    </button>
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ users: 0, camions: 0, missions: 0, pannes: 0, docs: 0 });
  const [hasPanneEnCours, setHasPanneEnCours] = useState(false);
  const [hasDocsUrgents, setHasDocsUrgents] = useState(false);
  const [camions, setCamions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const playNotificationSound = () => {
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
      audio.play();
    } catch (error) {
      console.error("Erreur sonore :", error);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("darkMode");
    const initial = stored ? stored === "true" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(initial);
    document.documentElement.classList.toggle("dark", initial);
  }, []);

  const changeSection = (newSection) => {
    setSection(newSection);
    setMenuOpen(false);
  };

  const fetchData = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return navigate("/login");

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
      
      if (!profile || (profile.role !== "admin" && profile.role !== "superviseur")) {
        await supabase.auth.signOut();
        return navigate("/login");
      }
      
      const userRole = profile.role;
      const userStructure = profile.structure;
      const isAdmin = userRole === "admin";

      // Récupération sécurisée du nom, prénom ou nom complet
      const prenom = profile.prenom || "";
      const nom = profile.nom || "";
      const fullNameComputed = (prenom && nom) ? `${prenom} ${nom}` : (profile.full_name || authUser.email);

      setUser({ 
        ...authUser, 
        full_name: fullNameComputed,
        prenom: prenom,
        nom: nom,
        avatar: profile.avatar_url,
        role: userRole,
        structure: userStructure
      });

      const activeStatus = ["En cours", "En chargement", "En dechargement"];

      let profilesQuery = supabase.from("profiles").select("id, cnib_expiration, permis_expiration, carte_expiration, structure");
      let camionsQuery = supabase.from("camions").select("*, structure");

      if (!isAdmin && userStructure) {
        profilesQuery = profilesQuery.eq("structure", userStructure);
        camionsQuery = camionsQuery.eq("structure", userStructure);
      }

      const [usersRes, camionsRes, missionsBaticomRes, missionsGtsRes, panneEnCoursRes] = await Promise.all([
        profilesQuery,
        camionsQuery,
        supabase.from("journee_baticom").select("statut").in("statut", activeStatus),
        supabase.from("missions_gts").select("statut").in("statut", activeStatus),
        supabase.from("alertespannes").select("id").eq("statut", "en_cours")
      ]);

      const today = new Date();
      let docsUrgentsCount = 0;

      const checkDate = (dateStr) => {
        if (!dateStr) return false;
        const diff = Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24));
        return diff <= 15; 
      };

      usersRes.data?.forEach(p => {
        if (checkDate(p.cnib_expiration)) docsUrgentsCount++;
        if (checkDate(p.permis_expiration)) docsUrgentsCount++;
        if (checkDate(p.carte_expiration)) docsUrgentsCount++;
      });

      camionsRes.data?.forEach(c => {
        if (checkDate(c.cartegriseexpiry)) docsUrgentsCount++;
        if (checkDate(c.assuranceexpiry)) docsUrgentsCount++;
        if (checkDate(c.visitetechniqueexpiry)) docsUrgentsCount++;
      });

      setStats(prev => {
        if (docsUrgentsCount > prev.docs && prev.docs !== 0) {
          playNotificationSound();
          toast.error("Nouvelle alerte document détectée !", { icon: "📅" });
        }
        return {
          users: usersRes.data?.length || 0,
          camions: camionsRes.data?.length || 0,
          missions: (missionsBaticomRes.data?.length || 0) + (missionsGtsRes.data?.length || 0),
          pannes: panneEnCoursRes.data?.length || 0,
          docs: docsUrgentsCount
        };
      });

      setHasPanneEnCours((panneEnCoursRes.data || []).length > 0);
      setHasDocsUrgents(docsUrgentsCount > 0);
      setCamions(camionsRes.data || []);

    } catch (e) {
      console.error("Erreur Dashboard:", e);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alertespannes" }, (payload) => {
        playNotificationSound();
        toast.error(`Nouvelle panne détectée !`, {
          duration: 6000,
          icon: '⚠️',
          style: { borderRadius: '12px', background: '#f43f5e', color: '#fff', fontWeight: 'bold' },
        });
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "camions" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "alertespannes" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "journee_baticom" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "missions_gts" }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-blue-200 dark:border-blue-900/40 animate-pulse"></div>
          <Loader2 className="h-16 w-16 animate-spin text-blue-600 absolute inset-0" />
        </div>
        <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium animate-pulse">Chargement de la flotte...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 flex overflow-hidden font-sans antialiased text-slate-900 dark:text-slate-100">
      <Toaster position="top-right" reverseOrder={false} />

      <AdminSidebar 
        user={user} 
        section={section} 
        setSection={changeSection} 
        handleLogout={async () => { await supabase.auth.signOut(); navigate("/login"); }} 
        menuOpen={menuOpen} 
        setMenuOpen={setMenuOpen} 
      />

      <div className="flex-1 flex flex-col min-w-0 w-full md:pl-72">
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 w-full px-6 py-4 flex justify-between items-center border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMenuOpen(true)} 
              className="md:hidden p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {SECTION_TITLES[section]}
              </h1>
              {section === "dashboard" && (
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  Supervision globale et télémétrie de la flotte
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.structure && (
              <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {user.structure}
              </span>
            )}

            <button 
              onClick={() => { 
                const mode = !darkMode; 
                setDarkMode(mode); 
                document.documentElement.classList.toggle("dark", mode); 
                localStorage.setItem("darkMode", mode); 
              }} 
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:scale-105"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
          </div>
        </header>

        <main className="flex-1 w-full overflow-y-auto px-4 sm:px-8 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {section === "dashboard" ? (
              <div className="space-y-8">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium mb-3">
                        <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span>Système Opérationnel</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Bonjour, {user?.prenom || user?.full_name?.split(" ")[0] || "Administrateur"} 👋
                      </h2>
                      <p className="mt-1 text-sm text-blue-100/80 max-w-xl">
                        Voici un aperçu en temps réel de vos opérations, véhicules en déplacement et alertes prioritaires.
                      </p>
                    </div>

                    {(hasPanneEnCours || hasDocsUrgents) && (
                      <div className="flex items-center gap-3 bg-white/10 backdrop-blur-lg p-3 rounded-2xl border border-white/20">
                        <ShieldAlert className="w-8 h-8 text-rose-400 animate-bounce" />
                        <div className="text-xs">
                          <p className="font-bold text-white">Attention requise</p>
                          <p className="text-blue-100">
                            {hasPanneEnCours ? "Panne(s) non résolue(s)" : "Document(s) à renouveler"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>
                  <div className="absolute right-1/3 -top-10 w-48 h-48 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  <StatCard title="Utilisateurs" value={stats.users} icon={Users} color="blue" onClick={() => changeSection("users")} />
                  <StatCard title="Flotte" value={stats.camions} icon={Truck} color="emerald" onClick={() => changeSection("camions")} />
                  <StatCard title="Missions" value={stats.missions} icon={ClipboardList} color="amber" onClick={() => changeSection("missions")} />
                  <StatCard title="Pannes" value={stats.pannes} icon={AlertTriangle} color="rose" blink={hasPanneEnCours} onClick={() => changeSection("pannes")} />
                  <StatCard title="Alertes Docs" value={stats.docs} icon={FileWarning} color="purple" blink={hasDocsUrgents} onClick={() => changeSection("documents")} />
                </div>

                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Gauge className="w-5 h-5 text-blue-600" />
                        Geofencing & Localisation
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Position en direct de l'ensemble de vos poids lourds
                      </p>
                    </div>
                    <span className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      GPS Actif
                    </span>
                  </div>
                  <div className="p-2 sm:p-4">
                    <div className="h-[420px] w-full rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800 shadow-inner">
                      <CarteFlotte camions={camions} center={[12.37, -1.53]} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full animate-in fade-in duration-300">
                {section === "users" && <UserSection />}
                {section === "camions" && <CamionsSection />}
                {section === "pneus" && <PneusSection role={user?.role} structure={user?.structure} />}
                {section === "missions" && <MissionsSection />}
                {section === "pannes" && <PannesDeclarees role={user?.role} structure={user?.structure} />}
                {section === "maintenance" && <MaintenanceSection camions={camions} />}
                {section === "documents" && <AlertesExpiration role={user?.role} structure={user?.structure} />}
                {section === "billing" && <BillingExpenses role={user?.role} structure={user?.structure} />}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}