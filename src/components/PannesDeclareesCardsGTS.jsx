// src/components/PannesDeclareesCardsGTS.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Card, CardHeader, CardContent } from "./ui/card.jsx";
import { Button } from "./ui/button.jsx";
import { useToast } from "./ui/use-toast.jsx";
import ConfirmDialog from "./ui/ConfirmDialog.jsx";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  Bell, MapPin, FileText, File, X, Wrench, CheckCircle, AlertTriangle, Loader2,
  User, Clock, Calendar, Trash2, Truck, Download
} from "lucide-react";

export default function PannesDeclareesCardsGts() {
  // MODIFICATION CRUCIALE : "gts" en minuscules pour la base de données
  const STRUCTURE = "gts"; 
  
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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // --- Pannes (Filtrage sur "gts") ---
        const { data: pannesData, error: pannesError } = await supabase
          .from("alertespannes")
          .select("*")
          .eq("structure", STRUCTURE)
          .order("created_at", { ascending: false });
        if (pannesError) throw pannesError;

        // --- Missions GTS ---
        const { data: missionsData } = await supabase.from("missions_gts").select("id, chauffeur_id, camion_id");

        // --- Chauffeurs & Camions (ilike pour plus de flexibilité) ---
        const { data: chauffeursData } = await supabase.from("profiles").select("id, name").eq("role", "chauffeur").ilike("structure", STRUCTURE);
        const { data: camionsData } = await supabase.from("camions").select("id, immatriculation").ilike("structure", STRUCTURE);

        setPannes(pannesData || []);
        setMissions(missionsData || []);
        setChauffeurs(chauffeursData || []);
        setCamions(camionsData || []);
      } catch (err) {
        toast({ title: "Erreur chargement", description: err.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // --- Realtime ---
    const channel = supabase
      .channel(`pannes-${STRUCTURE}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "alertespannes" }, (payload) => {
        if (payload.new && payload.new.structure?.toLowerCase() === STRUCTURE) {
          if (payload.eventType === "INSERT") setPannes(prev => [payload.new, ...prev]);
          if (payload.eventType === "UPDATE") setPannes(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
        }
        if (payload.eventType === "DELETE") setPannes(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [toast]);

  // --- Helpers d'affichage ---
  const getChauffeurDisplay = (p) => {
    const id = p.chauffeur_id || missions.find(m => m.id.toString() === p.mission_id?.toString())?.chauffeur_id;
    return chauffeurs.find(c => c.id.toString() === id?.toString())?.name || "Inconnu";
  };

  const getCamionDisplay = (p) => {
    const id = p.camion_id || missions.find(m => m.id.toString() === p.mission_id?.toString())?.camion_id;
    return camions.find(c => c.id.toString() === id?.toString())?.immatriculation || "Inconnu";
  };

  const getPhotoUrl = (panne) => {
    if (!panne.photo) return null;
    return supabase.storage.from("pannes").getPublicUrl(panne.photo).data.publicUrl;
  };

  const handleTraiterPanne = async (panne) => {
    const { error } = await supabase.from("alertespannes").update({ statut: "resolu" }).eq("id", panne.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
  };

  const confirmDelete = async () => {
    const { error } = await supabase.from("alertespannes").delete().eq("id", panneToDelete.id);
    if (!error) {
      setShowModalConfirm(false);
      setPanneToDelete(null);
      toast({ title: "Supprimé", description: "La panne a été retirée." });
    }
  };

  // --- Filtrage & Tri ---
  const filteredPannes = pannes.filter(p => {
    const matchFilter = filter === "toutes" ? true : p.statut === filter;
    const s = search.toLowerCase();
    return matchFilter && (
      (p.typepanne || "").toLowerCase().includes(s) ||
      getChauffeurDisplay(p).toLowerCase().includes(s) ||
      getCamionDisplay(p).toLowerCase().includes(s)
    );
  });

  const paginatedPannes = filteredPannes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredPannes.length / ITEMS_PER_PAGE);

  const getStatusBadge = (statut) => {
    const colors = {
      en_cours: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
      resolu: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${colors[statut] || "bg-gray-100"}`}>
        {statut === "en_cours" ? <AlertTriangle size={12}/> : <CheckCircle size={12}/>}
        {statut === "en_cours" ? "En cours" : "Résolu"}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Card className="shadow-sm border-none bg-white dark:bg-gray-800/50 backdrop-blur-md">
        <CardHeader className="flex flex-col md:flex-row justify-between items-center gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Bell className="text-red-600 dark:text-red-400" size={20} />
            </div>
            <h2 className="text-xl font-black tracking-tight text-gray-800 dark:text-white uppercase">Pannes {STRUCTURE}</h2>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => {}} size="sm" variant="outline" className="text-xs h-8">
              <Download size={14} className="mr-1"/> Excel
            </Button>
          </div>
        </CardHeader>

        <div className="px-5 pb-5 flex flex-wrap gap-3">
          <input 
            type="text" placeholder="Rechercher chauffeur, camion, type..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] text-sm bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 transition-all"
          />
          <select value={filter} onChange={e => setFilter(e.target.value)} className="text-sm bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 py-2">
            <option value="toutes">Tous les statuts</option>
            <option value="en_cours">En cours</option>
            <option value="resolu">Résolu</option>
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-red-500" /></div>
        ) : paginatedPannes.map(p => (
          <Card key={p.id} className="group border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white/80 dark:bg-gray-800/80 overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                {getStatusBadge(p.statut)}
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded-md">{formatTime(p.created_at)}</span>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase leading-tight">{p.typepanne}</h3>
                <p className="text-[11px] text-gray-500 mt-1 italic">"{p.description || "Aucune description"}"</p>
              </div>

              <div className="space-y-2 py-3 border-y border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 flex items-center gap-1"><User size={12}/> Chauffeur</span>
                  <span className="font-bold dark:text-gray-200">{getChauffeurDisplay(p)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 flex items-center gap-1"><Truck size={12}/> Camion</span>
                  <span className="font-bold dark:text-gray-200">{getCamionDisplay(p)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {p.statut !== "resolu" && (
                  <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold" onClick={() => handleTraiterPanne(p)}>RÉSOUDRE</Button>
                )}
                <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { setPanneToDelete(p); setShowModalConfirm(true); }}>
                  <Trash2 size={16}/>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={showModalConfirm}
        onClose={() => setShowModalConfirm(false)}
        title="Supprimer définitivement ?"
        onConfirm={confirmDelete}
      />
    </div>
  );
}