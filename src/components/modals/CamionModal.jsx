import React, { useState } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Loader2, Upload, Camera, FileText, Trash2 } from "lucide-react"; // Ajout de Trash2
import { Button } from "../ui/button.jsx";
import { useToast } from "../ui/use-toast.jsx";
import Modal from "../ui/modal.jsx";

const BASE_INPUT_STYLE = `
  w-full p-2.5 rounded-lg border
  border-gray-300 dark:border-gray-600
  bg-gray-50 dark:bg-gray-700
  text-gray-900 dark:text-gray-100
  focus:ring-blue-500 focus:border-blue-500
  transition-all duration-200
`;

const FileUploadField = ({ field, label, expField, form, handleChange, handleClearFile, loading, icon }) => {
  const fileUploaded = form[field] && form[field].startsWith("http");
  return (
    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 transition-colors">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
        {icon} {label}
      </label>
      <div className="flex flex-col gap-2">
        <input type="file" id={`file-${field}`} name={field} onChange={handleChange} disabled={loading} className="hidden"/>
        <label htmlFor={`file-${field}`} className={`
          w-full flex items-center justify-center p-2 rounded-lg cursor-pointer transition-colors
          text-sm font-semibold
          ${fileUploaded
            ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800"
            : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
          }
        `}>
          <Upload size={16} className="mr-2"/>
          {fileUploaded ? `Fichier chargé (${label})` : `Charger un fichier ${label}`}
        </label>

        {fileUploaded && (
          <div className="flex items-center justify-between mt-1">
            <a href={form[field]} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 text-xs hover:underline truncate transition-colors flex-1">
              Voir le document actuel
            </a>
            {/* NOUVEAU: Bouton/Icône de Suppression */}
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => handleClearFile(field, expField)} 
              className="text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 p-1 h-auto"
              title={`Supprimer le fichier ${label}`}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}

        {expField && (
          <div className="mt-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">Date d'Expiration :</label>
            <input type="date" name={expField} value={form[expField] || ''} onChange={handleChange} className={BASE_INPUT_STYLE}/>
          </div>
        )}

      </div>
    </div>
  );
};

export default function CamionModal({ editingCamion = null, setShowModal, fetchCamions }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleChange = async (e) => {
    const { name, value, files } = e.target;
    if (files?.length) await uploadFile(name, files[0]);
    else setForm(f => ({ ...f, [name]: value }));
  };

  const handleClearFile = (field, expField) => {
    setForm(f => ({ ...f, [field]: "", ...(expField && { [expField]: "" }) }));
    toast({ title: "🗑️ Fichier effacé", description: "L'URL du document a été retirée du formulaire." });
  };

  const uploadFile = async (field, file) => {
    setLoading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${field}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("uploads").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("uploads").getPublicUrl(filePath);
      setForm(f => ({ ...f, [field]: data.publicUrl }));
      toast({ title: "✅ Fichier ajouté", description: `${file.name} téléchargé.` });
    } catch (err) {
      toast({ title: "⚠️ Erreur d’upload", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...form };
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
      toast({ title: "Erreur Supabase", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={() => setShowModal(false)}>
      <h2 className="text-3xl font-extrabold text-center mb-6 text-gray-900 dark:text-white">
        {editingCamion ? "Modifier le Camion" : "Créer un Camion"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="text" name="immatriculation" placeholder="Immatriculation *" value={form.immatriculation} onChange={handleChange} className={BASE_INPUT_STYLE} required/>
        <input type="text" name="marquemodele" placeholder="Marque / Modèle *" value={form.marquemodele} onChange={handleChange} className={BASE_INPUT_STYLE} required/>
        <select name="type" value={form.type} onChange={handleChange} className={BASE_INPUT_STYLE} required>
          <option value="" disabled>-- Sélectionner le type --</option>
          <option value="Benne">Benne</option>
          <option value="Tracteur">Tracteur</option>
          <option value="Semi-remorque">Semi-remorque</option>
          <option value="Remorque">Remorque</option>
        </select>
        <select name="statut" value={form.statut} onChange={handleChange} className={BASE_INPUT_STYLE}>
          <option value="Disponible">Disponible</option>
          <option value="En maintenance">En maintenance</option>
          <option value="Indisponible">Indisponible</option>
        </select>
        <select name="structure" value={form.structure} onChange={handleChange} className={BASE_INPUT_STYLE} required>
          <option value="" disabled>-- Affecter à --</option>
          <option value="GTS">GTS</option>
          <option value="BATICOM">BATICOM</option>
        </select>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FileUploadField field="photourl" label="Photo du Camion" icon={<Camera size={16}/>} form={form} handleChange={handleChange} handleClearFile={handleClearFile} loading={loading}/>
          <FileUploadField field="cartegriseurl" label="Carte Grise" icon={<FileText size={16}/>} expField="cartegriseexpiry" form={form} handleChange={handleChange} handleClearFile={handleClearFile} loading={loading}/>
          <FileUploadField field="assuranceurl" label="Assurance" icon={<FileText size={16}/>} expField="assuranceexpiry" form={form} handleChange={handleChange} handleClearFile={handleClearFile} loading={loading}/>
          <FileUploadField field="visitetechniqueurl" label="Visite Technique" icon={<FileText size={16}/>} expField="visitetechniqueexpiry" form={form} handleChange={handleChange} handleClearFile={handleClearFile} loading={loading}/>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" onClick={() => setShowModal(false)} variant="outline" className="rounded-lg">
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting || loading} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white">
            {isSubmitting || loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Enregistrement...</> : editingCamion ? "Mettre à jour" : "Créer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}