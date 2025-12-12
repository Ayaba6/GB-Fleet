/* Fichier complet corrigé - MissionsSectionGTS.jsx */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Button } from "./ui/button.jsx";
import { Card, CardHeader } from "./ui/card.jsx";
import { Pencil, Lock, Eye, Loader2, User, Truck, Calendar, Trash2 } from "lucide-react";
import OpenMissionModalGTS from "./modals/OpenMissionModalGTS.jsx";
import EditMissionModalGTS from "./modals/EditMissionModalGTS.jsx";
import DetailsMissionModalGTS from "./modals/DetailsMissionModalGTS.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";

const ITEMS_PER_PAGE = 10;
const STRUCTURE = "GTS";
const STATUS_CLOSED = "Clôturée";

/* ---------------------------
    CARD MISSION — HARMONISÉE
--------------------------- */
const CardMissionGTS = ({ mission, chauffeur, camion, onEdit, onClose, onView, onDelete }) => {
  const isClosed = mission.statut === STATUS_CLOSED;

  let statutBg, statutText;
  switch (mission.statut) {
    case "Affectée": statutBg = "bg-yellow-600"; statutText = "text-white"; break;
    case "En Cours": statutBg = "bg-green-600"; statutText = "text-white"; break;
    case "En Chargement": statutBg = "bg-orange-600"; statutText = "text-white"; break;
    case STATUS_CLOSED: statutBg = "bg-gray-600"; statutText = "text-white"; break;
    default: statutBg = "bg-blue-600"; statutText = "text-white"; break;
  }

  return (
    <Card className={`shadow-lg p-4 bg-white/70 dark:bg-gray-800/70 border backdrop-blur-sm transition-all ${
      mission.statut === "Affectée" 
        ? "border-yellow-500 border-l-4" 
        : "border-gray-200 dark:border-gray-700"
    }`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-1">
            <User size={18} className="text-indigo-600" /> {chauffeur?.name || "N/A"}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1 mt-1">
            <Truck size={14} className="text-blue-600" /> Camion: <b>{camion?.immatriculation || "N/A"}</b>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
            <Calendar size={14} className="text-green-600" /> Date: <b>{mission.date ? new Date(mission.date).toLocaleDateString() : "N/A"}</b>
          </p>

          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md text-gray-800 dark:text-gray-200">
              Fuel: {(mission.frais_fuel || 0).toLocaleString("fr-FR")} FCFA
            </span>
            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md text-gray-800 dark:text-gray-200">
              Mission: {(mission.frais_mission || 0).toLocaleString("fr-FR")} FCFA
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-1">
          <span className={`text-xs font-semibold rounded-full px-2 py-1 text-center whitespace-nowrap ${statutBg} ${statutText}`}>
            {mission.statut}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        {!isClosed ? (
          <>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
              onClick={() => onEdit(mission)}
            >
              <Pencil size={14} /> Modif.
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1"
              onClick={() => onClose(mission.id)}
            >
              <Lock size={14} /> Clôturer
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
              onClick={() => onView(mission)}
            >
              <Eye size={14} /> Détails
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => onDelete(mission.id)}
            >
              <Trash2 size={14} />
            </Button>
          </>
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

  // States de confirmation (Clôture & Suppression)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState(null);

  const [isLoading, setIsLoading] = useState(true);

  const fetchChauffeurs = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id, name").eq("role", "chauffeur").eq("structure", STRUCTURE);
    setChauffeurs(data || []);
  }, []);

  const fetchCamions = useCallback(async () => {
    const { data } = await supabase.from("camions").select("id, immatriculation").eq("structure", STRUCTURE);
    setCamions(data || []);
  }, []);

  const fetchMissions = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from("missions_gts").select("*").eq("structure", STRUCTURE).order("date", { ascending: false });
    setMissions(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchChauffeurs();
    fetchCamions();
    fetchMissions();
  }, [fetchChauffeurs, fetchCamions, fetchMissions]);

  // --- ACTIONS ---
  const handleCloseMission = async (id) => {
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("missions_gts").update({ statut: STATUS_CLOSED, date_cloture: today }).eq("id", id);
    fetchMissions();
  };

  const handleDeleteMission = async (id) => {
    await supabase.from("missions_gts").delete().eq("id", id);
    fetchMissions();
  };

  // --- LOGIQUE DE TRI ET FILTRAGE ---
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

    const statusPriority = { "Affectée": 1, "En Cours": 2, "En Chargement": 3, "Clôturée": 4 };

    const sorted = [...filtered].sort((a, b) => {
      const pA = statusPriority[a.statut] || 99;
      const pB = statusPriority[b.statut] || 99;
      if (pA !== pB) return pA - pB;
      return new Date(b.date) - new Date(a.date);
    });

    const totalPagesCount = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    return { paginatedMissions: paginated, totalPages: totalPagesCount };
  }, [missions, chauffeurs, camions, searchTerm, currentPage]);

  return (
    <div className="flex-1 flex flex-col space-y-6 py-6">
      <Card className="shadow-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <Calendar size={24} className="text-blue-600" /> Gestion des Missions {STRUCTURE}
          </h2>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowModal(true)}>
            + Ouvrir une Mission
          </Button>
        </CardHeader>
      </Card>

      {/* Barre de recherche */}
      <div className="flex gap-3 items-center bg-white/80 dark:bg-gray-800/80 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <input
          type="text"
          placeholder="🔍 Rechercher chauffeur, camion ou date..."
          value={searchTerm}
          onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-1 bg-white dark:bg-gray-700 dark:text-gray-200"
        />
        {isLoading && <Loader2 className="animate-spin text-blue-500" size={24} />}
      </div>

      {/* Grille de missions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedMissions.map((m) => (
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
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              variant={i + 1 === currentPage ? "default" : "outline"}
              onClick={() => setCurrentPage(i + 1)}
              className={i + 1 === currentPage ? "bg-blue-600 text-white" : ""}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}

      {/* Modals & Dialogs */}
      {showModal && <OpenMissionModalGTS setShowModal={setShowModal} fetchMissions={fetchMissions} chauffeurs={chauffeurs} camions={camions} />}
      {editMission && <EditMissionModalGTS editingMission={editMission} setShowModal={setEditMission} fetchMissions={fetchMissions} />}
      {detailsMission && <DetailsMissionModalGTS mission={detailsMission} setShowModal={setDetailsMission} />}

      {/* Dialogue de Clôture */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={setConfirmOpen}
        title="Clôturer cette mission ?"
        description="Cette action marquera la mission comme terminée."
        confirmLabel="Clôturer"
        confirmColor="bg-red-600 hover:bg-red-700"
        onConfirm={async () => { await handleCloseMission(selectedMissionId); setConfirmOpen(false); }}
      />

      {/* Dialogue de Suppression */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={setConfirmDeleteOpen}
        title="Supprimer définitivement ?"
        description="Êtes-vous sûr de vouloir supprimer cette mission de la base de données ? Cette action est irréversible."
        confirmLabel="Supprimer"
        confirmColor="bg-black hover:bg-gray-800"
        onConfirm={async () => { await handleDeleteMission(selectedMissionId); setConfirmDeleteOpen(false); }}
      />
    </div>
  );
}