import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { X, DollarSign, Calendar, Truck, Tag, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function ExpenseForm({ isOpen, onClose, refresh }) {
  const [structure, setStructure] = useState(""); // BATICOM ou GTS
  const [camions, setCamions] = useState([]);
  const [filteredCamions, setFilteredCamions] = useState([]);
  const [camionId, setCamionId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  // Charger tous les camions au début
  useEffect(() => {
    const fetchCamions = async () => {
      const { data, error } = await supabase.from("camions").select("*");
      if (error) {
        toast.error("Erreur lors du chargement des camions : " + error.message);
      } else {
        setCamions(data || []);
      }
    };
    fetchCamions();
  }, []);

  // Filtrer les camions selon la structure choisie
  useEffect(() => {
    if (structure) {
      setFilteredCamions(camions.filter(c => c.structure === structure));
      setCamionId(""); // réinitialiser le camion sélectionné
    } else {
      setFilteredCamions([]);
      setCamionId("");
    }
  }, [structure, camions]);

  // Réinitialisation à l'ouverture/fermeture
  useEffect(() => {
    if (!isOpen) {
      setStructure("");
      setCamionId("");
      setDescription("");
      setAmount("");
      setDate("");
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!structure || !description || !amount || !date || !camionId) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Le montant doit être un nombre positif.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("expenses").insert([
      {
        structure,       // On enregistre la structure
        camion_id: camionId,
        description,
        amount: Number(amount),
        date,
      },
    ]);

    setLoading(false);

    if (error) {
      toast.error("Erreur lors de l'enregistrement : " + error.message);
    } else {
      const camionImmat = camions.find(c => c.id === camionId)?.immatriculation || "un camion";
      toast.success(`Dépense de ${Number(amount).toLocaleString()} FCFA pour ${camionImmat} enregistrée.`);
      refresh();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl w-full max-w-lg relative shadow-2xl transform transition-transform duration-300 scale-100">

        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 transition">
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-6 border-b pb-3 border-gray-200 dark:border-gray-700">
          <DollarSign size={28} className="text-red-600" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Nouvelle dépense</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Structure */}
          <div className="relative">
            <select
              value={structure}
              onChange={(e) => setStructure(e.target.value)}
              className="w-full pl-4 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg focus:ring-red-500 focus:border-red-500 transition"
              required
            >
              <option value="" disabled>-- Choisir la structure --</option>
              <option value="GTS">GTS</option>
              <option value="BATICOM">BATICOM</option>
            </select>
          </div>

          {/* Camion filtré */}
          <div className="relative">
            <Truck size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={camionId}
              onChange={(e) => setCamionId(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg focus:ring-red-500 focus:border-red-500 transition appearance-none"
              required
            >
              <option value="" disabled>-- Sélectionner un camion --</option>
              {filteredCamions.map(c => (
                <option key={c.id} value={c.id}>{c.immatriculation}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="relative">
            <Tag size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Description de la dépense"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg focus:ring-red-500 focus:border-red-500 transition"
              required
            />
          </div>

          {/* Montant */}
          <div className="relative">
            <DollarSign size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              placeholder="Montant (FCFA)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg focus:ring-red-500 focus:border-red-500 transition"
              min="1"
              required
            />
          </div>

          {/* Date */}
          <div className="relative">
            <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg focus:ring-red-500 focus:border-red-500 transition"
              required
            />
          </div>

          {/* Boutons */}
          <div className="flex justify-end pt-2 space-x-3">
            <button type="button" onClick={onClose} className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Enregistrement...</> : "Enregistrer la dépense"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
