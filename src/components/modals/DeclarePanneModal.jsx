// src/components/modals/DeclarePanneModal.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Card } from "../ui/card.jsx";
import { Button } from "../ui/button.jsx";
import { Input } from "../ui/input.jsx";
import { useToast } from "../ui/use-toast.jsx";
import { X } from "lucide-react";

export default function DeclarePanneModal({ open, onClose, chauffeurId, missionId, structure }) {
  const { toast } = useToast();

  const [type, setType] = useState("mécanique");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
        },
        (err) => console.warn("Impossible de récupérer la position :", err.message)
      );
    }
  }, [open]);

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) setPhoto(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({ title: "Erreur", description: "La description est obligatoire.", variant: "destructive" });
      return;
    }
    setLoading(true);

    let photoPath = null;
    if (photo) {
      const fileExt = photo.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("pannes")
        .upload(fileName, photo);
      if (uploadError) {
        toast({ title: "Erreur", description: uploadError.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      photoPath = fileName;
    }

    const { error } = await supabase.from("alertespannes").insert({
      chauffeur_id: chauffeurId,
      mission_id: missionId,
      structure,
      typepanne: type,
      description,
      photo: photoPath,
      latitude,
      longitude,
      statut: "en_cours",
      created_at: new Date()
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Panne déclarée !" });
      setType("mécanique");
      setDescription("");
      setPhoto(null);
      setLatitude(null);
      setLongitude(null);
      onClose();
    }

    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 bg-white dark:bg-gray-800 relative shadow-xl rounded-lg">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Déclarer une panne</h2>

        <div className="space-y-3">
          <label className="block text-gray-700 dark:text-gray-200">
            Type de panne
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full mt-1 border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
            >
              <option value="mécanique">Mécanique</option>
              <option value="électrique">Électrique</option>
              <option value="crevaison">Crevaison</option>
              <option value="accident">Accident</option>
              <option value="autres">Autres</option>
            </select>
          </label>

          <label className="block text-gray-700 dark:text-gray-200">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrire la panne..."
              className="w-full mt-1 border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              rows={4}
            />
          </label>

          <label className="block text-gray-700 dark:text-gray-200">
            Photo (optionnelle)
            <Input type="file" accept="image/*" onChange={handlePhotoChange} className="mt-1" />
          </label>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Coordonnées GPS:{" "}
            {latitude && longitude ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : "Non disponible"}
          </p>

          <Button onClick={handleSubmit} className="w-full mt-2" disabled={loading}>
            {loading ? "Déclaration en cours..." : "Déclarer la panne"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
