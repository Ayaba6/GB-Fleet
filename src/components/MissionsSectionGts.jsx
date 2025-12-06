// src/components/MissionsSectionGts.jsx (corrigé)

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Button } from "./ui/button.jsx";
import { Card, CardHeader } from "./ui/card.jsx";
import { Pencil, Lock, Eye, Loader2, User, Truck, Calendar } from "lucide-react";
import OpenMissionModalGTS from "./modals/OpenMissionModalGTS.jsx";
import EditMissionModalGTS from "./modals/EditMissionModalGTS.jsx";
import DetailsMissionModalGTS from "./modals/DetailsMissionModalGTS.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx"; // Utilisation du ConfirmDialog standardisé

const ITEMS_PER_PAGE = 10;
const STRUCTURE = "GTS";
const STATUS_CLOSED = "Clôturée";

/* ---------------------------
    CARD MISSION — HARMONISÉE
--------------------------- */
const CardMissionGTS = ({ mission, chauffeur, camion, onEdit, onClose, onView }) => {
  const isClosed = mission.statut === STATUS_CLOSED;
  
  // Harmonisaton des classes de texte et de la structure de la Card Journee
  return (
    <Card className="shadow-lg p-4 bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
      
      {/* Informations et Statut (Flex pour alignement) */}
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
          
          {/* Frais FCFA - Affichage compact */}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md text-gray-800 dark:text-gray-200">
              Fuel: {(mission.frais_fuel || 0).toLocaleString("fr-FR")} FCFA
            </span>
            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md text-gray-800 dark:text-gray-200">
              Mission: {(mission.frais_mission || 0).toLocaleString("fr-FR")} FCFA
            </span>
          </div>

        </div>

        {/* Badge statut */}
        <div className="flex flex-col gap-2 mt-1">
          <span
            className={`text-xs font-semibold rounded-full px-2 py-1 text-center whitespace-nowrap ${
              isClosed 
                ? "bg-green-600 text-white" 
                : "bg-yellow-600 text-white"
            }`}
          >
            {mission.statut}
          </span>
        </div>
      </div>
      
      {/* ACTIONS - Similaire à BATICOM */}
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
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
            onClick={() => onView(mission)}
          >
            <Eye size={14} /> Détails
          </Button>
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
  const [selectedMissionId, setSelectedMissionId] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  
  // ... (Fetch functions remain unchanged) ...

  const fetchChauffeurs = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, role, structure")
      .eq("role", "chauffeur")
      .eq("structure", STRUCTURE);
    setChauffeurs(data || []);
  }, []);

  const fetchCamions = useCallback(async () => {
    const { data } = await supabase
      .from("camions")
      .select("id, immatriculation, structure, statut")
      .eq("structure", STRUCTURE);
    setCamions(data || []);
  }, []);

  const fetchMissions = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("missions_gts")
      .select("*")
      .eq("structure", STRUCTURE)
      .order("date", { ascending: false });
    setMissions(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchChauffeurs();
    fetchCamions();
    fetchMissions();
  }, [fetchChauffeurs, fetchCamions, fetchMissions]);
  
  // ... (Close mission functions remain unchanged) ...

  const handleCloseMission = async (id) => {
    const today = new Date().toISOString().split("T")[0];
    await supabase
      .from("missions_gts")
      .update({ statut: STATUS_CLOSED, date_cloture: today })
      .eq("id", id);
    fetchMissions();
  };

  const handleConfirmClose = (id) => {
    setSelectedMissionId(id);
    setConfirmOpen(true);
  };

  const confirmClose = async () => {
    await handleCloseMission(selectedMissionId);
    setConfirmOpen(false);
    setSelectedMissionId(null);
  };

  // ... (Filter + Pagination useMemo remains unchanged) ...

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

    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginated = sorted.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );

    return { paginatedMissions: paginated, totalPages };
  }, [missions, chauffeurs, camions, searchTerm, currentPage]);

  return (
    // MODIFICATION CLÉ 1: Suppression des paddings horizontaux px-4 md:px-6. Seul le padding vertical py-6 est gardé.
    <div className="flex-1 flex flex-col space-y-6 py-6 animate-fadeInUp">

      {/* Header */}
      <Card className="shadow-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <Calendar size={24} className="text-blue-600" /> 
            Gestion des Missions {STRUCTURE}
          </h2>

          <Button
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
            onClick={() => setShowModal(true)}
          >
            + Ouvrir une Mission
          </Button>
        </CardHeader>
      </Card>

      {/* Search - Harmonisation des classes */}
      <div className="flex flex-wrap gap-3 items-center justify-start bg-white/80 dark:bg-gray-800/80 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700 backdrop-blur-sm">
        <input
          type="text"
          placeholder="🔍 Rechercher chauffeur, camion ou date..."
          value={searchTerm}
          onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
          className="flex-1 min-w-[200px] border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-200"
        />
        {isLoading && <Loader2 className="animate-spin text-blue-500" size={24} />}
      </div>

      {/* Cards - La grille est déjà harmonisée (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <Card key={i} className="p-4 animate-pulse bg-gray-100 dark:bg-gray-700 h-40 rounded-xl shadow-sm" />
            ))
          : paginatedMissions.length === 0
          ? <p className="col-span-full text-center text-gray-500 dark:text-gray-400">Aucune mission trouvée.</p>
          : paginatedMissions.map((m) => {
              const chauffeur = chauffeurs.find((c) => c.id === m.chauffeur_id);
              const camion = camions.find((c) => c.id === m.camion_id);
              return (
                <CardMissionGTS
                  key={m.id}
                  mission={m}
                  chauffeur={chauffeur}
                  camion={camion}
                  onEdit={setEditMission}
                  onClose={handleConfirmClose}
                  onView={setDetailsMission}
                />
              );
            })}
      </div>

      {/* Pagination - Harmonisation des classes */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              size="sm"
              variant={i + 1 === currentPage ? "default" : "outline"}
              onClick={() => setCurrentPage(i + 1)}
              className={i + 1 === currentPage 
                ? "bg-blue-600 text-white" 
                : ""}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <OpenMissionModalGTS setShowModal={setShowModal} fetchMissions={fetchMissions} chauffeurs={chauffeurs} camions={camions} />
      )}
      {editMission && (
        <EditMissionModalGTS editingMission={editMission} setShowModal={setEditMission} fetchMissions={fetchMissions} />
      )}
      {detailsMission && (
        <DetailsMissionModalGTS mission={detailsMission} setShowModal={setDetailsMission} />
      )}

      {/* Utilisation de ConfirmDialog (si disponible, sinon garder l'implémentation locale) */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={setConfirmOpen}
        title="Clôturer cette mission ?"
        description="Voulez-vous vraiment clôturer cette mission ? Cette action est irréversible."
        confirmLabel="Clôturer"
        confirmColor="bg-red-600 hover:bg-red-700"
        onConfirm={confirmClose}
      />
    </div>
  );
}