// src/components/CamionsSection.jsx
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Button } from "../components/ui/button.jsx";
import { Card, CardHeader } from "../components/ui/card.jsx";
import { useToast } from "../components/ui/use-toast.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import CamionModal from "./modals/CamionModal.jsx";
import { Pencil, Trash2, Truck, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const getStatusBadge = (statut) => {
  const colors = {
    Disponible: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100",
    "En maintenance": "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100",
    Indisponible: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100",
    Mission: "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100",
  };
  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${colors[statut] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}>
      {statut}
    </span>
  );
};

const renderDocuments = (c) => {
  const docs = [];
  const docList = [
    { url: c.cartegriseurl, label: "Carte Grise", expiry: c.cartegriseexpiry },
    { url: c.assuranceurl, label: "Assurance", expiry: c.assuranceexpiry },
    { url: c.visitetechniqueurl, label: "Visite Tech.", expiry: c.visitetechniqueexpiry },
  ];
  docList.forEach(({ url, label, expiry }, i) => {
    if (url) {
      const expired = expiry && new Date(expiry) < new Date();
      docs.push(
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1 ${expired ? "line-through" : ""}`}
        >
          <FileText size={14} /> {label} {expiry && <span className="text-xs text-gray-500 dark:text-gray-300">({new Date(expiry).toLocaleDateString()})</span>}
        </a>
      );
    }
  });
  return docs.length ? <div className="flex flex-col gap-1 mt-1">{docs}</div> : <span className="text-gray-400 italic text-sm">Aucun document</span>;
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
  const ITEMS_PER_PAGE = 10;

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

  // Fonction pour passer tous les camions en Mission à Disponible
  const updateMissionsToDisponible = async () => {
    try {
      const { error } = await supabase
        .from("camions")
        .update({ statut: "Disponible" })
        .eq("statut", "Mission");
      if (error) throw error;
      toast({ title: "Mise à jour", description: "Tous les camions en mission sont maintenant disponibles." });
      fetchCamions();
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

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
    });
    doc.save("liste_camions.pdf");
    toast({ title: "Export PDF", description: "Le document a été généré." });
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <Card className="shadow-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <Truck size={24} className="text-blue-600 dark:text-blue-400" /> Gestion de la Flotte
          </h2>
          <div className="flex gap-2">
            <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white">
              + Créer Camion
            </Button>
            <Button onClick={updateMissionsToDisponible} className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white">
              Clôturer la journée
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white/80 dark:bg-gray-800/80 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700 backdrop-blur-sm">
        <input
          type="text"
          placeholder="🔍 Rechercher..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="flex-1 min-w-[150px] border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-200"
        />

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          className="border rounded px-2 py-1 bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
        >
          <option value="">Tous types</option>
          <option value="Benne">Benne</option>
          <option value="Tracteur">Tracteur</option>
          <option value="Remorque">Remorque</option>
          <option value="Semi-remorque">Semi-remorque</option>
        </select>

        <select
          value={statutFilter}
          onChange={(e) => { setStatutFilter(e.target.value); setCurrentPage(1); }}
          className="border rounded px-2 py-1 bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
        >
          <option value="">Tous statuts</option>
          <option value="Disponible">Disponible</option>
          <option value="En maintenance">En maintenance</option>
          <option value="Indisponible">Indisponible</option>
          <option value="Mission">Mission</option>
        </select>

        <select
          value={structureFilter}
          onChange={(e) => { setStructureFilter(e.target.value); setCurrentPage(1); }}
          className="border rounded px-2 py-1 bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
        >
          <option value="">Toutes structures</option>
          <option value="GTS">GTS</option>
          <option value="BATICOM">BATICOM</option>
        </select>

        <div className="flex gap-2">
          <Button onClick={exportExcel} variant="outline" className="border-green-500 text-green-600 dark:text-green-400">Excel</Button>
          <Button onClick={exportPDF} variant="outline" className="border-red-500 text-red-600 dark:text-red-400">PDF</Button>
        </div>
      </div>

      {/* Liste des cartes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedCamions.length === 0 ? (
          <p className="text-center col-span-full text-gray-500 dark:text-gray-400">Aucun camion trouvé</p>
        ) : (
          paginatedCamions.map((c) => (
            <Card key={c.id} className="shadow-lg p-4 bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                    <Truck size={18} /> {c.immatriculation}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Type: {c.type}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Modèle: {c.marquemodele}</p>
                  <p className="text-sm mt-1">{getStatusBadge(c.statut)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Structure: {c.structure || "-"}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(c)} className="bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-600/60 transition">
                    <Pencil size={16} className="text-gray-800 dark:text-gray-200 opacity-80 hover:opacity-100 transition" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => { setCamionToDelete(c); setConfirmOpen(true); }} className="bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-600/60 transition">
                    <Trash2 size={16} className="text-red-600 dark:text-red-400 opacity-80 hover:opacity-100 transition" />
                  </Button>
                </div>
              </div>
              <div className="mt-3">{renderDocuments(c)}</div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              size="sm"
              variant={i + 1 === currentPage ? "default" : "outline"}
              onClick={() => setCurrentPage(i + 1)}
              className={i + 1 === currentPage ? "bg-blue-600 text-white" : ""}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && <CamionModal editingCamion={editingCamion} setShowModal={setShowModal} fetchCamions={fetchCamions} />}
      <ConfirmDialog
        open={confirmOpen}
        onClose={setConfirmOpen}
        title="Supprimer ce camion ?"
        description={`Êtes-vous sûr de vouloir supprimer "${camionToDelete?.immatriculation}" ?`}
        confirmLabel="Supprimer"
        confirmColor="bg-red-600 hover:bg-red-700"
        onConfirm={confirmDelete}
      />
    </div>
  );
}