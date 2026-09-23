import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../config/supabaseClient.js";
import {
  Circle,
  Plus,
  Search,
  AlertTriangle,
  Truck,
  Trash2,
  Edit2,
  Save,
  X
} from "lucide-react";
import { toast } from "react-hot-toast";

const ETATS = [
  {
    value: "neuf",
    label: "Neuf",
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/30"
  },
  {
    value: "bon",
    label: "Bon état",
    color:
      "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300/30"
  },
  {
    value: "usure_moyenne",
    label: "Usure moyenne",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/30"
  },
  {
    value: "critique",
    label: "À remplacer",
    color:
      "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300/30"
  }
];

export default function PneusSection({ role, structure }) {
  const [pneus, setPneus] = useState([]);
  const [camions, setCamions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEtat, setFilterEtat] = useState("tous");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPneu, setEditingPneu] = useState(null);
  const [saving, setSaving] = useState(false);

  // Formulaire
  const [formData, setFormData] = useState({
    numero_serie: "",
    marque: "",
    camion_id: "",
    etat: "neuf"
  });

  // =========================
  // CHARGEMENT DES DONNÉES
  // =========================
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      let pneusQuery = supabase
        .from("pneus")
        .select("*, camions(id, immatriculation)");

      let camionsQuery = supabase
        .from("camions")
        .select("id, immatriculation");

      if (role !== "admin" && structure) {
        pneusQuery = pneusQuery.ilike("structure", structure);
        camionsQuery = camionsQuery.ilike("structure", structure);
      }

      const [pneusRes, camionsRes] = await Promise.all([
        pneusQuery,
        camionsQuery
      ]);

      if (pneusRes.error) throw pneusRes.error;
      if (camionsRes.error) throw camionsRes.error;

      setPneus(pneusRes.data || []);
      setCamions(camionsRes.data || []);
    } catch (err) {
      console.error("Erreur chargement pneus:", err);
      toast.error("Impossible de charger le registre des pneus.");
    } finally {
      setLoading(false);
    }
  }, [role, structure]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // =========================
  // AJOUT
  // =========================
  const handleOpenAddModal = () => {
    setEditingPneu(null);

    setFormData({
      numero_serie: "",
      marque: "",
      camion_id: "",
      etat: "neuf"
    });

    setModalOpen(true);
  };

  // =========================
  // MODIFICATION
  // =========================
  const handleOpenEditModal = (pneu) => {
    setEditingPneu(pneu);

    setFormData({
      numero_serie: pneu.numero_serie || "",
      marque: pneu.marque || "",
      camion_id: pneu.camion_id || "",
      etat: pneu.etat || "neuf"
    });

    setModalOpen(true);
  };

  // =========================
  // ENREGISTREMENT
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.numero_serie.trim()) {
      return toast.error("Le N° de série du pneu est obligatoire.");
    }

    setSaving(true);

    try {
      const payload = {
        numero_serie: formData.numero_serie.trim(),
        marque: formData.marque.trim(),
        etat: formData.etat,
        structure: structure || null,
        camion_id: formData.camion_id ? formData.camion_id : null
      };

      if (editingPneu) {
        const { error } = await supabase
          .from("pneus")
          .update(payload)
          .eq("id", editingPneu.id);

        if (error) throw error;

        toast.success("Informations du pneu mises à jour !");
      } else {
        const { error } = await supabase
          .from("pneus")
          .insert([payload]);

        if (error) throw error;

        toast.success("Nouveau pneu ajouté avec succès !");
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // SUPPRESSION
  // =========================
  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Voulez-vous vraiment retirer ce pneu du registre ?"
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("pneus")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Pneu supprimé.");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Erreur de suppression.");
    }
  };

  // =========================
  // RECHERCHE + FILTRE
  // =========================
  const pneusFiltered = pneus.filter((p) => {
    const query = search.toLowerCase();

    const matchSearch =
      p.numero_serie?.toLowerCase().includes(query) ||
      p.marque?.toLowerCase().includes(query) ||
      p.camions?.immatriculation?.toLowerCase().includes(query);

    const matchEtat =
      filterEtat === "tous" || p.etat === filterEtat;

    return matchSearch && matchEtat;
  });

  const countCritique = pneus.filter(
    (p) => p.etat === "critique"
  ).length;

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 bg-transparent">

      {/* =========================
          EN-TÊTE
      ========================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/85 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Circle className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            Gestion des Pneus & Affectations
          </h2>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Suivi du numéro de série, de la marque, du camion affecté et de l'état
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Ajouter un Pneu
        </button>
      </div>

      {/* =========================
          CARTES RÉSUMÉ
      ========================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
            Total Pneus Suivis
          </p>
          <p className="text-2xl font-extrabold mt-1 text-slate-900 dark:text-white">
            {pneus.length}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase">
            Pneus Montés sur Camions
          </p>
          <p className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-300 mt-1">
            {pneus.filter((p) => p.camion_id).length}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 shadow-sm">
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase">
            Alertes Remplacement
          </p>
          <p className="text-2xl font-extrabold text-rose-800 dark:text-rose-300 mt-1 flex items-center gap-2">
            {countCritique}
            {countCritique > 0 && (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 animate-bounce" />
            )}
          </p>
        </div>
      </div>

      {/* =========================
          RECHERCHE + FILTRE
      ========================== */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher par N° de Série, Marque ou Camion..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>

        <select
          value={filterEtat}
          onChange={(e) => setFilterEtat(e.target.value)}
          className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          <option value="tous">Tous les états</option>
          <option value="neuf">Neufs</option>
          <option value="bon">Bon état</option>
          <option value="usure_moyenne">Usure moyenne</option>
          <option value="critique">À remplacer</option>
        </select>
      </div>

      {/* =========================
          TABLEAU DES PNEUS
      ========================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            Chargement des pneus...
          </div>
        ) : pneusFiltered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            Aucun pneu ne correspond à votre recherche.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm bg-white dark:bg-slate-900">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">N° de Série</th>
                  <th className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">Marque</th>
                  <th className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">Camion Affecté</th>
                  <th className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">État</th>
                  <th className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">
                {pneusFiltered.map((p) => {
                  const etatObj =
                    ETATS.find((e) => e.value === p.etat) || ETATS[1];

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors bg-white dark:bg-slate-900"
                    >
                      {/* N° SÉRIE */}
                      <td className="p-4 font-bold font-mono text-slate-900 dark:text-white bg-transparent">
                        {p.numero_serie}
                      </td>

                      {/* MARQUE */}
                      <td className="p-4 font-semibold text-slate-900 dark:text-white bg-transparent">
                        {p.marque || "—"}
                      </td>

                      {/* CAMION */}
                      <td className="p-4 bg-transparent">
                        {p.camions?.immatriculation ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-xs border border-blue-200 dark:border-blue-900/50">
                            <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            {p.camions.immatriculation}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs">
                            Non affecté (Stock)
                          </span>
                        )}
                      </td>

                      {/* ÉTAT */}
                      <td className="p-4 bg-transparent">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${etatObj.color}`}
                        >
                          {etatObj.label}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="p-4 text-right space-x-1 bg-transparent">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================
          MODAL AJOUT / MODIFICATION
      ========================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold">
                {editingPneu ? "Modifier le Pneu" : "Ajouter un Pneu"}
              </h3>

              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* NUMÉRO DE SÉRIE */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  N° de Série du Pneu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="EX: PN-98432-B"
                  value={formData.numero_serie}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numero_serie: e.target.value
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* MARQUE */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Marque du Pneu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Michelin, Bridgestone..."
                  value={formData.marque}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      marque: e.target.value
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* CAMION */}
              <div>
                <label className="block text-xs font-bold text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Camion Affecté
                </label>
                <select
                  value={formData.camion_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      camion_id: e.target.value
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Non affecté (En stock)</option>
                  {camions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.immatriculation}
                    </option>
                  ))}
                </select>
              </div>

              {/* ÉTAT */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  État du Pneu
                </label>
                <select
                  value={formData.etat}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      etat: e.target.value
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {ETATS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* BOUTONS */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving
                    ? "Enregistrement..."
                    : editingPneu
                    ? "Mettre à jour"
                    : "Ajouter Pneu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}