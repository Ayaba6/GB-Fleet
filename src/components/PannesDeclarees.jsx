// src/components/PannesDeclarees.js
import React, { useEffect, useState } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Button } from "./ui/button.jsx";
import { Card, CardHeader } from "./ui/card.jsx";
import { useToast } from "./ui/use-toast.jsx";
import ConfirmDialog from "./ui/ConfirmDialog.jsx";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Search, Bell, X, MapPin, FileText, File } from "lucide-react";

export default function PannesDeclarees() {
  const { toast } = useToast();

  const [pannes, setPannes] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [filter, setFilter] = useState("toutes");
  const [search, setSearch] = useState("");
  const [newCount, setNewCount] = useState(0);
  const [selectedPanne, setSelectedPanne] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showModalConfirm, setShowModalConfirm] = useState(false);
  const [panneToDelete, setPanneToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // 🔄 Charger les pannes + chauffeurs
  useEffect(() => {
    const fetchData = async () => {
      const { data: chauffeursData } = await supabase.from("users").select("*").eq("role", "chauffeur");
      const { data: pannesData } = await supabase
        .from("alertespannes")
        .select("*")
        .order("created_at", { ascending: false });

      setChauffeurs(chauffeursData || []);
      setPannes(pannesData || []);
    };
    fetchData();

    // Realtime notifications
    const pannesChannel = supabase
      .channel("pannes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alertespannes" },
        (payload) => {
          setPannes(prev => [payload.new, ...prev]);
          setNewCount(prev => prev + 1);
          toast(`Nouvelle panne : ${payload.new.typepanne}`, { duration: 5000 });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(pannesChannel);
  }, [toast]);

  const getChauffeurName = (id) => chauffeurs.find(c => c.id === id)?.name || "Inconnu";

  const getPhotoUrl = (panne) => {
    if (!panne.photo) return null;
    const { data } = supabase.storage.from("pannes").getPublicUrl(panne.photo);
    return data.publicUrl;
  };

  const updateStatut = async (id, newStatut) => {
    const { error } = await supabase.from("alertespannes").update({ statut: newStatut }).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      setPannes(prev => prev.map(p => (p.id === id ? { ...p, statut: newStatut } : p)));
      toast({ title: "Statut mis à jour", description: `"${newStatut}"` });
    }
  };

  const openPhotoModal = (panne) => {
    setSelectedPanne(panne);
    setShowPhotoModal(true);
  };

  const confirmDelete = async () => {
    try {
      await supabase.from("alertespannes").delete().eq("id", panneToDelete.id);
      toast({ title: "Panne supprimée", description: `"${panneToDelete.typepanne}" a été supprimée.` });
      setShowModalConfirm(false);
      setPanneToDelete(null);
      setPannes(prev => prev.filter(p => p.id !== panneToDelete.id));
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  // 🔍 Recherche + filtre
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

  // 📊 Export Excel
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
    XLSX.writeFile(wb, "pannes.xlsx");
    toast({ title: "Export Excel", description: "Liste des pannes exportée." });
  };

  // 📄 Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Liste des Pannes Déclarées", 14, 20);
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
    doc.save("pannes.pdf");
    toast({ title: "Export PDF", description: "Document généré." });
  };

  // 🟦 Badges statut
  const getStatusBadge = (statut) => {
    const colors = {
      en_cours: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      resolu: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      signale: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    };
    const labels = { en_cours: "En cours", resolu: "Résolu", signale: "Signalé" };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[statut] || "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
        {labels[statut] || statut}
      </span>
    );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-6">
      <div className="w-full px-4 md:px-6 lg:px-8 space-y-6 mx-auto max-w-[1440px]">

        {/* Header */}
        <Card className="shadow-xl bg-white/90 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <CardHeader className="flex justify-between items-center p-4 sm:p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              <Bell size={24} className="text-red-600" /> Gestion des Pannes
            </h2>

            <div className="flex gap-2">
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
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="🔍 Rechercher..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-64 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:placeholder-gray-400"
            />
            <select
              value={filter}
              onChange={e => { setFilter(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-36 px-3 py-2 rounded-lg border bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
            >
              <option value="toutes">Toutes les pannes</option>
              <option value="en_cours">En cours</option>
              <option value="resolu">Résolu</option>
              <option value="signale">Signalé</option>
            </select>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-700 p-4 md:p-6 w-full overflow-x-auto">
          <div className="min-w-[900px] w-full">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">Mission</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">Chauffeur</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">Statut</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">Actions</th>
                </tr>
              </thead>

              <tbody className="text-sm">
                {paginatedPannes.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-300">Aucune panne trouvée</td></tr>
                ) : paginatedPannes.map(p => (
                  <tr key={p.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition">
                    <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{p.mission_id || "N/A"}</td>
                    <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{getChauffeurName(p.chauffeur_id)}</td>
                    <td className="px-4 py-2 font-semibold text-gray-800 dark:text-gray-200">{p.typepanne}</td>
                    <td className="px-4 py-2 truncate max-w-xs text-gray-700 dark:text-gray-300">{p.description}</td>
                    <td className="px-4 py-2">{getStatusBadge(p.statut)}</td>
                    <td className="px-4 py-2 flex flex-col gap-1 justify-center items-center">
                      {p.statut !== "resolu" && <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatut(p.id, "resolu")}>Résolu</Button>}
                      {p.statut !== "en_cours" && <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => updateStatut(p.id, "en_cours")}>En cours</Button>}
                      {p.latitude && p.longitude && (
                        <a href={`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                          <MapPin size={14}/> Position
                        </a>
                      )}
                      {p.photo && <Button size="sm" variant="outline" onClick={() => openPhotoModal(p)} className="dark:text-gray-200 dark:border-gray-600">Voir photo</Button>}
                      <Button size="sm" variant="destructive" onClick={() => { setPanneToDelete(p); setShowModalConfirm(true); }}>Supprimer</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700">
            {Array.from({ length: totalPages }, (_, i) => (
              <Button key={i} size="sm" variant={i + 1 === currentPage ? "default" : "outline"} onClick={() => setCurrentPage(i + 1)} className="dark:text-gray-200 dark:border-gray-600">{i + 1}</Button>
            ))}
          </div>
        )}

        {/* Modal photo */}
        {showPhotoModal && selectedPanne && getPhotoUrl(selectedPanne) && (
          <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full relative shadow-2xl">
              <button
                onClick={() => setShowPhotoModal(false)}
                className="absolute -top-3 -right-3 p-1 rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-lg transition"
              >
                <X size={28}/>
              </button>

              <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-100">
                Photo de la panne ({selectedPanne.typepanne})
              </h3>

              <img src={getPhotoUrl(selectedPanne)} alt="Panne" className="w-full h-auto object-contain rounded-lg max-h-[80vh]" />
            </div>
          </div>
        )}

        {/* Confirm Delete */}
        <ConfirmDialog
          open={showModalConfirm}
          onClose={setShowModalConfirm}
          title="Supprimer cette panne ?"
          description={`Êtes-vous sûr de vouloir supprimer "${panneToDelete?.typepanne}" ?`}
          confirmLabel="Supprimer"
          confirmColor="bg-red-600 hover:bg-red-700"
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
}
