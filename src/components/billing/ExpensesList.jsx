import React, { useState } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { 
  Trash2, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  Truck as TruckIcon,
  CreditCard,
  ChevronRight
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function ExpensesList({ expenses, camions, refresh }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStructure, setFilterStructure] = useState("TOUS");

  // Fonction pour supprimer une dépense
  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette dépense ?")) return;

    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Dépense supprimée");
      refresh();
    }
  };

  // Filtrage combiné (Recherche + Structure)
  const filteredExpenses = expenses.filter((exp) => {
    const camion = camions.find((c) => c.id === exp.camion_id);
    const immat = camion?.immatriculation?.toLowerCase() || "";
    const desc = exp.description?.toLowerCase() || "";
    const matchesSearch = immat.includes(searchTerm.toLowerCase()) || desc.includes(searchTerm.toLowerCase());
    const matchesStructure = filterStructure === "TOUS" || exp.structure === filterStructure;
    
    return matchesSearch && matchesStructure;
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 transition-colors">
      
      {/* --- BARRE DE RECHERCHE ET FILTRES --- */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher par camion ou description..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={18} className="text-gray-400" />
          <select
            value={filterStructure}
            onChange={(e) => setFilterStructure(e.target.value)}
            className="flex-1 md:w-40 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200"
          >
            <option value="TOUS">Toutes les structures</option>
            <option value="GTS">GTS</option>
            <option value="BATICOM">BATICOM</option>
          </select>
        </div>
      </div>

      {/* --- TABLEAU --- */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest">
              <th className="px-6 py-4 font-semibold">Date & Structure</th>
              <th className="px-6 py-4 font-semibold">Camion</th>
              <th className="px-6 py-4 font-semibold">Description</th>
              <th className="px-6 py-4 font-semibold text-right">Montant</th>
              <th className="px-6 py-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((exp) => {
                const camion = camions.find((c) => c.id === exp.camion_id);
                return (
                  <tr key={exp.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {new Date(exp.date).toLocaleDateString("fr-FR", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit mt-1 ${
                          exp.structure === 'GTS' 
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                          : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {exp.structure}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 group-hover:bg-white dark:group-hover:bg-gray-600 transition">
                          <TruckIcon size={18} />
                        </div>
                        <span className="font-bold text-gray-700 dark:text-gray-200">
                          {camion?.immatriculation || "Inconnu"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {exp.description}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-lg font-black text-gray-900 dark:text-white">
                        {exp.amount?.toLocaleString()} <small className="text-[10px] ml-0.5">FCFA</small>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <CreditCard size={48} className="opacity-20" />
                    <p>Aucune dépense trouvée</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}