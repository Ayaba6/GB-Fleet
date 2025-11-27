// src/pages/ChauffeurDashboardBaticom.jsx
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "./../config/supabaseClient.js";
import { Card, CardHeader, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { useToast } from "../components/ui/use-toast.jsx";
import { LogOut, Moon, Sun, Loader2, Fuel, Ship, Weight, Lock, Plus } from "lucide-react";
import DeclarePanneModal from "../components/modals/DeclarePanneModal.jsx";

export default function ChauffeurDashboardBaticom({ session }) {
  const chauffeurId = session?.user?.id;
  const { toast } = useToast();

  const [journee, setJournee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [panneDialog, setPanneDialog] = useState(false);
  const [darkMode, setDarkMode] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const [voyages, setVoyages] = useState([]);

  // Appliquer dark/light mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Récupérer la journée ouverte
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
        // Récupérer les voyages
        const { data: voyagesData, error: voyagesError } = await supabase
          .from("journee_voyages")
          .select("id, voyage_num, tonnage")
          .eq("journee_id", data.id)
          .order("voyage_num", { ascending: true });
        if (voyagesError) throw voyagesError;
        setVoyages(voyagesData || []);
      }
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      setJournee(null);
    } finally {
      setLoading(false);
    }
  }, [chauffeurId, toast]);

  // Realtime updates
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
  }, [chauffeurId, fetchJournee]);

  // Déconnexion
  const handleSignOut = async () => await supabase.auth.signOut();

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <Loader2 className="animate-spin w-10 h-10 text-blue-600 dark:text-blue-400" />
      </div>
    );

  // Démarrer la journée
  const handleStartDay = async () => {
    if (!journee) return;
    const { error } = await supabase
      .from("journee_baticom")
      .update({ heure_depart: new Date().toISOString(), statut: "en cours" })
      .eq("id", journee.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      fetchJournee();
      toast({ title: "✅ Journée démarrée", description: "L'heure de départ a été enregistrée." });
    }
  };

  // Clôturer la journée
  const handleCloseDay = async () => {
    if (!journee) return;
    const { error } = await supabase
      .from("journee_baticom")
      .update({ statut: "clôturée", heure_cloture: new Date().toISOString() })
      .eq("id", journee.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      fetchJournee();
      toast({ title: "✅ Journée clôturée", description: "L'heure de clôture a été enregistrée." });
    }
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Tableau de bord chauffeur BATICOM
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
        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg text-center">
          <p className="text-gray-700 dark:text-gray-300 text-lg">
            Aucune journée ouverte pour le moment.
          </p>
        </Card>
      )}

      {/* JOURNÉE EN COURS */}
      {journee && (
        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Journée en cours
            </h2>
          </CardHeader>

          <CardContent className="space-y-3 text-gray-800 dark:text-gray-200">
            <p><strong>Camion :</strong> {journee.camions?.numero_camion || "N/A"}</p>
            <p><strong>Carburant restant :</strong> {journee.fuel_restant ?? "N/A"} L</p>
            <p><strong>Carburant complément :</strong> {journee.fuel_complement ?? "N/A"} L</p>
            <p><strong>Date :</strong> {new Date(journee.date).toLocaleDateString()}</p>
            <p><strong>Heure départ :</strong> {journee.heure_depart ? new Date(journee.heure_depart).toLocaleTimeString() : "Non démarrée"}</p>
            <p><strong>Heure clôture :</strong> {journee.heure_cloture ? new Date(journee.heure_cloture).toLocaleTimeString() : "Non clôturée"}</p>

            {/* Voyages */}
            {voyages.length > 0 && (
              <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <h3 className="font-semibold text-lg">Voyages</h3>
                {voyages.map((v) => (
                  <p key={v.id}>
                    #{v.voyage_num} - {v.tonnage} t
                  </p>
                ))}
              </div>
            )}

            {!journee.heure_depart && (
              <Button
                onClick={handleStartDay}
                className="bg-green-600 hover:bg-green-700 text-white mt-4"
              >
                Démarrer la journée
              </Button>
            )}

            {journee.heure_depart && !journee.heure_cloture && (
              <Button
                onClick={handleCloseDay}
                className="bg-red-600 hover:bg-red-700 text-white mt-4"
              >
                Clôturer la journée
              </Button>
            )}

            <Button
              onClick={() => setPanneDialog(true)}
              variant="destructive"
              disabled={!journee || journee.statut === "clôturée"}
              className={`mt-4 flex items-center gap-2 ${!journee ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Déclarer une panne
            </Button>
          </CardContent>
        </Card>
      )}

      {/* MODAL DECLARER PANNE */}
      <DeclarePanneModal
        open={panneDialog}
        onClose={() => setPanneDialog(false)}
        chauffeurId={chauffeurId}
        missionId={journee?.id}
        structure="BATICOM"
      />
    </div>
  );
}
