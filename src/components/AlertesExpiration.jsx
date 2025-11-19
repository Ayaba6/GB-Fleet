// src/components/AlertesExpirationCardsStyled.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Card, CardHeader, CardContent } from "./ui/card.jsx";
import { Button } from "./ui/button.jsx";
import { useToast } from "./ui/use-toast.jsx";
import { Clock, AlertTriangle, CheckCircle, Calendar, User, Truck } from "lucide-react";

const getBadge = (expiration) => {
  const today = new Date();
  const date = new Date(expiration);
  const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: "Expiré", color: "bg-red-600 text-white dark:bg-red-700 dark:text-white", icon: <CheckCircle size={16}/> };
  if (diff <= 7) return { text: `${diff} j. restants`, color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200", icon: <AlertTriangle size={16}/> };
  if (diff <= 30) return { text: `${diff} j. restants`, color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200", icon: <AlertTriangle size={16}/> };
  if (diff <= 90) return { text: `${diff} j. restants`, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200", icon: <Clock size={16}/> };
  return { text: "Long terme", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200", icon: <CheckCircle size={16}/> };
};

export default function AlertesExpirationCardsStyled() {
  const { toast } = useToast();
  const [alertes, setAlertes] = useState([]);
  const [filter, setFilter] = useState("toutes");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: profilesData } = await supabase.from("profiles").select("*");
        const { data: camionsData } = await supabase.from("camions").select("*");

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

  const filteredAlertes = alertes.filter(a => {
    const matchFilter = filter === "toutes" ? true : (filter === "chauffeur" ? a.cibleType === "chauffeur" : a.cibleType === "camion");
    const matchSearch = a.cible.toLowerCase().includes(searchTerm.toLowerCase()) || a.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPages = Math.ceil(filteredAlertes.length / ITEMS_PER_PAGE);
  const paginatedAlertes = filteredAlertes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="p-3 sm:p-6 space-y-6 container">
      {/* Header */}
      <Card className="shadow-lg bg-white/90 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <Clock size={24} className="text-yellow-600 dark:text-yellow-400" /> Alertes Expirations
          </h2>
        </CardHeader>
      </Card>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <input
          type="text"
          placeholder="🔍 Rechercher..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="flex-1 min-w-[150px] border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-200"
        />
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
          className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
        >
          <option value="toutes">Toutes</option>
          <option value="chauffeur">Chauffeurs</option>
          <option value="camion">Camions</option>
        </select>
      </div>

      {/* Liste sous forme de cartes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedAlertes.length === 0 ? (
          <p className="text-center col-span-full text-gray-500 dark:text-gray-400">Aucune alerte trouvée</p>
        ) : (
          paginatedAlertes.map((a) => {
            const badge = getBadge(a.expirationdate);
            const dateDisplay = new Date(a.expirationdate).toLocaleDateString("fr-FR", { year: 'numeric', month: 'short', day: 'numeric' });
            return (
              <Card key={a.cible + a.type} className="shadow-lg p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                      {a.cibleType === "chauffeur" ? <User size={18} /> : <Truck size={18} />} {a.cible}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Type: {a.type}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-1">
                      <Calendar size={14} /> {dateDisplay}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${badge.color}`}>
                    {badge.icon}{badge.text}
                  </span>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              size="sm"
              variant={i + 1 === currentPage ? "default" : "outline"}
              onClick={() => setCurrentPage(i + 1)}
              className={i + 1 === currentPage ? "bg-yellow-600 text-white dark:bg-yellow-500" : ""}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
