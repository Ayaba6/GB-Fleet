// src/components/PannesDeclareesCardsBaticom.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Card, CardHeader, CardContent } from "./ui/card.jsx";
import { Button } from "./ui/button.jsx";
import { useToast } from "./ui/use-toast.jsx";
import ConfirmDialog from "./ui/ConfirmDialog.jsx";
import {
  Bell, MapPin, FileText, User, Clock, Calendar, Truck, CheckCircle, AlertTriangle, Wrench, Loader2
} from "lucide-react";

export default function PannesDeclareesCardsBaticom() {
  // MODIFICATION CRUCIALE : Passage en minuscules pour correspondre à la DB
  const STRUCTURE = "baticom"; 
  
  const { toast } = useToast();
  const [pannes, setPannes] = useState([]);
  const [missions, setMissions] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [camions, setCamions] = useState([]);
  const [filter, setFilter] = useState("toutes");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPanne, setSelectedPanne] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showModalConfirm, setShowModalConfirm] = useState(false);
  const [panneToDelete, setPanneToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const ITEMS_PER_PAGE = 9;

  const formatDateAsId = (dateString) => dateString ? new Date(dateString).toLocaleDateString("fr-FR") : "N/A";
  const formatTime = (dateString) => dateString ? new Date(dateString).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "N/A";

  // --- Fetch data ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Note: journee_baticom utilise probablement "BATICOM" en majuscules ou n'a pas de colonne structure
        // On adapte selon la réalité de chaque table
        const { data: missionsData } = await supabase
          .from("journee_baticom")
          .select("id, chauffeur_id, camion_id");

        const { data: chauffeursData } = await supabase
          .from("profiles")
          .select("id, name")
          .eq("role", "chauffeur")
          .ilike("structure", STRUCTURE); // Utilisation de ilike pour être relax sur la casse

        const { data: camionsData } = await supabase
          .from("camions")
          .select("id, immatriculation")
          .ilike("structure", STRUCTURE);

        // ICI : La requête principale qui bloquait
        const { data: pannesData, error: pannesError } = await supabase
          .from("alertespannes")
          .select("*")
          .eq("structure", STRUCTURE) // cherchera "baticom"
          .order("created_at", { ascending: false });

        if (pannesError) throw pannesError;

        setMissions(missionsData || []);
        setChauffeurs(chauffeursData || []);
        setCamions(camionsData || []);
        setPannes(pannesData || []);
      } catch (err) {
        toast({ title: "Erreur chargement", description: err.message, variant: "destructive" });
        console.error("Erreur Fetch:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // REALTIME : On écoute aussi en minuscules
    const channel = supabase
      .channel(`pannes-${STRUCTURE}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "alertespannes" }, (payload) => {
        if (payload.new && payload.new.structure?.toLowerCase() === STRUCTURE) {
          if (payload.eventType === "INSERT") {
            setPannes(prev => [payload.new, ...prev]);
            toast({ title: "Nouvelle Alerte", description: `Panne : ${payload.new.typepanne}` });
          } else if (payload.eventType === "UPDATE") {
            setPannes(prev => prev.map(p => (p.id === payload.new.id ? payload.new : p)));
          }
        }
        if (payload.eventType === "DELETE") {
          setPannes(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [toast]);

  // --- Helpers ---
  const getChauffeurDisplay = (p) => {
    const id = p.chauffeur_id || missions.find(m => m.id === p.mission_id)?.chauffeur_id;
    return chauffeurs.find(c => c.id === id)?.name || "Inconnu";
  };

  const getCamionDisplay = (p) => {
    const id = p.camion_id || missions.find(m => m.id === p.mission_id)?.camion_id;
    return camions.find(c => c.id === id)?.immatriculation || "Inconnu";
  };

  const handleTraiterPanne = async (panne) => {
    if (panne.statut === "resolu") return;
    const { error } = await supabase.from("alertespannes").update({ statut: "resolu" }).eq("id", panne.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
  };

  const confirmDelete = async () => {
    const { error } = await supabase.from("alertespannes").delete().eq("id", panneToDelete.id);
    if (!error) {
      setShowModalConfirm(false);
      setPanneToDelete(null);
    }
  };

  // --- Filtrage ---
  const filteredPannes = pannes.filter(p => {
    const matchFilter = filter === "toutes" ? true : p.statut === filter;
    const searchString = search.toLowerCase();
    return matchFilter && (
        (p.typepanne || "").toLowerCase().includes(searchString) ||
        getChauffeurDisplay(p).toLowerCase().includes(searchString) ||
        getCamionDisplay(p).toLowerCase().includes(searchString)
    );
  });

  const paginatedPannes = filteredPannes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getStatusBadge = (statut) => {
    const styles = {
      en_cours: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      resolu: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return (
      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${styles[statut] || "bg-gray-100 text-gray-600"}`}>
        {statut === "en_cours" ? "⚠️ En cours" : "✅ Résolu"}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6"> 
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
          <AlertTriangle className="text-red-500" /> PANNE {STRUCTURE.toUpperCase()}
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
            <input 
                type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2 w-full dark:bg-gray-700 dark:border-gray-600"
            />
            <select value={filter} onChange={e => setFilter(e.target.value)} className="text-sm border rounded-lg px-3 py-2 dark:bg-gray-700">
                <option value="toutes">Toutes</option>
                <option value="en_cours">En cours</option>
                <option value="resolu">Résolu</option>
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-red-500" /></div>
        ) : paginatedPannes.map(p => (
          <Card key={p.id} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                {getStatusBadge(p.statut)}
                <span className="text-[10px] font-bold text-gray-400">{formatTime(p.created_at)}</span>
              </div>
              
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white uppercase text-sm">{p.typepanne}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{p.description || "Pas de description"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                    <User size={12} className="text-blue-500"/>
                    <span className="truncate font-medium">{getChauffeurDisplay(p)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Truck size={12} className="text-emerald-500"/>
                    <span className="truncate font-medium">{getCamionDisplay(p)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {p.statut !== "resolu" && (
                  <Button size="sm" className="flex-1 bg-blue-600 text-white text-[10px]" onClick={() => handleTraiterPanne(p)}>RÉSOUDRE</Button>
                )}
                <Button size="sm" variant="destructive" className="text-[10px]" onClick={() => { setPanneToDelete(p); setShowModalConfirm(true); }}>SUPPRIMER</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={showModalConfirm}
        onClose={() => setShowModalConfirm(false)}
        title="Supprimer l'alerte ?"
        onConfirm={confirmDelete}
      />
    </div>
  );
}