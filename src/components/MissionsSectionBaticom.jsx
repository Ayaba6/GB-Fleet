import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Button } from "../components/ui/button.jsx";
import { Card, CardHeader } from "../components/ui/card.jsx";
import { Pencil, Lock, Eye, Loader2 } from "lucide-react";
import OpenDayModalBaticom from "./modals/OpenDayModalBaticom.jsx";
import EditDayModalBaticom from "./modals/EditDayModalBaticom.jsx";
import DetailsJourneeModal from "./modals/DetailsJourneeModal.jsx";

const ITEMS_PER_PAGE = 5;
const STRUCTURE = "BATICOM";
const STATUS_CLOSED = "clôturée";

const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl text-center max-w-sm">
        <p className="mb-6 text-gray-700 dark:text-gray-200">{message}</p>
        <div className="flex justify-center gap-3">
          <Button onClick={onConfirm} className="bg-green-600 hover:bg-green-700">Oui</Button>
          <Button onClick={onClose} variant="outline">Non</Button>
        </div>
      </div>
    </div>
  );
};

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
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, role, structure")
      .eq("role", "chauffeur")
      .eq("structure", STRUCTURE);
    if (!error) setChauffeurs(data || []);
  }, []);

  const fetchCamions = useCallback(async () => {
    const { data, error } = await supabase
      .from("camions")
      .select("id, immatriculation, structure")
      .eq("structure", STRUCTURE);
    if (!error) setCamions(data || []);
  }, []);

  const fetchJournees = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("journee_chauffeur")
      .select("*")
      .eq("structure", STRUCTURE)
      .order("id", { ascending: false });
    if (!error) setJournees(data || []);
    setIsLoading(false);
  }, []);

  const handleCloseJournee = async (id) => {
    await supabase.from("journee_chauffeur").update({ statut: STATUS_CLOSED }).eq("id", id);
    fetchJournees();
  };

  useEffect(() => {
    fetchChauffeurs();
    fetchCamions();
    fetchJournees();
  }, [fetchChauffeurs, fetchCamions, fetchJournees]);

  const { paginatedJournees, totalPages } = useMemo(() => {
    const filtered = journees.filter((j) => {
      const chauffeur = chauffeurs.find((c) => c.id === j.chauffeur_id);
      const camion = camions.find((c) => c.id === j.camion_id);
      const lower = searchTerm.toLowerCase();
      return (
        chauffeur?.name?.toLowerCase().includes(lower) ||
        camion?.immatriculation?.toLowerCase().includes(lower) ||
        (j.date || "").includes(searchTerm)
      );
    });

    const sorted = [...filtered].sort((a, b) =>
      sortOrder === "asc" ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date)
    );

    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    return { paginatedJournees: paginated, totalPages };
  }, [journees, chauffeurs, camions, searchTerm, sortOrder, currentPage]);

  const renderStatus = (statut) => (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded-full ${
        statut === STATUS_CLOSED
          ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
      }`}
    >
      {statut}
    </span>
  );

  const handleConfirmClose = async () => {
    await handleCloseJournee(selectedJourneeId);
    setConfirmOpen(false);
    setSelectedJourneeId(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <Card className="shadow-xl bg-white/90 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 gap-3">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 sm:mb-0">
            Journées {STRUCTURE}
          </h2>
          <Button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white flex items-center gap-2"
          >
            Ouvrir journée
          </Button>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap gap-3 items-center justify-start bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <input
          type="text"
          placeholder="🔍 Rechercher chauffeur, camion ou date..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-64 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-200"
        />
        {isLoading && <Loader2 className="animate-spin text-blue-500" size={24} />}
      </div>

      <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Chauffeur</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Camion</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Fuel (R/C)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Voy/Ton</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-200">Statut</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-200">Actions</th>
            </tr>
          </thead>

          <tbody className="text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Loader2 className="animate-spin inline mr-2" size={20} /> Chargement des données...
                </td>
              </tr>
            ) : paginatedJournees.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Aucune journée trouvée.
                </td>
              </tr>
            ) : (
              paginatedJournees.map((j) => {
                const chauffeur = chauffeurs.find((c) => c.id === j.chauffeur_id);
                const camion = camions.find((c) => c.id === j.camion_id);
                const isClosed = j.statut === STATUS_CLOSED;
                return (
                  <tr key={j.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/30 transition">
                    <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">{chauffeur?.name || "N/A"}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{j.date ? new Date(j.date).toLocaleDateString() : "N/A"}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{camion?.immatriculation || "N/A"}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{j.fuel_restant || 0} / {j.fuel_complement || 0}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{j.voyages || 0} / {j.tonnage || 0}</td>
                    <td className="px-4 py-2">{renderStatus(j.statut)}</td>
                    <td className="px-4 py-2 flex gap-2 justify-center items-center">
                      {!isClosed ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setEditJournee(j)}>
                            <Pencil size={16} /> Modifier
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { setSelectedJourneeId(j.id); setConfirmOpen(true); }}>
                            <Lock size={16} /> Clôturer
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setDetailsJournee(j)}>
                          <Eye size={16} /> Détails
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              size="sm"
              variant={i + 1 === currentPage ? "default" : "outline"}
              onClick={() => setCurrentPage(i + 1)}
              className={i + 1 === currentPage
                ? "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                : "border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700/50"}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}

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
        <DetailsJourneeModal journee={detailsJournee} setShowModal={setDetailsJournee} />
      )}

      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmClose}
        message="Voulez-vous vraiment clôturer cette journée ?"
      />
    </div>
  );
}
