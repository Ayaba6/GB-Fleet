import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Button } from "../components/ui/button.jsx";
import { Card, CardHeader } from "../components/ui/card.jsx";
import { Pencil, Lock, Eye, Loader2, Calendar } from "lucide-react";
import OpenDayModalBaticom from "./modals/OpenDayModalBaticom.jsx";
import EditDayModalBaticom from "./modals/EditDayModalBaticom.jsx";
import DetailsJourneeModal from "./modals/DetailsJourneeModal.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";

const ITEMS_PER_PAGE = 5;
const STRUCTURE = "BATICOM";
const STATUS_CLOSED = "clôturée";

// Card Journee
const CardJournee = ({ journee, chauffeur, camion, onEdit, onClose, onView }) => {
  const isClosed = journee.statut === STATUS_CLOSED;
  const isAffected = journee.statut === "affectée";
  const isInProgress = journee.statut === "en cours";

  return (
    <Card className="shadow-lg p-4 bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-1">
            {chauffeur?.name || "N/A"}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Camion: <b>{camion?.immatriculation || "N/A"}</b>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Date: <b>{journee.date ? new Date(journee.date).toLocaleDateString() : "N/A"}</b>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Fuel R/C: {journee.fuel_restant || 0}L / {journee.fuel_complement || 0}L
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Voyages/Tonnage: {journee.voyages || 0} / {journee.tonnage || 0}t
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-2 sm:mt-0">
          <span
            className={`text-xs font-semibold rounded-full p-1 text-center ${
              isClosed
                ? "bg-green-600 text-white"
                : isInProgress
                ? "bg-blue-600 text-white"
                : "bg-yellow-600 text-white"
            }`}
          >
            {journee.statut}
          </span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        {isClosed ? (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
            onClick={() => onView(journee)}
          >
            <Eye size={14} /> Détails
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
              onClick={() => onEdit(journee)}
            >
              <Pencil size={14} /> Modif.
            </Button>

            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1"
              onClick={() => onClose(journee.id)}
            >
              <Lock size={14} /> Clôturer
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};

// Main Section
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
  const [selectedJourneeId, setSelectedJourneeId] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc");
  const [isLoading, setIsLoading] = useState(true);

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
      .select("id, immatriculation, structure, statut, marquemodele")
      .eq("structure", STRUCTURE);
    setCamions(data || []);
  }, []);

  const fetchJournees = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("journee_baticom")
      .select("*")
      .eq("structure", STRUCTURE)
      .order("id", { ascending: false });
    setJournees(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchChauffeurs();
    fetchCamions();
    fetchJournees();
  }, [fetchChauffeurs, fetchCamions, fetchJournees]);

  const handleCloseJournee = async (id) => {
    await supabase
      .from("journee_baticom")
      .update({ statut: STATUS_CLOSED })
      .eq("id", id);
    fetchJournees();
  };

  const handleConfirmClose = (id) => {
    setSelectedJourneeId(id);
    setConfirmOpen(true);
  };

  const confirmClose = async () => {
    await handleCloseJournee(selectedJourneeId);
    setConfirmOpen(false);
    setSelectedJourneeId(null);
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
    const sorted = [...filtered].sort((a, b) =>
      sortOrder === "asc"
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date)
    );
    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginated = sorted.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
    return { paginatedJournees: paginated, totalPages };
  }, [journees, chauffeurs, camions, searchTerm, sortOrder, currentPage]);

  return (
    <div className="p-3 sm:p-6 space-y-6 container animate-fadeInUp">
      {/* Header */}
      <Card className="shadow-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <Calendar size={24} className="text-blue-600" />
            Gestion des Journées BATICOM
          </h2>
          <Button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white">
            + Ouvrir une Journée
          </Button>
        </CardHeader>
      </Card>

      {/* Barre de recherche */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white/80 dark:bg-gray-800/80 p-4 rounded-xl shadow border">
        <input
          type="text"
          placeholder="🔍 Rechercher chauffeur, camion ou date..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="flex-1 min-w-[200px] border px-2 py-1 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
        />
        {isLoading && <Loader2 className="animate-spin text-blue-500" size={24} />}
      </div>

      {/* Liste des cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <Card key={i} className="p-4 animate-pulse bg-gray-200 dark:bg-gray-700 h-40 rounded-xl" />
            ))
          : paginatedJournees.length === 0
          ? <p className="col-span-full text-center text-gray-500">Aucune journée trouvée.</p>
          : paginatedJournees.map((j) => {
              const chauffeur = chauffeurs.find((c) => c.id === j.chauffeur_id);
              const camion = camions.find((c) => c.id === j.camion_id);

              return (
                <CardJournee
                  key={j.id}
                  journee={j}
                  chauffeur={chauffeur}
                  camion={camion}
                  onEdit={setEditJournee}
                  onClose={handleConfirmClose}
                  onView={setDetailsJournee}
                />
              );
            })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              size="sm"
              variant={currentPage === i + 1 ? "default" : "outline"}
              onClick={() => setCurrentPage(i + 1)}
              className={currentPage === i + 1 ? "bg-blue-600 text-white" : ""}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <OpenDayModalBaticom
          setShowModal={setShowModal}
          fetchJournees={fetchJournees}
          chauffeurs={chauffeurs}
          camions={camions}
        />
      )}
      {editJournee && (
        <EditDayModalBaticom
          editingJournee={editJournee}
          setShowModal={setEditJournee}
          fetchJournees={fetchJournees}
        />
      )}
      {detailsJournee && (
        <DetailsJourneeModal
          journee={detailsJournee}
          setShowModal={setDetailsJournee}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={setConfirmOpen}
        title="Clôturer cette journée ?"
        description="Cette action est irréversible."
        confirmLabel="Clôturer"
        confirmColor="bg-red-600 hover:bg-red-700"
        onConfirm={confirmClose}
      />
    </div>
  );
}
