/* Fichier complet mis à jour - MissionsSectionGTS.jsx */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Button } from "./ui/button.jsx";
import { Card } from "./ui/card.jsx";
import { Pencil, Lock, Eye, Loader2, User, Truck, Calendar, Trash2, Search } from "lucide-react";
import OpenMissionModalGTS from "./modals/OpenMissionModalGTS.jsx";
import EditMissionModalGTS from "./modals/EditMissionModalGTS.jsx";
import DetailsMissionModalGTS from "./modals/DetailsMissionModalGTS.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";

const ITEMS_PER_PAGE = 12;
const STRUCTURE = "GTS";
const STATUS_CLOSED = "Clôturée";

/* ---------------------------
    CARD MISSION — HARMONISÉE & RESPONSIVE
--------------------------- */
const CardMissionGTS = ({ mission, chauffeur, camion, onEdit, onClose, onView, onDelete }) => {
  const isClosed = mission.statut === STATUS_CLOSED;

  const getStatutStyles = (statut) => {
    switch (statut) {
      case "Affectée": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "En Cours": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "En Chargement": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "En Déchargement": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
      case STATUS_CLOSED: return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
      default: return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  return (
    <Card className={`relative overflow-hidden shadow-md p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 transition-all hover:shadow-lg ${
      ["En Cours", "En Chargement", "En Déchargement"].includes(mission.statut)
        ? "border-l-4 border-green-500 shadow-green-500/10" 
        : "border-l-4 border-gray-300 dark:border-gray-600"
    }`}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2 truncate">
            <User size={16} className="text-indigo-500 flex-shrink-0" /> 
            <span className="truncate">{chauffeur?.name || "N/A"}</span>
          </h3>
          
          <div className="mt-2 space-y-1">
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 truncate">
              <Truck size={14} className="text-blue-500 flex-shrink-0" />
              <span className="truncate font-semibold">{camion?.immatriculation || "N/A"}</span>
            </p>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Calendar size={14} className="text-green-500 flex-shrink-0" />
              <span>{mission.date ? new Date(mission.date).toLocaleDateString() : "N/A"}</span>
            </p>
          </div>
        </div>

        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md whitespace-nowrap shadow-sm ${getStatutStyles(mission.statut)}`}>
          {mission.statut}
        </span>
      </div>

      {/* Détails Frais - Grille */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg text-center border border-gray-100 dark:border-gray-700">
          <p className="text-[9px] uppercase font-bold text-gray-400">Frais Fuel</p>
          <p className="text-xs font-black text-gray-700 dark:text-gray-200">{(mission.frais_fuel || 0).toLocaleString()} <span className="text-[8px]">F</span></p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg text-center border border-gray-100 dark:border-gray-700">
          <p className="text-[9px] uppercase font-bold text-gray-400">Mission</p>
          <p className="text-xs font-black text-gray-700 dark:text-gray-200">{(mission.frais_mission || 0).toLocaleString()} <span className="text-[8px]">F</span></p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-end gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
        {!isClosed ? (
          <div className="flex w-full sm:w-auto gap-2">
            <Button size="sm" className="flex-1 sm:flex-none h-9 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onEdit(mission)}>
              <Pencil size={14} className="mr-1.5" /> Modifier
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none h-9 bg-red-600 hover:bg-red-700 text-white" onClick={() => onClose(mission.id)}>
              <Lock size={14} className="mr-1.5" /> Clôturer
            </Button>
          </div>
        ) : (
          <div className="flex w-full sm:w-auto gap-2">
            <Button size="sm" className="flex-1 sm:flex-none h-9 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onView(mission)}>
              <Eye size={14} className="mr-1.5" /> Détails
            </Button>
            <Button size="sm" variant="outline" className="h-9 border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => onDelete(mission.id)}>
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

/* ---------------------------
    MAIN COMPONENT — MissionsSectionGTS
--------------------------- */
export default function MissionsSectionGTS() {
  const [showModal, setShowModal] = useState(false);
  const [editMission, setEditMission] = useState(null);
  const [detailsMission, setDetailsMission] = useState(null);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [camions, setCamions] = useState([]);
  const [missions, setMissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [p, c, m] = await Promise.all([
        supabase.from("profiles").select("id, name").eq("role", "chauffeur").eq("structure", STRUCTURE),
        supabase.from("camions").select("id, immatriculation").eq("structure", STRUCTURE),
        supabase.from("missions_gts").select("*").eq("structure", STRUCTURE).order("date", { ascending: false })
      ]);
      setChauffeurs(p.data || []);
      setCamions(c.data || []);
      setMissions(m.data || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCloseMission = async (id) => {
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("missions_gts").update({ statut: STATUS_CLOSED, date_cloture: today }).eq("id", id);
    fetchData();
  };

  const handleDeleteMission = async (id) => {
    await supabase.from("missions_gts").delete().eq("id", id);
    fetchData();
  };

  const { paginatedMissions, totalPages } = useMemo(() => {
    const filtered = missions.filter((m) => {
      const chauffeur = chauffeurs.find((c) => c.id === m.chauffeur_id);
      const camion = camions.find((c) => c.id === m.camion_id);
      const lower = searchTerm.toLowerCase();
      return (
        chauffeur?.name?.toLowerCase().includes(lower) ||
        camion?.immatriculation?.toLowerCase().includes(lower) ||
        (m.date || "").includes(lower)
      );
    });

    const statusPriority = { "En Cours": 1, "En Chargement": 1, "En Déchargement": 1, "Affectée": 2, "Clôturée": 3 };
    const sorted = [...filtered].sort((a, b) => {
      const pA = statusPriority[a.statut] || 99;
      const pB = statusPriority[b.statut] || 99;
      return pA !== pB ? pA - pB : new Date(b.date) - new Date(a.date);
    });

    return {
      paginatedMissions: sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
      totalPages: Math.ceil(sorted.length / ITEMS_PER_PAGE)
    };
  }, [missions, chauffeurs, camions, searchTerm, currentPage]);

  return (
    <div className="p-3 md:p-6 space-y-4 animate-fadeIn">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <Calendar className="text-blue-600 w-6 h-6 md:w-8 md:h-8" />
            Missions GTS
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Suivi logistique et financier</p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-500/20"
        >
          + Ouvrir une Mission
        </Button>
      </div>

      {/* RECHERCHE */}
      <div className="flex items-center bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
        <Search size={18} className="text-gray-400 mr-3 flex-shrink-0" />
        <input
          type="text"
          placeholder="Rechercher chauffeur, camion..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 text-gray-800 dark:text-gray-200 outline-none"
        />
        {isLoading && <Loader2 className="animate-spin text-blue-500 ml-2" size={18} />}
      </div>

      {/* GRILLE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />
          ))
        ) : paginatedMissions.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-gray-50 dark:bg-gray-800/20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-500">Aucune mission GTS trouvée.</p>
          </div>
        ) : (
          paginatedMissions.map((m) => (
            <CardMissionGTS
              key={m.id}
              mission={m}
              chauffeur={chauffeurs.find((c) => c.id === m.chauffeur_id)}
              camion={camions.find((c) => c.id === m.camion_id)}
              onEdit={setEditMission}
              onView={setDetailsMission}
              onClose={(id) => { setSelectedMissionId(id); setConfirmOpen(true); }}
              onDelete={(id) => { setSelectedMissionId(id); setConfirmDeleteOpen(true); }}
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
              className={`min-w-[40px] rounded-lg ${currentPage === i + 1 ? "bg-blue-600" : "bg-white dark:bg-gray-800"}`}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}

      {/* MODALS */}
      {showModal && <OpenMissionModalGTS setShowModal={setShowModal} fetchMissions={fetchData} chauffeurs={chauffeurs} camions={camions} />}
      {editMission && <EditMissionModalGTS editingMission={editMission} setShowModal={setEditMission} fetchMissions={fetchData} />}
      {detailsMission && <DetailsMissionModalGTS mission={detailsMission} setShowModal={setDetailsMission} />}

      <ConfirmDialog
        open={confirmOpen}
        onClose={setConfirmOpen}
        title="Clôturer cette mission ?"
        description="Elle sera archivée et les frais ne pourront plus être modifiés."
        confirmLabel="Clôturer"
        confirmColor="bg-red-600 hover:bg-red-700"
        onConfirm={async () => { await handleCloseMission(selectedMissionId); setConfirmOpen(false); }}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={setConfirmDeleteOpen}
        title="Supprimer la mission ?"
        description="Cette action supprimera définitivement l'historique de cette mission."
        confirmLabel="Supprimer"
        confirmColor="bg-black dark:bg-gray-900"
        onConfirm={async () => { await handleDeleteMission(selectedMissionId); setConfirmDeleteOpen(false); }}
      />
    </div>
  );
}