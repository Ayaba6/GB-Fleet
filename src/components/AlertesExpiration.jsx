import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Card, CardHeader } from "./ui/card.jsx";
import { useToast } from "./ui/use-toast.jsx";
import { FileWarning, Calendar, Truck, User, Trash, ShieldCheck } from "lucide-react";

// Système de badge aligné sur la logique 15 jours
const getDocBadge = (expiration) => {
  const today = new Date();
  const date = new Date(expiration);
  const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { priority: 1, text: "Expiré", color: "bg-red-600 text-white" };
  if (diff <= 15) return { priority: 2, text: `${diff} j`, color: "bg-red-100 text-red-700" };
  if (diff <= 30) return { priority: 3, text: `${diff} j`, color: "bg-orange-100 text-orange-700" };
  return { priority: 4, text: "OK", color: "bg-green-100 text-green-700" };
};

export default function AlertesDocuments({ role, structure }) {
  const { toast } = useToast();
  const [docs, setDocs] = useState([]);
  const [hasDocsUrgents, setHasDocsUrgents] = useState(false);
  const isAdmin = role === "admin";

  const fetchDocs = useCallback(async () => {
    try {
      let profilesQuery = supabase.from("profiles").select("id, full_name, cnib_expiration, permis_expiration, carte_expiration, structure");
      let camionsQuery = supabase.from("camions").select("id, immatriculation, cartegriseexpiry, assuranceexpiry, visitetechniqueexpiry, structure");

      if (!isAdmin && structure) {
        profilesQuery = profilesQuery.eq("structure", structure);
        camionsQuery = camionsQuery.eq("structure", structure);
      }

      const [{ data: profiles }, { data: camions }] = await Promise.all([
        profilesQuery,
        camionsQuery
      ]);

      const today = new Date();
      const list = [];

      // Fonction utilitaire pour vérifier si on doit afficher le doc (<= 15 jours)
      const isUrgent = (dateStr) => {
        if (!dateStr) return false;
        const diff = Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24));
        return diff <= 15; // Logique identique au Dashboard
      };

      (profiles || []).forEach(p => {
        const name = p.full_name || "Sans nom";
        if (isUrgent(p.cnib_expiration)) list.push({ id: p.id, cible: name, type: "CNIB", expirationdate: p.cnib_expiration, cibleType: "chauffeur" });
        if (isUrgent(p.permis_expiration)) list.push({ id: p.id, cible: name, type: "Permis", expirationdate: p.permis_expiration, cibleType: "chauffeur" });
        if (isUrgent(p.carte_expiration)) list.push({ id: p.id, cible: name, type: "Carte", expirationdate: p.carte_expiration, cibleType: "chauffeur" });
      });

      (camions || []).forEach(c => {
        if (isUrgent(c.cartegriseexpiry)) list.push({ id: c.id, cible: c.immatriculation, type: "Carte grise", expirationdate: c.cartegriseexpiry, cibleType: "camion" });
        if (isUrgent(c.assuranceexpiry)) list.push({ id: c.id, cible: c.immatriculation, type: "Assurance", expirationdate: c.assuranceexpiry, cibleType: "camion" });
        if (isUrgent(c.visitetechniqueexpiry)) list.push({ id: c.id, cible: c.immatriculation, type: "Visite technique", expirationdate: c.visitetechniqueexpiry, cibleType: "camion" });
      });

      // Tri par priorité (Expiré d'abord, puis par date la plus proche)
      list.sort((a, b) => {
        const badgeA = getDocBadge(a.expirationdate);
        const badgeB = getDocBadge(b.expirationdate);
        return badgeA.priority - badgeB.priority || new Date(a.expirationdate) - new Date(b.expirationdate);
      });

      setDocs(list);
      setHasDocsUrgents(list.some(d => {
        const diff = Math.ceil((new Date(d.expirationdate) - today) / (1000 * 60 * 60 * 24));
        return diff <= 0; // On fait clignoter si au moins un est déjà expiré
      }));

    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  }, [isAdmin, structure, toast]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const deleteDoc = async (d) => {
    try {
      const table = d.cibleType === "chauffeur" ? "profiles" : "camions";
      const columnMap = {
        CNIB: "cnib_expiration",
        Permis: "permis_expiration",
        Carte: "carte_expiration",
        "Carte grise": "cartegriseexpiry",
        Assurance: "assuranceexpiry",
        "Visite technique": "visitetechniqueexpiry"
      };

      // Utilisation de l'ID pour plus de précision
      await supabase.from(table).update({ [columnMap[d.type]]: null }).eq("id", d.id);
      
      setDocs(prev => prev.filter(x => !(x.id === d.id && x.type === d.type)));
      toast({ title: "Supprimé", description: "L'alerte a été retirée du système." });
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 bg-gray-50 dark:bg-gray-950 p-4 rounded-xl">
      <Card className={`bg-white dark:bg-gray-900 border dark:border-gray-800 shadow ${hasDocsUrgents ? "border-red-500 ring-1 ring-red-500/20" : ""}`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <FileWarning className={hasDocsUrgents ? "text-red-600 animate-pulse" : "text-purple-500"} /> 
              Alertes Documents
            </h2>
            <p className="text-sm text-gray-500">
              Affichage des documents expirés ou arrivant à échéance sous 15 jours.
            </p>
          </div>
          {!isAdmin && (
            <div className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
              <ShieldCheck size={14} /> Structure : {structure}
            </div>
          )}
        </CardHeader>
      </Card>

      {docs.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <ShieldCheck size={48} className="mx-auto text-green-500 mb-3 opacity-20" />
          <p className="text-gray-500 font-medium">Tout est en ordre. Aucune alerte critique (≤ 15j).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {docs.map((d, index) => {
            const badge = getDocBadge(d.expirationdate);
            const dateObj = new Date(d.expirationdate);
            const formattedDate = dateObj.toLocaleDateString("fr-FR");

            return (
              <Card key={`${d.cible}-${d.type}-${index}`} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 overflow-hidden">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 truncate">
                      {d.cibleType === "chauffeur" ? <User size={18} className="text-blue-500 shrink-0" /> : <Truck size={18} className="text-green-500 shrink-0" />}
                      <span className="truncate">{d.cible}</span>
                    </h3>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-200">{d.type}</p>
                    <p className="text-xs flex items-center gap-1 text-gray-500 font-medium">
                      <Calendar size={14} /> {formattedDate}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.color}`}>
                      {badge.text}
                    </span>
                    
                    <button
                      className="p-2 rounded-lg bg-gray-100 hover:bg-red-100 dark:bg-gray-800 dark:hover:bg-red-900/40 transition-all flex items-center justify-center group"
                      onClick={() => {
                        if(window.confirm("Voulez-vous vraiment retirer cette alerte ?")) deleteDoc(d);
                      }}
                      title="Retirer cette date"
                    >
                      <Trash 
                        size={18} 
                        className="text-gray-500 group-hover:text-red-600 transition-colors"
                      />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}