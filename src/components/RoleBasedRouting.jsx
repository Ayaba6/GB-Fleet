import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../config/supabaseClient.js"; 
import AdminDashboard from "../pages/AdminDashboard.jsx";
import ChauffeurDashboardGTS from "../pages/ChauffeurDashboardGTS.jsx";
import ChauffeurDashboardBaticom from "../pages/ChauffeurDashboardBaticom.jsx";
import SuperviseurDashboardGTS from "../pages/SuperviseurDashboardGTS.jsx";
import SuperviseurDashboardBaticom from "../pages/SuperviseurDashboardBaticom.jsx";
import { LogOut, Loader2 } from "lucide-react";

export default function RoleBasedRouting({ session }) {
  const [roleKey, setRoleKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mapping des tableaux de bord par clé (role_structure)
  const dashboards = {
    admin: AdminDashboard,
    chauffeur_gts: ChauffeurDashboardGTS,
    chauffeur_baticom: ChauffeurDashboardBaticom,
    superviseur_gts: SuperviseurDashboardGTS,
    superviseur_baticom: SuperviseurDashboardBaticom,
  };

  const fetchUserRole = useCallback(async (userId) => {
    setLoading(true);
    setError(null);

    try {
      // Récupération sécurisée du profil
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("role, structure")
        .eq("id", userId)
        .single();

      if (fetchError) throw fetchError;

      if (profile) {
        const role = profile.role?.toLowerCase();
        const structure = profile.structure?.toLowerCase();

        if (role === "admin") {
          setRoleKey("admin");
        } 
        else if (role && structure) {
          const key = `${role}_${structure}`;
          if (dashboards[key]) {
            setRoleKey(key);
          } else {
            setError(`Configuration inconnue : ${key}`);
          }
        } 
        else {
          setError("Votre profil est incomplet (rôle ou structure manquante).");
        }
      } else {
        setError("Aucun profil trouvé pour cet utilisateur.");
      }
    } catch (err) {
      console.error("Erreur RoleBasedRouting:", err.message);
      // L'erreur "infinite recursion" s'affichera ici si le SQL n'est pas corrigé
      setError("Erreur d'accès aux données. Contactez un administrateur.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserRole(session.user.id);
    } else {
      setRoleKey(null);
      setLoading(false);
    }
  }, [session?.user?.id, fetchUserRole]);

  // 1. État de chargement
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
        <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">
          Vérification des accès en cours...
        </p>
      </div>
    );
  }

  // 2. État d'erreur (ex: Problème de RLS ou profil inexistant)
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 dark:bg-gray-900 p-6">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Accès Interdit</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center p-3 bg-gray-800 dark:bg-red-600 text-white rounded-xl hover:opacity-90 transition"
          >
            <LogOut size={20} className="mr-2" /> Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  // 3. Rendu du Dashboard correspondant
  const DashboardComponent = dashboards[roleKey];

  if (!DashboardComponent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-500 mb-4">Initialisation du tableau de bord...</p>
      </div>
    );
  }

  return <DashboardComponent session={session} />;
}