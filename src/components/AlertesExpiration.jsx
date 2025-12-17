import React, { useEffect, useState } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Card, CardHeader } from "./ui/card.jsx";
import { Button } from "./ui/button.jsx";
import { useToast } from "./ui/use-toast.jsx";
import { FileWarning, Calendar, Truck, User, Trash } from "lucide-react";

const getDocBadge = (expiration) => {
  const today = new Date();
  const date = new Date(expiration);
  const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { priority: 1, text: "Expiré", color: "bg-red-600 text-white" };
  if (diff <= 7) return { priority: 2, text: `${diff} j`, color: "bg-red-100 text-red-700" };
  if (diff <= 30) return { priority: 3, text: `${diff} j`, color: "bg-orange-100 text-orange-700" };
  if (diff <= 90) return { priority: 4, text: `${diff} j`, color: "bg-yellow-100 text-yellow-700" };
  return { priority: 5, text: "OK", color: "bg-green-100 text-green-700" };
};

export default function AlertesDocuments() {
  const { toast } = useToast();
  const [docs, setDocs] = useState([]);
  const [hasDocsUrgents, setHasDocsUrgents] = useState(false);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const { data: profiles } = await supabase.from("profiles").select("name, cnib_expiration, permis_expiration, carte_expiration");
        const { data: camions } = await supabase.from("camions").select("immatriculation, cartegriseexpiry, assuranceexpiry, visitetechniqueexpiry");

        const list = [];

        (profiles || []).forEach(p => {
          if (p.cnib_expiration) list.push({ cible: p.name, type: "CNIB", expirationdate: p.cnib_expiration, cibleType: "chauffeur" });
          if (p.permis_expiration) list.push({ cible: p.name, type: "Permis", expirationdate: p.permis_expiration, cibleType: "chauffeur" });
          if (p.carte_expiration) list.push({ cible: p.name, type: "Carte", expirationdate: p.carte_expiration, cibleType: "chauffeur" });
        });

        (camions || []).forEach(c => {
          if (c.cartegriseexpiry) list.push({ cible: c.immatriculation, type: "Carte grise", expirationdate: c.cartegriseexpiry, cibleType: "camion" });
          if (c.assuranceexpiry) list.push({ cible: c.immatriculation, type: "Assurance", expirationdate: c.assuranceexpiry, cibleType: "camion" });
          if (c.visitetechniqueexpiry) list.push({ cible: c.immatriculation, type: "Visite technique", expirationdate: c.visitetechniqueexpiry, cibleType: "camion" });
        });

        // Trier par priorité puis date
        list.sort((a, b) => {
          const badgeA = getDocBadge(a.expirationdate);
          const badgeB = getDocBadge(b.expirationdate);
          return badgeA.priority - badgeB.priority || new Date(a.expirationdate) - new Date(b.expirationdate);
        });

        setDocs(list);
        setHasDocsUrgents(list.some(d => getDocBadge(d.expirationdate).priority <= 2));

      } catch (err) {
        toast({ title: "Erreur", description: err.message, variant: "destructive" });
      }
    };

    fetchDocs();
  }, [toast]);

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

      await supabase
        .from(table)
        .update({ [columnMap[d.type]]: null })
        .eq(table === "profiles" ? "name" : "immatriculation", d.cible);

      setDocs(prev => prev.filter(x => !(x.cible === d.cible && x.type === d.type)));

      toast({ title: "Supprimé", description: "Document supprimé" });
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 bg-gray-50 dark:bg-gray-950 p-4 rounded-xl">
      <Card className={`bg-white dark:bg-gray-900 border dark:border-gray-800 shadow ${hasDocsUrgents ? "animate-pulse border-red-500" : ""}`}>
        <CardHeader>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100">
            <FileWarning className="text-purple-500" /> Alertes Documents
          </h2>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {docs.map(d => {
          const badge = getDocBadge(d.expirationdate);
          const date = new Date(d.expirationdate).toLocaleDateString("fr-FR");

          return (
            <Card key={d.cible + d.type} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    {d.cibleType === "chauffeur" ? <User size={18} /> : <Truck size={18} />}
                    {d.cible}
                  </h3>

                  <p className="text-sm text-gray-600 dark:text-gray-400">{d.type}</p>

                  <p className="text-xs flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    <Calendar size={14} /> {date}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                    {badge.text}
                  </span>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="hover:bg-red-100 dark:hover:bg-red-900"
                    onClick={() => deleteDoc(d)}
                  >
                    <Trash size={16} className="text-red-600 dark:text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
