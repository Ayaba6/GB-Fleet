import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../config/supabaseClient.js";
import AdminDashboard from "../pages/AdminDashboard.jsx";
import ChauffeurDashboardGTS from "../pages/ChauffeurDashboardGTS.jsx";
import ChauffeurDashboardBaticom from "../pages/ChauffeurDashboardBaticom.jsx";
import SuperviseurDashboardGTS from "../pages/SuperviseurDashboardGTS.jsx";
import SuperviseurDashboardBaticom from "../pages/SuperviseurDashboardBaticom.jsx";
import { LogOut } from "lucide-react";

export default function RoleBasedRouting({ session }) {
  const [roleKey, setRoleKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dictionnaire des dashboards possibles
  const dashboards = {
    admin: AdminDashboard,
    chauffeur_gts: ChauffeurDashboardGTS,
    chauffeur_baticom: ChauffeurDashboardBaticom,
    superviseur_gts: SuperviseurDashboardGTS,
    superviseur_baticom: SuperviseurDashboardBaticom,
  };

  // Récupération du rôle utilisateur
  const fetchUserRole = useCallback(async (userId) => {
    setLoading(true);
    setError(null);

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, structure")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (profile?.role) {
        const role = profile.role.toLowerCase();
        const structure = profile.structure?.toLowerCase();

        if (role === "admin") {
          // ✅ Cas spécial : admin sans structure
          setRoleKey("admin");
        } else if (structure) {
          const key = `${role}_${structure}`;
          if (dashboards[key]) {
            setRoleKey(key);
          } else {
            setError(`Rôle inconnu ou dashboard non défini pour ${key}`);
          }
        } else {
          setError("Structure non définie pour cet utilisateur.");
        }
      } else {
        setError("Rôle non défini. Contactez l'administrateur.");
      }
    } catch (err) {
      console.error("Erreur de récupération de rôle:", err.message);
      setError("Erreur de connexion au profil. Veuillez réessayer.");
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  }, []);

  // Effet pour charger le profil dès qu'une session existe
  useEffect(() => {
    if (session?.user?.id) fetchUserRole(session.user.id);
  }, [session, fetchUserRole]);

  // Affichage du chargement
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
        <p className="text-gray-500 ml-4">Chargement de votre session...</p>
      </div>
    );

  // Affichage d'une erreur (ex : rôle non trouvé)
  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-6">
        <h1 className="text-2xl font-bold text-red-700 mb-4">Accès Refusé</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          <LogOut size={20} className="mr-2" /> Déconnexion
        </button>
      </div>
    );

  // Sélection dynamique du dashboard
  const DashboardComponent = dashboards[roleKey];
  return DashboardComponent ? (
    <DashboardComponent session={session} />
  ) : (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold text-gray-700 mb-4">
        Tableau de bord introuvable
      </h1>
      <button
        onClick={() => supabase.auth.signOut()}
        className="flex items-center p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
      >
        <LogOut size={20} className="mr-2" /> Déconnexion
      </button>
    </div>
  );
}
