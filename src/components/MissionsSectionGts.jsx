import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Button } from "./ui/button.jsx";
import { Card, CardHeader } from "./ui/card.jsx";
import { Pencil, Lock, Eye, Loader2, User, Truck, Calendar, DollarSign } from "lucide-react";
import OpenMissionModalGTS from "./modals/OpenMissionModalGTS.jsx";
import EditMissionModalGTS from "./modals/EditMissionModalGTS.jsx";
import DetailsMissionModalGTS from "./modals/DetailsMissionModalGTS.jsx";

const ITEMS_PER_PAGE = 5;
const STRUCTURE = "GTS";
const STATUS_CLOSED = "Clôturée";

// Card pour chaque mission
const CardMissionGTS = ({ mission, chauffeur, camion, onEdit, onClose, onView }) => {
  const isClosed = mission.statut === STATUS_CLOSED;

  return (
    <Card className="relative shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 rounded-2xl hover:shadow-2xl transition-shadow duration-300">
      {/* Badge statut */}
      <span
        className={`absolute top-4 right-4 px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${
          isClosed
            ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
        }`}
      >
        {mission.statut}
      </span>

      <div className="flex flex-col gap-3">
        {/* Chauffeur */}
        <div className="flex items-center gap-2">
          <User className="text-indigo-500 w-5 h-5" />
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{chauffeur?.name || "N/A"}</p>
        </div>

        {/* Camion */}
        <div className="flex items-center gap-2">
          <Truck className="text-blue-500 w-5 h-5" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">{camion?.immatriculation || "N/A"}</p>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2">
          <Calendar className="text-green-500 w-5 h-5" />
          <p className="text-gray-700 dark:text-gray-300">{mission.date ? new Date(mission.date).toLocaleDateString() : "N/A"}</p>
        </div>

        {/* Frais */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md text-sm">
            <DollarSign className="w-4 h-4 text-green-500" /> {mission.frais_fuel || 0} DH Fuel
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md text-sm">
            <DollarSign className="w-4 h-4 text-red-500" /> {mission.frais_mission || 0} DH Mission
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {!isClosed ? (
            <>
              <Button
                size="sm"
                className="flex items-center gap-2 px-3 py-1 border border-gray-500 text-gray-700 dark:border-gray-400 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                onClick={() => onEdit(mission)}
              >
                <Pencil size={16}/> Modifier
              </Button>
              <Button
                size="sm"
                className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:text-white dark:hover:bg-red-600 transition"
                onClick={() => onClose(mission.id)}
              >
                <Lock size={16}/> Clôturer
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="flex items-center gap-2 px-3 py-1 border border-gray-500 text-gray-700 dark:border-gray-400 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              onClick={() => onView(mission)}
            >
              <Eye size={16}/> Détails
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

// Modal de confirmation
const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl text-center max-w-sm">
        <p className="mb-6 text-gray-700 dark:text-gray-200">{message}</p>
        <div className="flex justify-center gap-3">
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={onConfirm}>Oui</Button>
          <Button variant="outline" onClick={onClose}>Non</Button>
        </div>
      </div>
    </div>
  );
};

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
  const [sortOrder, setSortOrder] = useState("desc");
  const [isLoading, setIsLoading] = useState(true);

  const fetchChauffeurs = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id, name, role, structure")
      .eq("role", "chauffeur").eq("structure", STRUCTURE);
    setChauffeurs(data || []);
  }, []);

  const fetchCamions = useCallback(async () => {
    const { data } = await supabase.from("camions").select("id, immatriculation, structure, statut")
      .eq("structure", STRUCTURE);
    setCamions(data || []);
  }, []);

  const fetchMissions = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from("missions_gts").select("*")
      .eq("structure", STRUCTURE)
      .order("date", { ascending: false });
    setMissions(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchChauffeurs(); fetchCamions(); fetchMissions(); }, [fetchChauffeurs, fetchCamions, fetchMissions]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const handleCloseMission = async (id) => {
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("missions_gts").update({ statut: STATUS_CLOSED, date_cloture: today }).eq("id", id);
    fetchMissions();
  };

  const handleConfirmClose = (id) => { setSelectedMissionId(id); setConfirmOpen(true); };
  const confirmClose = async () => { await handleCloseMission(selectedMissionId); setConfirmOpen(false); setSelectedMissionId(null); };

  const { paginatedMissions, totalPages } = useMemo(() => {
    const filtered = missions.filter((m) => {
      const chauffeur = chauffeurs.find(c => c.id === m.chauffeur_id);
      const camion = camions.find(c => c.id === m.camion_id);
      const lower = searchTerm.toLowerCase();
      return chauffeur?.name?.toLowerCase().includes(lower)
        || camion?.immatriculation?.toLowerCase().includes(lower)
        || (m.date || "").includes(lower);
    });
    const sorted = [...filtered].sort((a,b) => sortOrder === "asc" ? new Date(a.date)-new Date(b.date) : new Date(b.date)-new Date(a.date));
    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginated = sorted.slice((currentPage-1)*ITEMS_PER_PAGE, currentPage*ITEMS_PER_PAGE);
    return { paginatedMissions: paginated, totalPages };
  }, [missions, chauffeurs, camions, searchTerm, sortOrder, currentPage]);

  return (
    <div className="flex-1 flex flex-col space-y-6 px-4 md:px-6 py-6 animate-fadeInUp">
      {/* Header */}
      <Card className="shadow-xl bg-white/90 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 gap-3">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 sm:mb-0">Missions {STRUCTURE}</h2>
          <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white flex items-center gap-2" onClick={() => setShowModal(true)}>
            Ouvrir mission
          </Button>
        </CardHeader>
      </Card>

      {/* Search */}
      <div className="flex flex-wrap gap-3 items-center justify-start bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <input
          type="text"
          placeholder="🔍 Rechercher chauffeur, camion ou date..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full sm:w-64 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isLoading && <Loader2 className="animate-spin text-blue-500" size={24} />}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? Array.from({ length: ITEMS_PER_PAGE }).map((_,i) => (
          <Card key={i} className="p-4 animate-pulse bg-gray-100 dark:bg-gray-700 h-40 rounded-xl shadow-sm" />
        )) : paginatedMissions.length === 0 ? (
          <p className="col-span-full text-center text-gray-500 dark:text-gray-400">Aucune mission trouvée.</p>
        ) : paginatedMissions.map(m => {
          const chauffeur = chauffeurs.find(c => c.id === m.chauffeur_id);
          const camion = camions.find(c => c.id === m.camion_id);
          return <CardMissionGTS key={m.id} mission={m} chauffeur={chauffeur} camion={camion} onEdit={setEditMission} onClose={handleConfirmClose} onView={setDetailsMission} />;
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              size="sm"
              variant={i+1===currentPage?"default":"outline"}
              onClick={()=>setCurrentPage(i+1)}
              className={i+1===currentPage?"bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600":""}
            >
              {i+1}
            </Button>
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && <OpenMissionModalGTS setShowModal={setShowModal} fetchMissions={fetchMissions} chauffeurs={chauffeurs} camions={camions} />}
      {editMission && <EditMissionModalGTS editingMission={editMission} setShowModal={setEditMission} fetchMissions={fetchMissions} />}
      {detailsMission && <DetailsMissionModalGTS mission={detailsMission} setShowModal={setDetailsMission} />}
      <ConfirmationModal isOpen={confirmOpen} onClose={()=>setConfirmOpen(false)} onConfirm={confirmClose} message="Voulez-vous vraiment clôturer cette mission ?" />
    </div>
  );
}
