import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { X, DollarSign, Calendar, Truck, Tag, Loader2, Building2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function ExpenseForm({ isOpen, onClose, refresh, defaultStructure = "" }) {
  // On initialise avec la structure par défaut si elle existe (Superviseur)
  const [structure, setStructure] = useState(defaultStructure); 
  const [camions, setCamions] = useState([]);
  const [filteredCamions, setFilteredCamions] = useState([]);
  const [camionId, setCamionId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  // Déterminer si on est en mode "verrouillé" (Superviseur)
  const isLocked = !!defaultStructure;

  // Charger les camions
  useEffect(() => {
    const fetchCamions = async () => {
      // Si on a une structure imposée, on ne récupère que ses camions (plus performant)
      let query = supabase.from("camions").select("*");
      if (isLocked) {
        query = query.eq("structure", defaultStructure);
      }
      
      const { data, error } = await query;
      if (error) {
        toast.error("Erreur camions : " + error.message);
      } else {
        setCamions(data || []);
      }
    };
    if (isOpen) fetchCamions();
  }, [isOpen, defaultStructure, isLocked]);

  // Filtrage local (utile surtout pour l'Admin qui peut changer de structure dans le select)
  useEffect(() => {
    if (structure) {
      setFilteredCamions(camions.filter(c => c.structure === structure));
      // On ne reset le camionId que si la structure change réellement
    } else {
      setFilteredCamions([]);
    }
  }, [structure, camions]);

  // Réinitialisation à l'ouverture/fermeture
  useEffect(() => {
    if (isOpen) {
      setStructure(defaultStructure || "");
      setDate(new Date().toISOString().split('T')[0]); // Date du jour par défaut
    } else {
      setCamionId("");
      setDescription("");
      setAmount("");
    }
  }, [isOpen, defaultStructure]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!structure || !description || !amount || !date || !camionId) {
      toast.error("Champs obligatoires manquants.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("expenses").insert([
      {
        structure,
        camion_id: camionId,
        description: description.trim(),
        amount: Number(amount),
        date,
      },
    ]);

    setLoading(false);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(`Dépense enregistrée avec succès.`);
      refresh();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl w-full max-w-lg relative shadow-2xl border dark:border-gray-800">

        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:rotate-90 transition-all">
          <X size={24} />
        </button>

        <div className="mb-8">
          <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <DollarSign size={24} className="text-red-600" />
            </div>
            Nouvelle dépense
          </h2>
          <p className="text-sm text-gray-500 mt-1">Enregistrez un nouveau décaissement</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Sélection Structure (Désactivé si Superviseur) */}
          <div className="relative">
            <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={structure}
              onChange={(e) => {
                setStructure(e.target.value);
                setCamionId(""); // Reset camion si on change de structure
              }}
              disabled={isLocked}
              className={`w-full pl-10 pr-4 py-3 border rounded-xl appearance-none transition-all ${
                isLocked 
                ? "bg-gray-50 dark:bg-gray-800/50 border-transparent text-gray-500 font-bold" 
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-red-500"
              }`}
              required
            >
              <option value="" disabled>-- Structure --</option>
              <option value="GTS">GTS Logistics</option>
              <option value="BATICOM">BATICOM Sarl</option>
            </select>
          </div>

          {/* Sélection Camion */}
          <div className="relative">
            <Truck size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={camionId}
              onChange={(e) => setCamionId(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 appearance-none transition-all"
              required
            >
              <option value="" disabled>-- Sélectionner un véhicule --</option>
              {filteredCamions.map(c => (
                <option key={c.id} value={c.id}>{c.immatriculation} ({c.type})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Montant */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs underline">FCFA</span>
              <input
                type="number"
                placeholder="Montant"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 font-bold"
                required
              />
            </div>

            {/* Date */}
            <div className="relative">
              <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="relative">
            <Tag size={18} className="absolute left-3 top-3 text-gray-400" />
            <textarea
              placeholder="Détails (ex: Carburant, Réparation pneu...)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 min-h-[100px]"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all">
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-2 px-8 py-3 bg-red-600 text-white rounded-xl shadow-lg shadow-red-200 dark:shadow-none font-bold hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : "Confirmer"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}