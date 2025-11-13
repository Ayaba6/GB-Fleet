import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../ui/button.jsx";
import { useToast } from "../ui/use-toast.jsx";

export default function CamionModal({ editingCamion = null, setShowModal, fetchCamions }) {
  const { toast } = useToast();

  const [form, setForm] = useState({
    immatriculation: editingCamion?.immatriculation || "",
    marquemodele: editingCamion?.marquemodele || "",
    type: editingCamion?.type || "",
    statut: editingCamion?.statut || "Disponible",
    structure: editingCamion?.structure || "",
    photourl: editingCamion?.photourl || "",
    cartegriseurl: editingCamion?.cartegriseurl || "",
    cartegriseexpiry: editingCamion?.cartegriseexpiry || "",
    assuranceurl: editingCamion?.assuranceurl || "",
    assuranceexpiry: editingCamion?.assuranceexpiry || "",
    visitetechniqueurl: editingCamion?.visitetechniqueurl || "",
    visitetechniqueexpiry: editingCamion?.visitetechniqueexpiry || "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files?.length) {
      uploadFile(name, files[0]);
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const uploadFile = async (field, file) => {
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${field}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("uploads").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      setForm((f) => ({ ...f, [field]: publicUrl }));
      toast({ title: "✅ Fichier ajouté", description: `${file.name} téléchargé.` });
    } catch (err) {
      toast({ title: "⚠️ Erreur d’upload", description: err.message, variant: "destructive" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!form.immatriculation || !form.marquemodele || !form.type || !form.structure) {
      toast({ title: "Champs manquants", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const payload = { ...form };

    try {
      if (editingCamion) {
        const { error } = await supabase.from("camions").update(payload).eq("id", editingCamion.id);
        if (error) throw error;
        toast({ title: "✅ Camion mis à jour" });
      } else {
        const { error } = await supabase.from("camions").insert([payload]);
        if (error) throw error;
        toast({ title: "✅ Camion ajouté" });
      }

      fetchCamions?.();
      setShowModal(false);
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-0">
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-xl w-full max-w-lg h-[90vh] sm:h-auto overflow-y-auto animate-in fade-in zoom-in">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 text-center">
          {editingCamion ? "Modifier le Camion" : "Créer un Camion"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Champs principaux */}
          <input name="immatriculation" placeholder="Immatriculation *" value={form.immatriculation} onChange={handleChange} className="border border-gray-300 dark:border-gray-600 p-3 w-full rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200" required />
          <input name="marquemodele" placeholder="Marque / Modèle *" value={form.marquemodele} onChange={handleChange} className="border border-gray-300 dark:border-gray-600 p-3 w-full rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200" required />

          <select name="type" value={form.type} onChange={handleChange} className="border border-gray-300 dark:border-gray-600 p-3 w-full rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200" required>
            <option value="">-- Sélectionner le type --</option>
            <option value="Benne">Benne</option>
            <option value="Tracteur">Tracteur</option>
            <option value="Semi-remorque">Semi-remorque</option>
            <option value="Remorque">Remorque</option>
          </select>

          <select name="statut" value={form.statut} onChange={handleChange} className="border border-gray-300 dark:border-gray-600 p-3 w-full rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
            <option value="Disponible">Disponible</option>
            <option value="En maintenance">En maintenance</option>
            <option value="Indisponible">Indisponible</option>
          </select>

          <select name="structure" value={form.structure} onChange={handleChange} className="border border-gray-300 dark:border-gray-600 p-3 w-full rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200" required>
            <option value="">-- Affecter à --</option>
            <option value="GTS">GTS</option>
            <option value="BATICOM">BATICOM</option>
          </select>

          {/* Upload photo et documents */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              { field: "photourl", label: "Photo" },
              { field: "cartegriseurl", label: "Carte Grise", exp: "cartegriseexpiry" },
              { field: "assuranceurl", label: "Assurance", exp: "assuranceexpiry" },
              { field: "visitetechniqueurl", label: "Visite Technique", exp: "visitetechniqueexpiry" },
            ].map(({ field, label, exp }) => (
              <div key={field}>
                <label className="text-sm text-gray-700 dark:text-gray-200 block mb-1">{label} :</label>
                <input type="file" name={field} onChange={handleChange} className="w-full" />
                {form[field] && (
                  <a href={form[field]} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 text-xs mt-1 block">
                    Voir fichier
                  </a>
                )}
                {exp && (
                  <input type="date" name={exp} value={form[exp] || ""} onChange={handleChange} className="border border-gray-300 dark:border-gray-600 p-2 w-full rounded mt-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200" />
                )}
              </div>
            ))}
          </div>

          {/* Footer boutons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 sticky bottom-0 bg-white dark:bg-gray-800 pb-2">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)} className="border-gray-400 w-full sm:w-auto">Annuler</Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto">{loading ? "Enregistrement..." : editingCamion ? "Mettre à jour" : "Créer"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
