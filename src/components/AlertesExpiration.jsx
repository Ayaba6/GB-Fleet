// src/components/AlertesExpiration.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Card, CardHeader } from "./ui/card.jsx";
import { Button } from "./ui/button.jsx";
import { useToast } from "./ui/use-toast.jsx";
import { Clock, AlertTriangle, CheckCircle, Calendar, User, Truck, Search } from "lucide-react";

export default function AlertesExpiration() {
  const { toast } = useToast();

  const [alertes, setAlertes] = useState([]);
  const [chauffeurs, setChauffeurs] = useState({});
  const [camions, setCamions] = useState({});
  const [filter, setFilter] = useState("toutes");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // 🔄 Charger les données
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: profilesData } = await supabase.from("profiles").select("*");
        const { data: camionsData } = await supabase.from("camions").select("*");

        const chauffeursMap = {};
        profilesData.forEach(c => {
          chauffeursMap[c.id] = {
            name: c.name || c.email || "Chauffeur inconnu",
            cnib_expiration: c.cnib_expiration,
            permis_expiration: c.permis_expiration,
            carte_expiration: c.carte_expiration
          };
        });

        const camionsMap = {};
        camionsData.forEach(c => {
          camionsMap[c.id] = {
            immatriculation: c.immatriculation || "Camion inconnu",
            cartegriseexpiry: c.cartegriseexpiry,
            assuranceexpiry: c.assuranceexpiry,
            visitetechniqueexpiry: c.visitetechniqueexpiry
          };
        });

        setChauffeurs(chauffeursMap);
        setCamions(camionsMap);

        // Construire la liste des alertes
        const alertesList = [];

        profilesData.forEach(c => {
          if (c.cnib_expiration) alertesList.push({ cible: c.name, type: "CNIB", expirationdate: c.cnib_expiration, cibleType: "chauffeur" });
          if (c.permis_expiration) alertesList.push({ cible: c.name, type: "Permis", expirationdate: c.permis_expiration, cibleType: "chauffeur" });
          if (c.carte_expiration) alertesList.push({ cible: c.name, type: "Carte", expirationdate: c.carte_expiration, cibleType: "chauffeur" });
        });

        camionsData.forEach(c => {
          if (c.cartegriseexpiry) alertesList.push({ cible: c.immatriculation, type: "Carte grise", expirationdate: c.cartegriseexpiry, cibleType: "camion" });
          if (c.assuranceexpiry) alertesList.push({ cible: c.immatriculation, type: "Assurance", expirationdate: c.assuranceexpiry, cibleType: "camion" });
          if (c.visitetechniqueexpiry) alertesList.push({ cible: c.immatriculation, type: "Visite technique", expirationdate: c.visitetechniqueexpiry, cibleType: "camion" });
        });

        alertesList.sort((a, b) => new Date(a.expirationdate) - new Date(b.expirationdate));
        setAlertes(alertesList);
      } catch (err) {
        toast({ title: "Erreur", description: err.message, variant: "destructive" });
      }
    };

    fetchData();
  }, [toast]);

  // 🔖 Badge dynamique
  const getBadge = (expiration) => {
    const today = new Date();
    const date = new Date(expiration);
    const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: "Expiré", color: "bg-red-600 text-white", icon: <CheckCircle size={16}/> };
    if (diff <= 7) return { text: `${diff} j. restants`, color: "bg-red-100 text-red-700", icon: <AlertTriangle size={16}/> };
    if (diff <= 30) return { text: `${diff} j. restants`, color: "bg-orange-100 text-orange-700", icon: <AlertTriangle size={16}/> };
    if (diff <= 90) return { text: `${diff} j. restants`, color: "bg-yellow-100 text-yellow-700", icon: <Clock size={16}/> };
    return { text: "Long terme", color: "bg-green-100 text-green-700", icon: <CheckCircle size={16}/> };
  };

  // 🔍 Filtrage et recherche
  const filteredAlertes = alertes.filter(a => {
    const matchFilter = filter === "toutes" ? true : (a.cibleType === "chauffeur" ? ["CNIB","Permis","Carte"].includes(a.type) : ["Carte grise","Assurance","Visite technique"].includes(a.type));
    const matchSearch = a.cible.toLowerCase().includes(searchTerm.toLowerCase()) || a.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPages = Math.ceil(filteredAlertes.length / ITEMS_PER_PAGE);
  const paginatedAlertes = filteredAlertes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-6">
      <div className="w-full px-4 md:px-6 lg:px-8 space-y-6 mx-auto max-w-[1440px]">

        {/* Header */}
        <Card className="shadow-xl bg-white/90 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="flex justify-between items-center p-4 sm:p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              <Clock size={24} className="text-yellow-600"/> Alertes Expirations
            </h2>
          </CardHeader>
        </Card>

        {/* Filtre + recherche */}
        <div className="flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="🔍 Rechercher..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-64 border-gray-300 dark:border-gray-600 rounded px-2 py-1"
            />
            <select
              value={filter}
              onChange={e => { setFilter(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-48 border rounded px-2 py-1 dark:border-gray-600"
            >
              <option value="toutes">Toutes les alertes</option>
              <option value="chauffeur">Chauffeurs</option>
              <option value="camion">Camions</option>
            </select>
          </div>
        </div>

        {/* Tableau responsive */}
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-700 p-4 md:p-6 w-full overflow-x-auto">
          <div className="min-w-[900px] w-full">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-100">Cible</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-100">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-100">Date d'expiration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-100">Statut</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {paginatedAlertes.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-300">Aucune alerte trouvée</td></tr>
                ) : paginatedAlertes.map((a, i) => {
                  const badge = getBadge(a.expirationdate);
                  const dateDisplay = new Date(a.expirationdate).toLocaleDateString("fr-FR", { year: 'numeric', month: 'short', day: 'numeric' });
                  return (
                    <tr key={i} className="hover:bg-yellow-50/50 dark:hover:bg-yellow-900/30 transition">
                      <td className="px-4 py-2 font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-1">
                        {a.cibleType === "chauffeur" ? <User size={16}/> : <Truck size={16}/>} {a.cible}
                      </td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-200">{a.type}</td>
                      <td className="px-4 py-2 flex items-center gap-1 text-gray-700 dark:text-gray-200"><Calendar size={14}/> {dateDisplay}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
                          {badge.icon}{badge.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 flex-wrap">
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i}
                size="sm"
                variant={i + 1 === currentPage ? "default" : "outline"}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
