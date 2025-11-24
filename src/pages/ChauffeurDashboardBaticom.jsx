// src/pages/ChauffeurDashboardBaticom.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Card, CardHeader, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { useToast } from "../components/ui/use-toast.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import { LogOut, Moon, Sun } from "lucide-react";

export default function ChauffeurDashboardBaticom({ session }) {
  const chauffeurId = session?.user?.id;
  const [journee, setJournee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [panneDialog, setPanneDialog] = useState(false);

  const [darkMode, setDarkMode] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const { toast } = useToast();

  // Appliquer dark/light mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Récupérer la journée ouverte
  const fetchJournee = async () => {
    if (!chauffeurId) return;

    setLoading(true);
    console.log(`Fetching journée pour chauffeurId: ${chauffeurId}`);

    const { data, error } = await supabase
      .from("journee_baticom")
      .select("*, camions(*)")
      .eq("chauffeur_id", chauffeurId)
      .eq("statut", "ouverte")
      .maybeSingle();

    if (error) {
      console.error("Erreur récupération journée :", error.message);
      setJournee(null);
    } else {
      console.log("Données récupérées :", data);
      setJournee(data);
      if (data) setShowModal(true);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchJournee();

    const channel = supabase
      .channel("journee_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "journee_baticom" },
        (payload) => {
          if (payload.new?.chauffeur_id === chauffeurId) fetchJournee();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [chauffeurId]);

  // Déclarer une panne
  const handleDeclarePanne = async () => {
    if (!journee) return;

    const { error } = await supabase.from("pannes").insert({
      chauffeur_id: chauffeurId,
      camion_id: journee.camion_id,
      journee_id: journee.id,
      description: "Panne déclarée",
      created_at: new Date(),
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
      return;
    }

    toast({ title: "Panne déclarée !" });
    setPanneDialog(false);
  };

  // Déconnexion
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600 dark:text-gray-300">Chargement...</p>
      </div>
    );

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Tableau de bord chauffeur
        </h1>

        <div className="flex gap-3">

          {/* Toggle Thème */}
          <Button
            onClick={() => setDarkMode(!darkMode)}
            variant="outline"
            className="flex items-center gap-2 border-gray-400 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? "Clair" : "Sombre"}
          </Button>

          {/* Déconnexion */}
          <Button
            onClick={handleSignOut}
            variant="destructive"
            className="flex items-center gap-2 px-4 py-2"
          >
            <LogOut size={18} />
            Déconnexion
          </Button>

        </div>
      </div>

      {/* Aucune journée */}
      {!journee && (
        <Card className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow">
          <p className="text-gray-700 dark:text-gray-300">
            Aucune journée ouverte pour le moment.
          </p>
        </Card>
      )}

      {/* JOURNÉE */}
      {journee && (
        <Card className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Journée en cours
            </h2>
          </CardHeader>

          <CardContent className="space-y-3 text-gray-800 dark:text-gray-200">
            <p>
              <strong>Camion :</strong> {journee.camions?.numero_camion || "N/A"}
            </p>
            <p>
              <strong>Carburant restant :</strong> {journee.fuel_restant} L
            </p>
            <p>
              <strong>Date :</strong>{" "}
              {new Date(journee.date).toLocaleDateString()}
            </p>

            <Button
              onClick={() => setPanneDialog(true)}
              variant="destructive"
              className="mt-4 flex items-center gap-2"
            >
              Déclarer une panne
            </Button>
          </CardContent>
        </Card>
      )}

      {/* MODAL NOUVELLE JOURNEE */}
      {showModal && journee && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-[400px] p-6 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 shadow-xl">
            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
              Nouvelle journée assignée
            </h2>
            <p>
              <strong>Camion :</strong> {journee.camions?.numero_camion}
            </p>
            <p>
              <strong>Carburant restant :</strong> {journee.fuel_restant} L
            </p>
            <p>
              <strong>Date :</strong>{" "}
              {new Date(journee.date).toLocaleDateString()}
            </p>

            <div className="mt-5 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="border-gray-400 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Fermer
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* CONFIRMATION PANNE */}
      <ConfirmDialog
        open={panneDialog}
        title="Déclarer une panne"
        description="Êtes-vous sûr de vouloir déclarer une panne ?"
        onClose={() => setPanneDialog(false)}
        onConfirm={handleDeclarePanne}
      />
    </div>
  );
}
