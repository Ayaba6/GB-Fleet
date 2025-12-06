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
  const STRUCTURE = "GTS";
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

  // --- Formatage date / heure ---
  const formatDateAsId = (dateString) => dateString ? new Date(dateString).toLocaleDateString("fr-FR") : "N/A";
  const formatTime = (dateString) => dateString ? new Date(dateString).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "N/A";

  // --- Récupération des données + Realtime ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        // --- Pannes ---
        const { data: pannesData, error: pannesError } = await supabase
          .from("alertespannes")
          .select("*")
          .eq("structure", STRUCTURE)
          .order("created_at", { ascending: false });
        if (pannesError) throw pannesError;

        // --- Missions GTS ---
        const { data: missionsData, error: missionsError } = await supabase
          .from("missions_gts")
          .select("id, chauffeur_id, camion_id")
          .eq("structure", STRUCTURE);
        if (missionsError) throw missionsError;

        // --- Chauffeurs (table "profiles") ---
        const { data: chauffeursData, error: chauffeursError } = await supabase
          .from("profiles")
          .select("id, name")
          .eq("role", "chauffeur")
          .eq("structure", STRUCTURE);
        if (chauffeursError) throw chauffeursError;

        // --- Camions ---
        const { data: camionsData, error: camionsError } = await supabase
          .from("camions")
          .select("id, immatriculation")
          .eq("structure", STRUCTURE);
        if (camionsError) throw camionsError;

        // --- Mise à jour des états ---
        setPannes(pannesData || []);
        setMissions(missionsData || []);
        setChauffeurs(chauffeursData || []);
        setCamions(camionsData || []);
      } catch (err) {
        console.error("Erreur chargement données GTS:", err);
        toast({ title: "Erreur chargement", description: err.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // --- Realtime ---
    const channel = supabase
      .channel(`pannes-${STRUCTURE}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alertespannes" },
        (payload) => {
          if (payload.new.structure === STRUCTURE) {
            setPannes(prev => [payload.new, ...prev]);
            toast({ title: "Nouvelle Alerte", description: `Panne : ${payload.new.typepanne}`, duration: 5000 });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "alertespannes" },
        (payload) => {
          if (payload.new.structure === STRUCTURE) {
            setPannes(prev => prev.map(p => (p.id === payload.new.id ? payload.new : p)));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "alertespannes" },
        (payload) => {
          setPannes(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [toast]);

  // --- Fonctions utilitaires ---
  const getChauffeurDisplay = (p) => {
    if (p.mission_id) {
      const mission = missions.find(m => m.id.toString() === p.mission_id.toString());
      if (mission && mission.chauffeur_id) {
        const chauffeur = chauffeurs.find(c => c.id.toString() === mission.chauffeur_id.toString());
        if (chauffeur) return chauffeur.name;
      }
    }
    if (p.chauffeur_id) {
      const chauffeur = chauffeurs.find(c => c.id.toString() === p.chauffeur_id.toString());
      if (chauffeur) return chauffeur.name;
    }
    return "Inconnu";
  };

  const getCamionDisplay = (p) => {
    if (p.mission_id) {
      const mission = missions.find(m => m.id.toString() === p.mission_id.toString());
      if (mission && mission.camion_id) {
        const camion = camions.find(c => c.id.toString() === mission.camion_id.toString());
        if (camion) return camion.immatriculation;
      }
    }
    if (p.camion_id) {
      const camion = camions.find(c => c.id.toString() === p.camion_id.toString());
      if (camion) return camion.immatriculation;
    }
    return "Inconnu";
  };

  const getPhotoUrl = (panne) => {
    if (!panne.photo) return null;
    const { data } = supabase.storage.from("pannes").getPublicUrl(panne.photo);
    return data.publicUrl;
  };

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
      (p.typepanne || "").toLowerCase().includes(searchString) ||
      (p.description || "").toLowerCase().includes(searchString) ||
      getChauffeurDisplay(p).toLowerCase().includes(searchString) ||
      getCamionDisplay(p).toLowerCase().includes(searchString) ||
      (p.created_at ? formatDateAsId(p.created_at).includes(searchString) : false) ||
      (p.created_at ? formatTime(p.created_at).includes(searchString) : false);
    return matchFilter && matchSearch;
  });

  // Tri : "en_cours" en haut puis date décroissante (Harmonisation)
  const sortedPannes = filteredPannes.sort((a, b) => {
    if (a.statut === "en_cours" && b.statut !== "en_cours") return -1;
    if (a.statut !== "en_cours" && b.statut === "en_cours") return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const totalPages = Math.ceil(sortedPannes.length / ITEMS_PER_PAGE);
  const paginatedPannes = sortedPannes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // --- Export Excel / PDF ---
  const exportExcel = () => {
    const wsData = filteredPannes.map(p => ({
      Mission: p.mission_id || "N/A",
      Chauffeur: getChauffeurDisplay(p),
      Camion: getCamionDisplay(p),
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
    XLSX.writeFile(wb, "pannes-gts.xlsx");
    toast({ title: "Export Excel", description: "Liste des pannes exportée." });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Liste des Pannes Déclarées - GTS", 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [["Mission", "Chauffeur", "Camion", "Type", "Description", "Statut", "Date", "Latitude", "Longitude", "Photo"]],
      body: filteredPannes.map(p => [
        p.mission_id || "N/A",
        getChauffeurDisplay(p),
        getCamionDisplay(p),
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
    doc.save("pannes-gts.pdf");
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

  // --- Render ---
  return (
    // MODIFICATION CLÉ : Retrait des classes container, max-w-[1440px] et mx-auto
    <div className="p-4 sm:p-6 space-y-6"> 
      {/* Header */}
      <Card className="shadow-xl bg-white/90 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 gap-2 sm:gap-0">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <Bell size={24} className="text-red-600" /> Gestion des Pannes GTS
          </h2>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={exportExcel} variant="outline" className="flex items-center gap-1 border-green-500 text-green-600 dark:text-green-400 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-200">
              <Download size={16} /> Export Excel
            </Button>
            <Button onClick={exportPDF} variant="outline" className="flex items-center gap-1 border-red-500 text-red-600 dark:text-red-400 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-200">
              <FileText size={16} /> Export PDF
            </Button>
          </div>
        </CardHeader>

        {/* Filtre + Recherche */}
        <div className="flex flex-wrap gap-3 items-center justify-between bg-white/80 dark:bg-gray-800/80 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700 backdrop-blur-sm">
          <input
            type="text"
            placeholder="🔍 Rechercher (Journée, Chauffeur, Camion, Type, Heure...)"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="flex-1 min-w-[200px] border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-200 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <select
            value={filter}
            onChange={e => { setFilter(e.target.value); setCurrentPage(1); }}
            className="border rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 outline-none"
          >
            <option value="toutes">Toutes</option>
            <option value="en_cours">En cours</option>
            <option value="resolu">Résolu</option>
            <option value="signale">Signalé</option>
          </select>
          {pannes.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">Affiché: **{filteredPannes.length}** pannes</span>
          )}
        </div>
      </Card>

      {/* Liste des pannes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center items-center p-20 text-blue-500 dark:text-blue-400">
            <Loader2 className="animate-spin mr-2" size={24} />
            <span>Chargement des données...</span>
          </div>
        ) : paginatedPannes.length === 0 ? (
          <p className="text-center col-span-full text-gray-500 dark:text-gray-400 p-10 bg-white/80 dark:bg-gray-800/80 rounded-xl shadow backdrop-blur-sm">Aucune panne trouvée avec les filtres actuels</p>
        ) : paginatedPannes.map(p => (
          <Card key={p.id} className="shadow-lg p-5 bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 flex flex-col justify-between hover:shadow-xl transition duration-300 backdrop-blur-sm">
            <CardContent className="p-0 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700/50">
                {getStatusBadge(p.statut)}
                <p className="text-base font-semibold text-gray-700 dark:text-gray-200">{p.typepanne}</p>
              </div>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                  <User size={16} className="text-blue-500" />
                  Chauffeur : <span className="font-semibold">{getChauffeurDisplay(p)}</span>
                </p>
                <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                  <Truck size={16} className="text-green-500" />
                  Camion : <span className="font-semibold">{getCamionDisplay(p)}</span>
                </p>
                <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                  <Calendar size={16} className="text-red-500" />
                  ID Journée : <span className="font-semibold">{formatDateAsId(p.created_at)}</span>
                </p>
                <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                  <Clock size={16} className="text-orange-500" />
                  Déclaré à : <span className="font-semibold">{formatTime(p.created_at)}</span>
                </p>
                <p className="flex items-start gap-2 pt-2 border-t border-dashed dark:border-gray-700/50">
                  <FileText size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                  Description : <span className="text-xs italic text-gray-500 dark:text-gray-400">{p.description || "Aucune description fournie"}</span>
                </p>
              </div>
              <div className="flex gap-2 flex-wrap pt-4 border-t border-gray-200 dark:border-gray-700">
                {p.latitude && p.longitude && (
                  <a
                    href={`http://maps.google.com/?q=${p.latitude},${p.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    // Remplacer par le style Button pour l'harmonisation
                    className="flex items-center gap-1 text-sm bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800 rounded-lg px-3 py-1 transition-colors"
                  >
                    <MapPin size={14} /> Localisation
                  </a>
                )}
                {p.photo && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="dark:text-gray-100 dark:border-gray-600 dark:bg-gray-700"
                    onClick={() => { setSelectedPanne(p); setShowPhotoModal(true); }}
                  >
                    <File size={14} className="mr-1" /> Voir photo
                  </Button>
                )}
                {p.statut !== "resolu" && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800"
                    onClick={() => handleTraiterPanne(p)}
                  >
                    <CheckCircle size={14} className="mr-1" /> Traiter
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => { setPanneToDelete(p); setShowModalConfirm(true); }}
                >
                  <Trash2 size={14} className="mr-1" /> Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} variant="outline">Précédent</Button>
          <span className="px-2 py-1 text-gray-700 dark:text-gray-200 font-medium">Page {currentPage} / {totalPages}</span>
          <Button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} variant="outline">Suivant</Button>
        </div>
      )}

      {/* Modales */}
      {showPhotoModal && selectedPanne && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl max-w-lg w-full relative">
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">Photo de la Panne</h3>
            <button onClick={() => setShowPhotoModal(false)} className="absolute top-4 right-4 text-gray-700 dark:text-gray-200 hover:text-red-500 transition-colors"><X size={24} /></button>
            <img src={getPhotoUrl(selectedPanne)} alt="Panne" className="w-full h-auto object-contain rounded-lg border border-gray-200 dark:border-gray-700" />
          </div>
        </div>
      )}

      {showModalConfirm && panneToDelete && (
        <ConfirmDialog
          open={showModalConfirm}
          onClose={() => setShowModalConfirm(false)}
          title="Supprimer cette Panne ?"
          description={`Êtes-vous sûr de vouloir supprimer l'alerte de panne "${panneToDelete.typepanne}" ? Cette action est irréversible.`}
          confirmLabel="Supprimer définitivement"
          confirmColor="bg-red-600 hover:bg-red-700"
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}