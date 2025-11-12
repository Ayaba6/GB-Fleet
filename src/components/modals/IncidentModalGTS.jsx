// src/components/modals/IncidentModalGTS.jsx
import React, { useState } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../ui/button.jsx";
import { useToast } from "../ui/use-toast.jsx";
import { X, AlertTriangle } from "lucide-react";

export default function IncidentModalGTS({ missionId, setShowModal, fetchMissions }) {
  const { toast } = useToast();
  const [typeIncident, setTypeIncident] = useState(""); // type ou description courte
  const [description, setDescription] = useState(""); // détails
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!typeIncident || !description) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("incidents_gts").insert([
      {
        mission_id: missionId,
        type: typeIncident,
        description,
        date: new Date().toISOString(),
      },
    ]);

    setLoading(false);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Incident enregistré !" });
      fetchMissions();
      setShowModal(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={() => setShowModal(false)}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-2xl font-extrabold text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" /> Déclarer un incident
          </h2>
          <Button variant="ghost" onClick={() => setShowModal(false)}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-gray-700">Type d'incident</label>
            <input
              type="text"
              className="w-full border rounded-lg p-2"
              value={typeIncident}
              onChange={(e) => setTypeIncident(e.target.value)}
              placeholder="Ex : Panne moteur, Accident..."
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-gray-700">Description</label>
            <textarea
              rows={4}
              className="w-full border rounded-lg p-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez les détails de l'incident..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setShowModal(false)}>
            Annuler
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
