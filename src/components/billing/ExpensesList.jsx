import React, { useState } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { 
  Trash2, Search, Filter, Truck as TruckIcon, 
  Landmark, Receipt, ArrowUpDown
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function ExpensesList({ expenses, camions, refresh }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStructure, setFilterStructure] = useState("TOUS");

  const handleDelete = async (id) => {
    if (!window.confirm("Confirmer la suppression de cette pièce ?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) toast.error("Erreur système");
    else { toast.success("Enregistrement supprimé"); refresh(); }
  };

  const filteredExpenses = expenses.filter((exp) => {
    const camion = camions.find((c) => c.id === exp.camion_id);
    const immat = camion?.immatriculation?.toLowerCase() || "";
    const desc = exp.description?.toLowerCase() || "";
    const matchesSearch = immat.includes(searchTerm.toLowerCase()) || desc.includes(searchTerm.toLowerCase());
    const matchesStructure = filterStructure === "TOUS" || exp.structure === filterStructure;
    return matchesSearch && matchesStructure;
  });

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] transition-all duration-500 font-serif" 
         style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      
      {/* --- HEADER --- */}
      <div className="p-5 border-b border-blue-100 dark:border-slate-800 flex flex-col lg:flex-row gap-4 items-center justify-between bg-white dark:bg-[#1e293b] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-900 dark:bg-amber-600 rounded-lg shadow-inner">
            <Receipt size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 italic">Journal des Écritures</h2>
            <div className="h-0.5 w-12 bg-blue-600 dark:bg-amber-500 mt-1"></div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="relative group flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={14} />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-amber-500/20 transition-all italic text-slate-700 dark:text-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={filterStructure}
            onChange={(e) => setFilterStructure(e.target.value)}
            className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-1.5 rounded-full text-slate-600 dark:text-slate-300 uppercase tracking-tighter cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <option value="TOUS">Toutes Structures</option>
            <option value="GTS">GTS Global</option>
            <option value="BATICOM">Baticom Logistique</option>
          </select>
        </div>
      </div>

      {/* --- TABLEAU --- */}
      <div className="overflow-x-auto px-4 py-2">
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-slate-400 dark:text-slate-500">
              <th className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-left">Date</th>
              <th className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-left">Entité</th>
              <th className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-left">Camion</th>
              <th className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-left">Désignation</th>
              <th className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-right">Montant</th>
              <th className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((exp) => {
              const camion = camions.find((c) => c.id === exp.camion_id);
              const isGts = exp.structure === 'GTS';
              
              return (
                <tr key={exp.id} className="bg-white dark:bg-[#1e293b] hover:shadow-md dark:hover:bg-[#25334a] transition-all group rounded-xl overflow-hidden shadow-sm border border-transparent dark:border-slate-800">
                  <td className="px-4 py-3 text-xs tabular-nums text-slate-500 dark:text-slate-400 border-l-4 border-blue-500 dark:border-amber-600 rounded-l-lg">
                    {exp.date}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded shadow-sm ${
                      isGts 
                      ? 'bg-blue-900 text-white' 
                      : 'bg-emerald-800 text-white'
                    }`}>
                      {exp.structure}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-100 uppercase">
                    {camion?.immatriculation || "---"}
                  </td>
                  <td className="px-4 py-3 text-xs italic text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                    {exp.description}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-black text-base text-blue-900 dark:text-amber-500">
                    {Number(exp.amount).toLocaleString()} <span className="text-[10px] font-normal opacity-60 ml-1">FCFA</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors bg-slate-50 dark:bg-slate-900 rounded-md"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- FOOTER --- */}
      <div className="mt-auto p-6 bg-white dark:bg-[#1e293b] border-t border-blue-50 dark:border-slate-800 flex justify-between items-center shadow-inner">
        <div className="flex gap-2">
           <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
             <div className="w-2 h-2 rounded-full bg-blue-900"></div> GTS
           </div>
           <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 ml-3">
             <div className="w-2 h-2 rounded-full bg-emerald-800"></div> BATICOM
           </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Balance Totale de la Sélection</p>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
             {filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0).toLocaleString()} <small className="text-xs">FCFA</small>
          </p>
        </div>
      </div>
    </div>
  );
}