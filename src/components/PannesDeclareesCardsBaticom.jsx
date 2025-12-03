import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Card, CardHeader } from "./ui/card.jsx";
import { Button } from "./ui/button.jsx";
import { useToast } from "./ui/use-toast.jsx";
import ConfirmDialog from "./ui/ConfirmDialog.jsx";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Bell, MapPin, FileText, File, X, Wrench, CheckCircle, AlertTriangle } from "lucide-react";

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
  const ITEMS_PER_PAGE = 10;

  // --- Récupération des pannes et chauffeurs + Realtime ---
  useEffect(() => {
    const fetchData = async () => {
      // 1. Récupération des chauffeurs
      const { data: chauffeursData, error: chauffeursError } = await supabase
        .from("users")
        .select("id, name")
        .eq("role", "chauffeur")
        .eq("structure", STRUCTURE);

      if (chauffeursError) console.error("Erreur chargement chauffeurs:", chauffeursError);

      // 2. Récupération des pannes
      const { data: pannesData, error: pannesError } = await supabase
        .from("alertespannes")
        .select("*")
        .eq("structure", STRUCTURE)
        .order("created_at", { ascending: false });

      // --- DÉBOGAGE : VÉRIFICATION DE LA RÉCUPÉRATION DES DONNÉES ---
      console.log("Structure ciblée:", STRUCTURE);
      console.log("Erreur Supabase (si existe):", pannesError);
      console.log("Pannes récupérées de la DB:", pannesData ? pannesData.length : 0, pannesData);
      // -----------------------------------------------------------

      if (pannesError) console.error("Erreur chargement pannes:", pannesError);

      setChauffeurs(chauffeursData || []);
      setPannes(pannesData || []);
    };

    fetchData();

    // Setup Realtime pour NOUVELLES insertions
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
      // Setup Realtime pour les MISES À JOUR (statut traité)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "alertespannes" },
        (payload) => {
          if (payload.new.structure === STRUCTURE) {
            setPannes(prev => prev.map(p => (p.id === payload.new.id ? payload.new : p)));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [toast]);

  const getChauffeurName = useCallback((id) => chauffeurs.find(c => c.id === id)?.name || "Inconnu", [chauffeurs]);

  const getPhotoUrl = (panne) => {
    if (!panne.photo) return null;
    const { data } = supabase.storage.from("pannes").getPublicUrl(panne.photo);
    return data.publicUrl;
  };

  // Fonction pour marquer une panne comme "resolu"
  const handleTraiterPanne = async (panne) => {
    if (panne.statut === "resolu") return;

    const { error } = await supabase
      .from("alertespannes")
      .update({ statut: "resolu" })
      .eq("id", panne.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Panne traitée", description: `"${panne.typepanne}" a été résolue. L'affichage sera mis à jour.`, duration: 3000 });
    }
  };

  // Suppression complète (DB + Storage)
  const confirmDelete = async () => {
    try {
      // 1. Suppression de la photo dans le Storage (si existante)
      if (panneToDelete?.photo) {
        const { error: storageError } = await supabase.storage.from("pannes").remove([panneToDelete.photo]);
        if (storageError) console.error("Erreur suppression photo:", storageError);
      }
      
      // 2. Suppression de l'enregistrement dans la DB
      const { error: dbError } = await supabase.from("alertespannes").delete().eq("id", panneToDelete.id);
      if (dbError) throw dbError;
      
      toast({ title: "Panne supprimée", description: `"${panneToDelete.typepanne}" a été supprimée.`, duration: 3000 });
      setShowModalConfirm(false);
      setPanneToDelete(null);
      setPannes(prev => prev.filter(p => p.id !== panneToDelete.id));
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  // --- Filtrage et pagination ---
  const filteredPannes = pannes.filter(p => {
    const matchFilter = filter === "toutes" ? true : p.statut === filter;
    const matchSearch =
      (p.mission_id?.toString() || "").includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.typepanne || "").toLowerCase().includes(search.toLowerCase()) ||
      getChauffeurName(p.chauffeur_id).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPages = Math.ceil(filteredPannes.length / ITEMS_PER_PAGE);
  const paginatedPannes = filteredPannes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // --- Export Excel / PDF (fonctions maintenues) ---
  const exportExcel = () => {
    const wsData = filteredPannes.map(p => ({
      Mission: p.mission_id || "N/A",
      Chauffeur: getChauffeurName(p.chauffeur_id),
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
      head: [["Mission", "Chauffeur", "Type", "Description", "Statut", "Date", "Latitude", "Longitude", "Photo"]],
      body: filteredPannes.map(p => [
        p.mission_id || "N/A",
        getChauffeurName(p.chauffeur_id),
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
    // Rendu avec icône
    const Icon = statut === 'resolu' ? CheckCircle : statut === 'en_cours' ? AlertTriangle : Wrench;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-full ${colors[statut] || "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
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
            <Button onClick={exportExcel} variant="outline" className="flex items-center gap-1 border-green-500 text-green-600 dark:text-green-400 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/30">
              <File size={16} /> Excel
            </Button>
            <Button onClick={exportPDF} variant="outline" className="flex items-center gap-1 border-red-500 text-red-600 dark:text-red-400 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
              <FileText size={16} /> PDF
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filtre + Recherche */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <input
          type="text"
          placeholder="🔍 Rechercher (Mission, Chauffeur, Type, Description)..."
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedPannes.length === 0 ? (
          <p className="text-center col-span-full text-gray-500 dark:text-gray-400 p-10">Aucune panne trouvée avec les filtres actuels</p>
        ) : paginatedPannes.map(p => (
          <Card key={p.id} className="shadow-lg p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
            <div className="flex flex-col gap-2">
              <h3 className="font-bold text-lg text-gray-800 dark:text-white">{getChauffeurName(p.chauffeur_id)}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Mission: **{p.mission_id || "N/A"}**</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Type: **{p.typepanne}**</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-full">Description: *{p.description}*</p>
              <p className="text-sm mt-1">{getStatusBadge(p.statut)}</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t dark:border-gray-700">
              {p.latitude && p.longitude && (
                <a 
                    href={`http://maps.google.com/maps?q=${p.latitude},${p.longitude}`} // Format Google Maps standard pour plus de compatibilité
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <MapPin size={14}/> Position
                </a>
              )}
              {p.photo && (
                <Button size="sm" variant="outline" onClick={() => { setSelectedPanne(p); setShowPhotoModal(true); }}>
                  Voir photo
                </Button>
              )}
              {/* Bouton Traiter */}
              {p.statut !== "resolu" && (
                <Button
                  size="sm"
                  className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleTraiterPanne(p)}
                >
                  Traiter
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={() => { setPanneToDelete(p); setShowModalConfirm(true); }}>
                Supprimer
              </Button>
            </div>
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
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/60 backdrop-blur-sm">
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
        confirmLabel="Supprimer"
        confirmColor="bg-red-600 hover:bg-red-700"
        onConfirm={confirmDelete}
      />
    </div>
  );
}