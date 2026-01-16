import React, { useState } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Loader2, Upload, Camera, FileText, Trash2 } from "lucide-react";
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

/* =========================
   FILE UPLOAD FIELD (STYLE FIX)
   ========================= */
const FileUploadField = ({
  field,
  label,
  expField,
  form,
  handleChange,
  handleClearFile,
  loading,
  icon,
}) => {
  const fileUploaded = form[field] && form[field].startsWith("http");

  return (
    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 transition-colors">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
        {icon} {label}
      </label>

      <input
        type="file"
        id={`file-${field}`}
        name={field}
        onChange={handleChange}
        disabled={loading}
        className="hidden"
      />

      <label
        htmlFor={`file-${field}`}
        className={`
          w-full flex items-center justify-center p-2 rounded-lg cursor-pointer
          text-sm font-semibold transition-colors
          ${
            fileUploaded
              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800"
              : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
          }
        `}
      >
        <Upload size={16} className="mr-2" />
        {fileUploaded ? `Fichier chargé (${label})` : `Charger ${label}`}
      </label>

      {fileUploaded && (
        <div className="flex items-center justify-between mt-2 gap-2">
          <a
            href={form[field]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 text-xs hover:underline truncate"
          >
            Voir le document
          </a>

          <Button
            type="button"
            variant="ghost"
            onClick={() => handleClearFile(field, expField)}
            className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 p-1 h-auto"
            title={`Supprimer ${label}`}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )}

      {expField && (
        <div className="mt-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
            Date d’expiration
          </label>
          <input
            type="date"
            name={expField}
            value={form[expField] || ""}
            onChange={handleChange}
            className={BASE_INPUT_STYLE}
          />
        </div>
      )}
    </div>
  );
};

/* =========================
   MODAL CAMION
   ========================= */
export default function CamionModal({
  editingCamion = null,
  setShowModal,
  fetchCamions,
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    immatriculation: editingCamion?.immatriculation || "",
    marquemodele: editingCamion?.marquemodele || "",
    type: editingCamion?.type || "",
    statut: editingCamion?.statut || "Disponible",
    structure: editingCamion?.structure || "",

    photourl: editingCamion?.photourl || "",

    cartegriseurl: editingCamion?.cartegriseurl || "",
    cartegriseexpiry: editingCamion?.cartegriseexpiry || "",
    cartegriseurl2: editingCamion?.cartegriseurl2 || "",
    cartegriseexpiry2: editingCamion?.cartegriseexpiry2 || "",

    assuranceurl: editingCamion?.assuranceurl || "",
    assuranceexpiry: editingCamion?.assuranceexpiry || "",
    assuranceurl2: editingCamion?.assuranceurl2 || "",
    assuranceexpiry2: editingCamion?.assuranceexpiry2 || "",

    visitetechniqueurl: editingCamion?.visitetechniqueurl || "",
    visitetechniqueexpiry: editingCamion?.visitetechniqueexpiry || "",
    visitetechniqueurl2: editingCamion?.visitetechniqueurl2 || "",
    visitetechniqueexpiry2: editingCamion?.visitetechniqueexpiry2 || "",
  });

  const uploadFile = async (field, file) => {
    setLoading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${field}/${Date.now()}.${ext}`;

      await supabase.storage.from("uploads").upload(path, file, { upsert: true });
      const { data } = supabase.storage.from("uploads").getPublicUrl(path);

      setForm((f) => ({ ...f, [field]: data.publicUrl }));
    } catch (err) {
      toast({
        title: "Erreur upload",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (e) => {
    const { name, value, files } = e.target;

    if (files?.length) {
      await uploadFile(name, files[0]);
      return;
    }

    if (name === "structure" && value !== "GTS") {
      setForm((f) => ({
        ...f,
        structure: value,
        cartegriseurl2: "",
        cartegriseexpiry2: "",
        assuranceurl2: "",
        assuranceexpiry2: "",
        visitetechniqueurl2: "",
        visitetechniqueexpiry2: "",
      }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleClearFile = (field, expField) => {
    setForm((f) => ({
      ...f,
      [field]: "",
      ...(expField ? { [expField]: "" } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingCamion) {
        await supabase.from("camions").update(form).eq("id", editingCamion.id);
      } else {
        await supabase.from("camions").insert([form]);
      }

      toast({ title: "✅ Camion enregistré" });
      fetchCamions?.();
      setShowModal(false);
    } catch (err) {
      toast({
        title: "Erreur Supabase",
        description: err.message,
        variant: "destructive",
      });
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
        <input
          name="immatriculation"
          placeholder="Immatriculation *"
          value={form.immatriculation}
          onChange={handleChange}
          className={BASE_INPUT_STYLE}
          required
        />

        <input
          name="marquemodele"
          placeholder="Marque / Modèle *"
          value={form.marquemodele}
          onChange={handleChange}
          className={BASE_INPUT_STYLE}
          required
        />

        <select
          name="type"
          value={form.type}
          onChange={handleChange}
          className={BASE_INPUT_STYLE}
          required
        >
          <option value="" disabled>
            -- Sélectionner le type --
          </option>
          <option value="Benne">Benne</option>
          <option value="Tracteur">Tracteur</option>
          <option value="Remorque">Remorque</option>
        </select>

        <select
          name="structure"
          value={form.structure}
          onChange={handleChange}
          className={BASE_INPUT_STYLE}
          required
        >
          <option value="" disabled>
            -- Affecter à --
          </option>
          <option value="GTS">GTS</option>
          <option value="BATICOM">BATICOM</option>
        </select>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FileUploadField field="photourl" label="Photo du Camion" icon={<Camera size={16} />} form={form} handleChange={handleChange} handleClearFile={handleClearFile} loading={loading} />

          <FileUploadField field="cartegriseurl" label="Carte Grise" icon={<FileText size={16} />} expField="cartegriseexpiry" form={form} handleChange={handleChange} handleClearFile={handleClearFile} loading={loading} />

          {form.structure === "GTS" && (
            <FileUploadField field="cartegriseurl2" label="Carte Grise (2)" icon={<FileText size={16} />} expField="cartegriseexpiry2" form={form} handleChange={handleChange} handleClearFile={handleClearFile} loading={loading} />
          )}

          <FileUploadField field="assuranceurl" label="Assurance" icon={<FileText size={16} />} expField="assuranceexpiry" form={form} handleChange={handleChange} handleClearFile={handleClearFile} loading={loading} />

          {form.structure === "GTS" && (
            <FileUploadField field="assuranceurl2" label="Assurance (2)" icon={<FileText size={16} />} expField="assuranceexpiry2" form={form} handleChange={handleChange} handleClearFile={handleClearFile} loading={loading} />
          )}

          <FileUploadField field="visitetechniqueurl" label="Visite Technique" icon={<FileText size={16} />} expField="visitetechniqueexpiry" form={form} handleChange={handleChange} handleClearFile={handleClearFile} loading={loading} />

          {form.structure === "GTS" && (
            <FileUploadField field="visitetechniqueurl2" label="Visite Technique (2)" icon={<FileText size={16} />} expField="visitetechniqueexpiry2" form={form} handleChange={handleChange} handleClearFile={handleClearFile} loading={loading} />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading || isSubmitting}>
            {loading || isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
