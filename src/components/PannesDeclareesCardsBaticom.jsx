import React, { useEffect, useState, useCallback } from "react";
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
  User, Clock, Calendar, Trash2, Truck
} from "lucide-react";

export default function PannesDeclareesCardsBaticom() {
  const STRUCTURE = "BATICOM";
  const { toast } = useToast();
  const [pannes, setPannes] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [filter, setFilter] = useState("toutes");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPanne, setSelectedPanne] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showModalConfirm, setShowModalConfirm] = useState(false);
  const [panneToDelete, setPanneToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const ITEMS_PER_PAGE = 9;

  // --- Formatage date / heure ---
  const formatDateAsId = (dateString) => dateString ? new Date(dateString).toLocaleDateString("fr-FR") : "N/A";
  const formatTime = (dateString) => dateString ? new Date(dateString).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "N/A";

  // --- Récupération des pannes et chauffeurs + Realtime ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Chauffeurs depuis profiles
        const { data: chauffeursData, error: chauffeursError } = await supabase
          .from("profiles")
          .select("id, name")
          .eq("structure", STRUCTURE);
        if (chauffeursError) throw chauffeursError;

        // Pannes avec relation journee -> camion
        const { data: pannesData, error: pannesError } = await supabase
          .from("alertespannes")
          .select(`
            *,
            journee:journee_baticom(
              camion:camions(immatriculation)
            )
          `)
          .eq("structure", STRUCTURE)
          .order("created_at", { ascending: false });
        if (pannesError) throw pannesError;

        setChauffeurs(chauffeursData || []);
        setPannes(pannesData || []);
        setIsLoading(false);
      } catch (err) {
        console.error("Erreur chargement données BATICOM:", err);
        toast({ title: "Erreur", description: err.message, variant: "destructive" });
        setIsLoading(false);
      }
    };

    fetchData();

    // Realtime
    const channel = supabase
      .channel(`pannes-${STRUCTURE}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alertespannes" }, (payload) => {
        if (payload.new.structure === STRUCTURE) {
          setPannes(prev => [payload.new, ...prev]);
          toast({ title: "Nouvelle Alerte", description: `Panne : ${payload.new.typepanne}`, duration: 5000 });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "alertespannes" }, (payload) => {
        if (payload.new.structure === STRUCTURE) {
          setPannes(prev => prev.map(p => (p.id === payload.new.id ? payload.new : p)));
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "alertespannes" }, (payload) => {
        setPannes(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [toast]);

  // --- Helpers ---
  const getChauffeurName = useCallback(
    (id) => chauffeurs.find(c => c.id === id)?.name || "Inconnu",
    [chauffeurs]
  );

  const getCamionImmatriculation = useCallback(
    (panne) => panne.journee?.camion?.immatriculation || "Inconnu",
    []
  );

  const getPhotoUrl = (panne) => {
    if (!panne.photo) return null;
    const { data } = supabase.storage.from("pannes").getPublicUrl(panne.photo);
    return data.publicUrl;
  };

  // --- Actions ---
  const handleTraiterPanne = async (panne) => {
    if (panne.statut === "resolu") return;
    const { error } = await supabase.from("alertespannes").update({ statut: "resolu" }).eq("id", panne.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Panne traitée", description: `"${panne.typepanne}" a été résolue.`, duration: 3000 });
  };

  const confirmDelete = async () => {
    try {
      if (panneToDelete?.photo) {
        const { error: storageError } = await supabase.storage.from("pannes").remove([panneToDelete.photo]);
        if (storageError) console.error("Erreur suppression photo:", storageError);
      }
      const { error: dbError } = await supabase.from("alertespannes").delete().eq("id", panneToDelete.id);
      if (dbError) throw dbError;
      toast({ title: "Panne supprimée", description: `"${panneToDelete.typepanne}" a été supprimée.`, duration: 3000 });
      setShowModalConfirm(false);
      setPanneToDelete(null);
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  // --- Filtrage & Pagination ---
  const filteredPannes = pannes.filter(p => {
    const matchFilter = filter === "toutes" ? true : p.statut === filter;
    const searchString = search.toLowerCase();
    const matchSearch =
      (p.mission_id?.toString() || "").toLowerCase().includes(searchString) ||
      (p.description || "").toLowerCase().includes(searchString) ||
      (p.typepanne || "").toLowerCase().includes(searchString) ||
      getChauffeurName(p.chauffeur_id).toLowerCase().includes(searchString) ||
      getCamionImmatriculation(p).toLowerCase().includes(searchString) ||
      (p.created_at ? formatDateAsId(p.created_at).includes(searchString) : false) ||
      (p.created_at ? formatTime(p.created_at).includes(searchString) : false);
    return matchFilter && matchSearch;
  });

  const totalPages = Math.ceil(filteredPannes.length / ITEMS_PER_PAGE);
  const paginatedPannes = filteredPannes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // --- Export Excel / PDF ---
  const exportExcel = () => {
    const wsData = filteredPannes.map(p => ({
      Mission: p.mission_id || "N/A",
      Chauffeur: getChauffeurName(p.chauffeur_id),
      Camion: getCamionImmatriculation(p),
      Type: p.typepanne || "N/A",
      Description: p.description || "",
      Statut: p.statut,
      Date: p.created_at ? new Date(p.created_at).toLocaleString("fr-FR") : "",
      Latitude: p.latitude || "",
      Longitude: p.longitude || "",
      Photo: p.photo ? "Oui" : "Non"
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pannes");
    XLSX.writeFile(wb, "pannes-baticom.xlsx");
    toast({ title: "Export Excel", description: "Liste des pannes exportée." });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Liste des Pannes Déclarées - BATICOM", 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [["Mission", "Chauffeur", "Camion", "Type", "Description", "Statut", "Date", "Latitude", "Longitude", "Photo"]],
      body: filteredPannes.map(p => [
        p.mission_id || "N/A",
        getChauffeurName(p.chauffeur_id),
        getCamionImmatriculation(p),
        p.typepanne || "N/A",
        p.description || "",
        p.statut,
        p.created_at ? new Date(p.created_at).toLocaleString("fr-FR") : "",
        p.latitude || "",
        p.longitude || "",
        p.photo ? "Oui" : "Non"
      ]),
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240] }
    });
    doc.save("pannes-baticom.pdf");
    toast({ title: "Export PDF", description: "Document généré." });
  };

  const getStatusBadge = (statut) => {
    const colors = {
      en_cours: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      resolu: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      signale: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    };
    const labels = { en_cours: "En cours", resolu: "Résolu", signale: "Signalé" };
    const Icon = statut === 'resolu' ? CheckCircle : statut === 'en_cours' ? AlertTriangle : Wrench;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${colors[statut] || "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
        <Icon size={14} />
        {labels[statut] || statut}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 container max-w-[1440px] mx-auto">
      {/* Header */}
      <Card className="shadow-xl bg-white/90 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 gap-2 sm:gap-0">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <Bell size={24} className="text-red-600" /> Gestion des Pannes BATICOM
          </h2>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={exportExcel} variant="outline"><File size={16} /> Excel</Button>
            <Button onClick={exportPDF} variant="outline"><FileText size={16} /> PDF</Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filtre + Recherche */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <input
          type="text"
          placeholder="🔍 Rechercher (Journée, Chauffeur, Camion, Type, Heure...)"
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          className="flex-1 min-w-[200px] border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-200"
        />
        <select
          value={filter}
          onChange={e => { setFilter(e.target.value); setCurrentPage(1); }}
          className="border rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
        >
          <option value="toutes">Toutes</option>
          <option value="en_cours">En cours</option>
          <option value="resolu">Résolu</option>
          <option value="signale">Signalé</option>
        </select>
        {pannes.length > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">Affiché: {filteredPannes.length} pannes</span>
        )}
      </div>

      {/* Liste des pannes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center items-center p-20 text-blue-500 dark:text-blue-400">
            <Loader2 className="animate-spin mr-2" size={24} /> Chargement...
          </div>
        ) : paginatedPannes.length === 0 ? (
          <p className="text-center col-span-full text-gray-500 dark:text-gray-400 p-10 bg-white dark:bg-gray-800 rounded-xl shadow">
            Aucune panne trouvée
          </p>
        ) : paginatedPannes.map(p => (
          <Card key={p.id} className="shadow-lg p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col justify-between hover:shadow-xl transition duration-300">
            <CardContent className="p-0 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/50">
                {getStatusBadge(p.statut)}
                <p className="text-base font-semibold text-gray-700 dark:text-gray-200">{p.typepanne}</p>
              </div>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                  <User size={16} className="text-blue-500" />
                  Chauffeur : <span className="font-semibold">{getChauffeurName(p.chauffeur_id)}</span>
                </p>
                <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                  <Truck size={16} className="text-green-500" />
                  Camion : <span className="font-semibold">{getCamionImmatriculation(p)}</span>
                </p>
                <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                  <Calendar size={16} className="text-red-500" /> ID Journée : <span className="font-semibold">{formatDateAsId(p.created_at)}</span>
                </p>
                <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                  <Clock size={16} className="text-orange-500" /> Déclaré à : <span className="font-semibold">{formatTime(p.created_at)}</span>
                </p>
                <p className="flex items-start gap-2 pt-2 border-t border-dashed dark:border-gray-700/50">
                  <FileText size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                  Description : <span className="text-xs italic text-gray-500 dark:text-gray-400">{p.description || "Aucune description fournie"}</span>
                </p>
              </div>
              <div className="flex gap-2 flex-wrap pt-4 border-t border-gray-200 dark:border-gray-700">
                {p.latitude && p.longitude && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-sm">
                    <MapPin size={14}/> Position GPS
                  </a>
                )}
                {p.photo && (
                  <Button size="sm" variant="outline" className="dark:text-gray-100 dark:border-gray-600 dark:bg-gray-700" onClick={() => { setSelectedPanne(p); setShowPhotoModal(true); }}>
                    Voir photo
                  </Button>
                )}
                {p.statut !== "resolu" && (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800 dark:text-gray-100" onClick={() => handleTraiterPanne(p)}>
                    <CheckCircle size={14} className="mr-1" /> Traiter
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => { setPanneToDelete(p); setShowModalConfirm(true); }}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button key={i} size="sm" variant={i + 1 === currentPage ? "default" : "outline"} onClick={() => setCurrentPage(i + 1)}>
              {i + 1}
            </Button>
          ))}
        </div>
      )}

      {/* Modal Photo */}
      {showPhotoModal && selectedPanne && getPhotoUrl(selectedPanne) && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 max-w-3xl w-full relative shadow-2xl flex flex-col gap-4">
            <button onClick={() => setShowPhotoModal(false)} className="absolute -top-3 -right-3 p-1 rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-lg transition">
              <X size={28}/>
            </button>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Photo de la panne ({selectedPanne.typepanne})</h3>
            <img src={getPhotoUrl(selectedPanne)} alt="Panne" className="w-full h-auto object-contain rounded-lg max-h-[80vh]" />
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={showModalConfirm}
        onClose={() => { setShowModalConfirm(false); setPanneToDelete(null); }}
        title="Supprimer cette panne ?"
        description={`Êtes-vous sûr de vouloir supprimer "${panneToDelete?.typepanne}" ? Cette action est irréversible et supprimera la photo associée.`}
        confirmLabel="Supprimer définitivement"
        confirmColor="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
