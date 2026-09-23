// src/pages/ChauffeurDashboardBaticom.jsx

import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Card, CardHeader, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { useToast } from "../components/ui/use-toast.jsx";
import {
    LogOut,
    Moon,
    Sun,
    Loader2,
    User,
    Home,
    History,
    Route,
    Truck,
    Fuel,
    Clock,
    Calendar,
    Package,
    Wrench,
    AlertTriangle,
} from "lucide-react";

import DeclarePanneModal from "../components/modals/DeclarePanneModal.jsx";
import HistoriqueJourneeChauffeur from "../components/HistoriqueJourneeChauffeur.jsx"; 

// --- Header fixe ---
const DashboardHeader = ({
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
                <Truck size={20} className="text-amber-500" />
                Baticom Dashboard
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
const BottomNavigation = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: "dashboard", icon: Home, label: "Accueil" },
        { id: "historique", icon: History, label: "Historique" },
        { id: "trajet", icon: Route, label: "Trajet" },
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

// --- Dashboard Content (Accueil) ---
const DashboardContent = ({ journee, voyages, handleStartDay, setPanneDialog }) => {
    const statutJournee = journee?.statut || "N/A";
    const isStarted = !!journee?.heure_depart;

    let statusBadge;
    if (isStarted)
        statusBadge = (
            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                En Cours
            </span>
        );
    else if (journee)
        statusBadge = (
            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                Affectée
            </span>
        );
    else
        statusBadge = (
            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                Aucune
            </span>
        );

    if (!journee)
        return (
            <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg text-center">
                <AlertTriangle size={32} className="mx-auto mb-4 text-orange-500" />
                <p className="text-gray-700 dark:text-gray-200 text-lg font-semibold">Aucune journée de travail ouverte.</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Veuillez contacter votre superviseur.</p>
            </Card>
        );

    const DetailItem = ({ icon: Icon, label, value }) => (
        <div className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-b-0">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                <Icon size={18} className="text-blue-500 dark:text-blue-400" />
                <span className="font-medium">{label}</span>
            </div>
            <span className="font-semibold text-gray-800 dark:text-gray-100">{value}</span>
        </div>
    );

    return (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Home size={22} className="text-blue-600" /> Journée de travail
                </h2>
                {statusBadge}
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                    <DetailItem icon={Calendar} label="Date" value={new Date(journee.date).toLocaleDateString()} />
                    <DetailItem icon={Truck} label="Camion" value={journee.camions?.numero_camion || "N/A"} />
                    <DetailItem icon={Clock} label="Départ" value={journee.heure_depart ? new Date(journee.heure_depart).toLocaleTimeString() : "Non démarré"} />
                    <DetailItem icon={Clock} label="Clôture" value={"Non clôturée"} />
                    <DetailItem icon={Fuel} label="Carburant Initial" value={`${journee.fuel_restant ?? "N/A"} L`} />
                    <DetailItem icon={Fuel} label="Carburant Compl." value={`${journee.fuel_complement ?? "N/A"} L`} />
                </div>

                {voyages.length > 0 && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                            <Route size={20} className="text-indigo-500" /> Voyages ({voyages.length})
                        </h3>
                        <div className="space-y-2">
                            {voyages.map((v) => (
                                <div key={v.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-md shadow-sm">
                                    <span className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                        <Package size={16} className="text-green-600 dark:text-green-400" /> Voyage #{v.voyage_num}
                                    </span>
                                    <span className="text-blue-600 dark:text-blue-400 font-bold">{v.tonnage} t</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    {!isStarted && (
                        <Button
                            onClick={handleStartDay}
                            className="bg-green-600 hover:bg-green-700 text-white w-full text-lg font-semibold h-12 shadow-lg hover:shadow-xl transition-shadow"
                        >
                            Démarrer la Journée
                        </Button>
                    )}

                    {isStarted && (
                        <Button
                            onClick={() => setPanneDialog(true)}
                            className="w-full h-10 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium"
                        >
                            <Wrench size={18} /> Déclarer une panne
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

// --- Composant Principal ---
export default function ChauffeurDashboardBaticom({ session }) {
    const chauffeurId = session?.user?.id;
    const { toast } = useToast();

    const [journee, setJournee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [panneDialog, setPanneDialog] = useState(false);
    const [darkMode, setDarkMode] = useState(
        typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    );
    const [voyages, setVoyages] = useState([]);
    const [activeTab, setActiveTab] = useState("dashboard");
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

    const fetchJournee = useCallback(async () => {
        if (!chauffeurId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("journee_baticom")
                .select("*, camions(*)")
                .eq("chauffeur_id", chauffeurId)
                .in("statut", ["affectée", "en cours"])
                .maybeSingle();

            if (error) throw error;
            setJournee(data || null);

            if (data) {
                const { data: voyagesData, error: voyagesError } = await supabase
                    .from("journee_voyages")
                    .select("id, voyage_num, tonnage")
                    .eq("journee_id", data.id)
                    .order("voyage_num", { ascending: true });
                if (voyagesError) throw voyagesError;
                setVoyages(voyagesData || []);
            } else {
                setVoyages([]);
            }
        } catch (err) {
            toast({ title: "Erreur de chargement", description: err.message, variant: "destructive" });
            setJournee(null);
        } finally {
            setLoading(false);
        }
    }, [chauffeurId, toast]);

    useEffect(() => {
        fetchJournee();
        const channel = supabase
            .channel("journee_realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "journee_baticom" },
                (payload) => {
                    if (payload.new?.chauffeur_id === chauffeurId || payload.old?.chauffeur_id === chauffeurId) {
                        fetchJournee();
                    }
                }
            );

        channel.subscribe((status) => {
            if (status === "SUBSCRIBED") console.log("Realtime channel connecté ✅");
            else if (status === "ERROR") console.error("Erreur Realtime :", channel);
        });

        return () => {
            if (channel && typeof supabase.removeChannel === "function") {
                supabase.removeChannel(channel);
            }
        };
    }, [chauffeurId, fetchJournee]);

    const handleSignOut = async () => {
        setLoading(true);
        await supabase.auth.signOut();
    };

    const handleStartDay = async () => {
        if (!journee) return;
        setLoading(true);
        const { error } = await supabase
            .from("journee_baticom")
            .update({ heure_depart: new Date().toISOString(), statut: "en cours" })
            .eq("id", journee.id);
        setLoading(false);
        if (error) toast({ title: "❌ Erreur", description: error.message, variant: "destructive" });
        else {
            fetchJournee();
            toast({ title: "✅ Journée démarrée", description: "L'heure de départ a été enregistrée." });
        }
    };

    if (loading)
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
                <Loader2 className="animate-spin w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
        );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <DashboardHeader
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
                    <DashboardContent
                        journee={journee}
                        voyages={voyages}
                        handleStartDay={handleStartDay}
                        setPanneDialog={setPanneDialog}
                    />
                )}

                {activeTab === "historique" && (
                    <div className="py-2">
                        {chauffeurId ? (
                            <HistoriqueJourneeChauffeur chauffeurId={chauffeurId} />
                        ) : (
                            <p className="text-center text-gray-500 pt-10">ID de chauffeur non disponible. Veuillez vous reconnecter.</p>
                        )}
                    </div>
                )}

                {activeTab === "trajet" && (
                    <div className="p-6 text-center bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Gestion des Trajets</h2>
                        <p className="text-gray-700 dark:text-gray-200">Visualisation et ajout de trajets à venir...</p>
                    </div>
                )}

                {activeTab === "vehicule" && (
                    <div className="p-6 text-center bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Informations Véhicule</h2>
                        <p className="text-gray-700 dark:text-gray-200">Détails et maintenance du véhicule à venir...</p>
                    </div>
                )}
            </main>

            <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

            {panneDialog && (
                <DeclarePanneModal 
                    open={panneDialog} 
                    onClose={() => setPanneDialog(false)} 
                    chauffeurId={chauffeurId}
                    missionId={journee?.id || null}
                    structure="baticom"
                />
            )}
        </div>
    );
}
