// src/components/CamionsSection.jsx
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Button } from "../components/ui/button.jsx";
import { Card, CardHeader } from "../components/ui/card.jsx";
import { useToast } from "../components/ui/use-toast.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import CamionModal from "./modals/CamionModal.jsx";
import { Pencil, Trash2, Truck, FileText, File } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const getStatusBadge = (statut) => {
  const colors = {
    Disponible: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100",
    "En maintenance": "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100",
    Indisponible: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100",
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${colors[statut] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}>{statut}</span>;
};

const renderDocuments = (c) => {
  const docs = [];
  const docList = [
    { url: c.cartegriseurl, label: "Carte Grise", expiry: c.cartegriseexpiry },
    { url: c.assuranceurl, label: "Assurance", expiry: c.assuranceexpiry },
    { url: c.visitetechniqueurl, label: "Visite Tech.", expiry: c.visitetechniqueexpiry },
  ];
  docList.forEach((doc, i) => {
    if (doc.url) {
      const expired = doc.expiry && new Date(doc.expiry) < new Date();
      docs.push(
        <div key={i} className="flex items-center gap-1 text-sm">
          <a href={doc.url} target="_blank" rel="noopener noreferrer" className={`text-blue-600 dark:text-blue-400 hover:underline ${expired ? "line-through" : ""}`}>
            <FileText size={14} /> {doc.label}
          </a>
          {doc.expiry && <span className={`text-xs ${expired ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-300"}`}>({new Date(doc.expiry).toLocaleDateString()})</span>}
        </div>
      );
    }
  });
  return docs.length ? <div className="flex flex-col gap-1">{docs}</div> : <span className="text-gray-400 italic dark:text-gray-400">Aucun</span>;
};

export default function CamionsSection() {
  const { toast } = useToast();
  const [camions, setCamions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCamion, setEditingCamion] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [camionToDelete, setCamionToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [structureFilter, setStructureFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const fetchCamions = useCallback(async () => {
    const { data, error } = await supabase.from("camions").select("*").order("inserted_at", { ascending: false });
    if (error) toast({ title: "Erreur de chargement", description: error.message, variant: "destructive" });
    else setCamions(data || []);
  }, [toast]);

  useEffect(() => { fetchCamions(); }, [fetchCamions]);

  const confirmDelete = async () => {
    try {
      const { error } = await supabase.from("camions").delete().eq("id", camionToDelete.id);
      if (error) throw error;
      toast({ title: "Camion supprimé", description: `Le camion "${camionToDelete.immatriculation}" a été supprimé.` });
      fetchCamions();
      setCamionToDelete(null);
      setConfirmOpen(false);
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleEdit = (c) => { setEditingCamion(c); setShowModal(true); };
  const handleAdd = () => { setEditingCamion(null); setShowModal(true); };

  const filteredCamions = camions.filter(
    (c) =>
      c.immatriculation?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (typeFilter === "" || c.type === typeFilter) &&
      (statutFilter === "" || c.statut === statutFilter) &&
      (structureFilter === "" || c.structure === structureFilter)
  );

  const totalPages = Math.ceil(filteredCamions.length / ITEMS_PER_PAGE);
  const paginatedCamions = filteredCamions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const exportExcel = () => {
    const wsData = filteredCamions.map((c) => ({
      Immatriculation: c.immatriculation,
      Type: c.type,
      "Marque/Modèle": c.marquemodele,
      Statut: c.statut,
      Structure: c.structure || "",
      "Carte Grise": c.cartegriseurl ? "Oui" : "",
      "Exp. Carte Grise": c.cartegriseexpiry || "",
      Assurance: c.assuranceurl ? "Oui" : "",
      "Exp. Assurance": c.assuranceexpiry || "",
      "Visite Technique": c.visitetechniqueurl ? "Oui" : "",
      "Exp. Visite Technique": c.visitetechniqueexpiry || "",
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Camions");
    XLSX.writeFile(wb, "liste_camions.xlsx");
    toast({ title: "Export Excel", description: "Liste des camions exportée." });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Liste des Camions", 14, 20);
    doc.setFontSize(10);
    doc.text(`Généré le: ${new Date().toLocaleString()}`, 14, 28);
    autoTable(doc, {
      startY: 35,
      head: [["Immat.", "Type", "Modèle", "Statut", "Structure", "CG", "Assur.", "VT"]],
      body: filteredCamions.map((c) => [c.immatriculation, c.type, c.marquemodele, c.statut, c.structure || "-", c.cartegriseurl ? "Oui" : "", c.assuranceurl ? "Oui" : "", c.visitetechniqueurl ? "Oui" : ""]),
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
    });
    doc.save("liste_camions.pdf");
    toast({ title: "Export PDF", description: "Le document a été généré." });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 container animate-fadeInUp">
      {/* Header */}
      <Card className="shadow-xl bg-white/90 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 sm:p-6 gap-3 md:gap-0">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <Truck size={24} className="text-blue-600 dark:text-blue-400" /> Gestion de la Flotte
          </h2>
          <Button onClick={handleAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white">
            + Créer Camion
          </Button>
        </CardHeader>
      </Card>

      {/* Filtres + exports */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          <input type="text" placeholder="🔍 Rechercher par immatriculation..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full sm:w-64 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-200"/>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }} className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
            <option value="">Tous types</option>
            <option value="Benne">Benne</option>
            <option value="Tracteur">Tracteur</option>
            <option value="Remorque">Remorque</option>
            <option value="Semi-remorque">Semi-remorque</option>
          </select>
          <select value={statutFilter} onChange={(e) => { setStatutFilter(e.target.value); setCurrentPage(1); }} className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
            <option value="">Tous statuts</option>
            <option value="Disponible">Disponible</option>
            <option value="En maintenance">En maintenance</option>
            <option value="Indisponible">Indisponible</option>
          </select>
          <select value={structureFilter} onChange={(e) => { setStructureFilter(e.target.value); setCurrentPage(1); }} className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
            <option value="">Toutes structures</option>
            <option value="GTS">GTS</option>
            <option value="BATICOM">BATICOM</option>
          </select>
        </div>
        <div className="flex gap-2 mt-2 sm:mt-0">
          <Button onClick={exportExcel} variant="outline" className="flex items-center gap-1 border-green-500 text-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-700/20"><File size={16} /> Excel</Button>
          <Button onClick={exportPDF} variant="outline" className="flex items-center gap-1 border-red-500 text-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-700/20"><FileText size={16} /> PDF</Button>
        </div>
      </div>

      {/* Tableau responsive */}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Immatriculation</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Marque/Modèle</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Statut</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 hidden lg:table-cell">Structure</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 hidden lg:table-cell">Documents</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {paginatedCamions.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">Aucun camion trouvé</td></tr>
            ) : (
              paginatedCamions.map((c) => (
                <tr key={c.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/30 transition">
                  <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">{c.immatriculation}</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{c.type}</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{c.marquemodele}</td>
                  <td className="px-4 py-2">{getStatusBadge(c.statut)}</td>
                  <td className="px-4 py-2 hidden lg:table-cell">{c.structure || "-"}</td>
                  <td className="px-4 py-2 hidden lg:table-cell">{renderDocuments(c)}</td>
                  <td className="px-4 py-2 flex justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(c)}><Pencil size={16} /></Button>
                    <Button variant="destructive" size="sm" onClick={() => { setCamionToDelete(c); setConfirmOpen(true); }}><Trash2 size={16} /></Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button key={i} size="sm" variant={i + 1 === currentPage ? "default" : "outline"} onClick={() => setCurrentPage(i + 1)} className={i + 1 === currentPage ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700/50"}>{i + 1}</Button>
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && <CamionModal editingCamion={editingCamion} setShowModal={setShowModal} fetchCamions={fetchCamions} />}
      <ConfirmDialog open={confirmOpen} onClose={setConfirmOpen} title="Supprimer ce camion ?" description={`Êtes-vous sûr de vouloir supprimer "${camionToDelete?.immatriculation}" ?`} confirmLabel="Supprimer" confirmColor="bg-red-600 hover:bg-red-700" onConfirm={confirmDelete}/>
    </div>
  );
}
