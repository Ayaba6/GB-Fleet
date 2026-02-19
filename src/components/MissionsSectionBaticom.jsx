// src/components/MissionsSectionBaticom.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Button } from "../components/ui/button.jsx";
import { Card } from "../components/ui/card.jsx";
import { 
  Pencil, 
  Lock, 
  Eye, 
  Loader2, 
  Calendar, 
  Trash2, 
  User, 
  Truck, 
  Search 
} from "lucide-react";

import OpenDayModalBaticom from "./modals/OpenDayModalBaticom.jsx";
import EditDayModalBaticom from "./modals/EditDayModalBaticom.jsx";
import DetailsJourneeModal from "./modals/DetailsJourneeModal.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";

const ITEMS_PER_PAGE = 12; // Nombre pair recommandé pour la grille
const STRUCTURE = "BATICOM";
const STATUS_CLOSED = "clôturée";

// ----------------------------
// COMPOSANT CARD JOURNÉE
// ----------------------------
const CardJournee = ({ journee, chauffeur, camion, onEdit, onClose, onView, onDelete }) => {
  const isClosed = journee.statut === STATUS_CLOSED;
  const isInProgress = journee.statut === "en cours";
  const isAssigned = journee.statut === "affectée";

  const borderStyle = isAssigned 
    ? "border-l-4 border-yellow-500" 
    : isInProgress 
    ? "border-l-4 border-blue-500" 
    : "border-l-4 border-green-500 opacity-90";

  return (
    <Card className={`relative overflow-hidden shadow-md p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 transition-all hover:shadow-lg ${borderStyle}`}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2 truncate">
            <User size={16} className="text-indigo-500 flex-shrink-0" /> 
            <span className="truncate">{chauffeur?.name || "Sans nom"}</span>
          </h3>
          
          <div className="mt-2 space-y-1">
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 truncate">
              <Truck size={14} className="text-blue-500 flex-shrink-0" />
              <span className="truncate"><b>{camion?.immatriculation || "N/A"}</b> ({camion?.marquemodele || "N/A"})</span>
            </p>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Calendar size={14} className="text-green-500 flex-shrink-0" />
              <span>{journee.date ? new Date(journee.date).toLocaleDateString() : "Date inconnue"}</span>
            </p>
          </div>
        </div>

        <span className={`text-[9px] uppercase tracking-widest font-black px-2 py-1 rounded-md whitespace-nowrap ${
          isClosed ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
          isInProgress ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
        }`}>
          {journee.statut}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-gray-400">Fuel (R/C)</span>
          <span className="font-bold text-gray-700 dark:text-gray-200">{journee.fuel_restant}L / {journee.fuel_complement}L</span>
        </div>
        <div className="flex flex-col border-l border-gray-200 dark:border-gray-700 pl-2">
          <span className="text-[10px] uppercase font-semibold text-gray-400">Voyages</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">{journee.voyages || 0}</span>
        </div>
      </div>

      {/* ACTIONS RESPONSIVES */}
      <div className="flex flex-wrap justify-end gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
        {isClosed ? (
          <div className="flex w-full sm:w-auto gap-2">
            <Button size="sm" className="flex-1 sm:flex-none h-9 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onView(journee)}>
              <Eye size={14} className="mr-1.5" /> Détails
            </Button>
            <Button size="sm" variant="outline" className="h-9 border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => onDelete(journee.id)}>
              <Trash2 size={14} />
            </Button>
          </div>
        ) : (
          <div className="flex w-full sm:w-auto gap-2">
            <Button size="sm" className="flex-1 sm:flex-none h-9 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => onEdit(journee)}>
              <Pencil size={14} className="mr-1.5" /> Modifier
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none h-9 bg-red-600 hover:bg-red-700 text-white" onClick={() => onClose(journee.id)}>
              <Lock size={14} className="mr-1.5" /> Clôturer
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

// ----------------------------
// COMPOSANT PRINCIPAL
// ----------------------------
export default function MissionsSectionBaticom() {
  const [showModal, setShowModal] = useState(false);
  const [editJournee, setEditJournee] = useState(null);
  const [detailsJournee, setDetailsJournee] = useState(null);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [camions, setCamions] = useState([]);
  const [journees, setJournees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedJourneeId, setSelectedJourneeId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [p, c, j] = await Promise.all([
        supabase.from("profiles").select("id, name, role, structure").eq("role", "chauffeur").eq("structure", STRUCTURE),
        supabase.from("camions").select("id, immatriculation, structure, statut, marquemodele").eq("structure", STRUCTURE),
        supabase.from("journee_baticom").select("*").eq("structure", STRUCTURE).order("date", { ascending: false })
      ]);
      setChauffeurs(p.data || []);
      setCamions(c.data || []);
      setJournees(j.data || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCloseJournee = async (id) => {
    await supabase.from("journee_baticom").update({ statut: STATUS_CLOSED }).eq("id", id);
    fetchData();
  };

  const handleDeleteJournee = async (id) => {
    await supabase.from("journee_baticom").delete().eq("id", id);
    fetchData();
  };

  const { paginatedJournees, totalPages } = useMemo(() => {
    const filtered = journees.filter((j) => {
      const chauffeur = chauffeurs.find((c) => c.id === j.chauffeur_id);
      const camion = camions.find((c) => c.id === j.camion_id);
      const lower = searchTerm.toLowerCase();
      return (
        chauffeur?.name?.toLowerCase().includes(lower) ||
        camion?.immatriculation?.toLowerCase().includes(lower) ||
        (j.date || "").includes(lower)
      );
    });

    const statusPriority = { "affectée": 1, "en cours": 2, "clôturée": 3 };
    const sorted = [...filtered].sort((a, b) => {
      const pA = statusPriority[a.statut?.toLowerCase()] || 99;
      const pB = statusPriority[b.statut?.toLowerCase()] || 99;
      return pA !== pB ? pA - pB : new Date(b.date) - new Date(a.date);
    });

    return {
      paginatedJournees: sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
      totalPages: Math.ceil(sorted.length / ITEMS_PER_PAGE)
    };
  }, [journees, chauffeurs, camions, searchTerm, currentPage]);

  return (
    <div className="p-3 md:p-6 space-y-4 animate-fadeIn">
      
      {/* HEADER RESPONSIVE */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <Calendar className="text-blue-600 w-6 h-6 md:w-8 md:h-8" />
            Missions BATICOM
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Suivi et gestion des journées de travail</p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/20"
        >
          + Ouvrir une Journée
        </Button>
      </div>

      {/* BARRE DE RECHERCHE */}
      <div className="flex items-center bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
        <Search size={18} className="text-gray-400 mr-3" />
        <input
          type="text"
          placeholder="Rechercher chauffeur, camion ou date..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 text-gray-800 dark:text-gray-200"
        />
        {isLoading && <Loader2 className="animate-spin text-blue-500 ml-2" size={18} />}
      </div>

      {/* GRILLE DE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 bg-gray-100 dark:bg-gray-800/50 animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700" />
          ))
        ) : paginatedJournees.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-gray-50 dark:bg-gray-800/20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-500">Aucune mission trouvée.</p>
          </div>
        ) : (
          paginatedJournees.map((j) => (
            <CardJournee
              key={j.id}
              journee={j}
              chauffeur={chauffeurs.find((c) => c.id === j.chauffeur_id)}
              camion={camions.find((c) => c.id === j.camion_id)}
              onEdit={setEditJournee}
              onView={setDetailsJournee}
              onClose={(id) => { setSelectedJourneeId(id); setConfirmOpen(true); }}
              onDelete={(id) => { setSelectedJourneeId(id); setConfirmDeleteOpen(true); }}
            />
          ))
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center flex-wrap gap-2 pt-6">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              size="sm"
              variant={currentPage === i + 1 ? "default" : "outline"}
              onClick={() => setCurrentPage(i + 1)}
              className={`min-w-[40px] rounded-lg ${currentPage === i + 1 ? "bg-blue-600 shadow-md shadow-blue-500/20" : "bg-white dark:bg-gray-800"}`}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}

      {/* MODALS */}
      {showModal && <OpenDayModalBaticom setShowModal={setShowModal} fetchJournees={fetchData} chauffeurs={chauffeurs} camions={camions} />}
      {editJournee && <EditDayModalBaticom editingJournee={editJournee} setShowModal={setEditJournee} fetchJournees={fetchData} />}
      {detailsJournee && <DetailsJourneeModal journee={detailsJournee} setShowModal={setDetailsJournee} />}

      <ConfirmDialog
        open={confirmOpen}
        onClose={setConfirmOpen}
        title="Clôturer cette journée ?"
        description="Une fois clôturée, cette journée ne pourra plus être modifiée."
        confirmLabel="Clôturer"
        confirmColor="bg-red-600 hover:bg-red-700"
        onConfirm={async () => { await handleCloseJournee(selectedJourneeId); setConfirmOpen(false); }}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={setConfirmDeleteOpen}
        title="Supprimer définitivement ?"
        description="Cette action supprimera toutes les données liées à cette journée."
        confirmLabel="Supprimer"
        confirmColor="bg-black dark:bg-gray-900"
        onConfirm={async () => { await handleDeleteJournee(selectedJourneeId); setConfirmDeleteOpen(false); }}
      />
    </div>
  );
}