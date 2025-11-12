// src/components/billing/ExpensesList.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Search, Truck, DollarSign, Calendar, PlusCircle, Edit, Trash2 } from "lucide-react";

export default function ExpensesList({ expenses = [], refresh, onAdd, camions = [] }) {
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState(expenses || []);

  const getCamionImmat = (camionId) => camions.find((c) => c.id === camionId)?.immatriculation || "Générale / N/A";

  useEffect(() => {
    setFiltered(
      (expenses || []).filter((exp) => {
        const immat = getCamionImmat(exp?.camion_id);
        return (
          (exp?.description || "").toLowerCase().includes(search.toLowerCase()) ||
          (immat || "").toLowerCase().includes(search.toLowerCase()) ||
          (exp?.amount || "").toString().includes(search)
        );
      })
    );
  }, [search, expenses, camions]);

  const currencyFormatter = (amount) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", minimumFractionDigits: 0 }).format(Number(amount || 0));

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-1/3 min-w-[250px]">
          <Search className="absolute left-3 top-3 text-gray-400 dark:text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher une dépense..."
            className="w-full pl-10 pr-4 py-2 border rounded-full focus:ring-2 focus:ring-red-400 focus:border-red-400 transition bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-full shadow-md hover:bg-red-700 hover:scale-105 transition w-full md:w-auto justify-center"
        >
          <PlusCircle size={18} /> Nouvelle dépense
        </button>
      </div>

      <div className="overflow-y-auto max-h-[70vh] border border-gray-100 dark:border-gray-700 rounded-lg shadow-inner">
        {(filtered || []).length === 0 ? (
          <div className="text-center p-10 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
            <DollarSign size={40} className="mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">Aucune dépense trouvée pour votre recherche.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-600 dark:text-gray-400 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-left"><Calendar size={14} className="inline-block mr-1" /> Date</th>
                <th className="p-4 text-left">Description</th>
                <th className="p-4 text-left">Camion</th>
                <th className="p-4 text-left">Montant</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((exp) =>
                exp ? (
                  <tr key={exp.id} className="text-sm hover:bg-red-50/50 dark:hover:bg-red-900/30 transition-all">
                    <td className="p-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{new Date(exp.date).toLocaleDateString("fr-FR")}</td>
                    <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{exp.description || "N/A"}</td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700/20 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                        <Truck size={14} className="text-gray-500 dark:text-gray-400" />
                        <span className="font-semibold">{getCamionImmat(exp.camion_id)}</span>
                      </span>
                    </td>
                    <td className="p-4 font-bold text-red-600 dark:text-red-400 whitespace-nowrap">{currencyFormatter(exp.amount)}</td>
                    <td className="p-4 text-center whitespace-nowrap space-x-2">
                      <button
                        onClick={() => console.log("Édition dépense :", exp.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        title="Modifier la dépense"
                      >
                        <Edit size={14} /> Éditer
                      </button>
                      <button
                        onClick={() => console.log("Suppression dépense :", exp.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/30 transition"
                        title="Supprimer la dépense"
                      >
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </td>
                  </tr>
                ) : null
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
