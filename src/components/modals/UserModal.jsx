import React, { useState } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../ui/button.jsx";
import { useToast } from "../ui/use-toast.jsx";

export default function UserModal({ editingUser = null, setShowModal, fetchUsers }) {
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: editingUser?.name || "",
    email: editingUser?.email || "",
    password: "",
    phone: editingUser?.phone || "",
    role: editingUser?.role || "chauffeur",
    structure: editingUser?.structure || "",
    cniburl: editingUser?.cniburl || "",
    cnib_expiration: editingUser?.cnib_expiration || "",
    permisurl: editingUser?.permisurl || "",
    permis_expiration: editingUser?.permis_expiration || "",
    carteurl: editingUser?.carteurl || "",
    carte_expiration: editingUser?.carte_expiration || "",
    actenaissanceurl: editingUser?.actenaissanceurl || "",
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
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("uploads").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      setForm((f) => ({ ...f, [field]: publicUrl }));
      toast({ title: "✅ Fichier ajouté", description: `${file.name} a été téléchargé.` });
    } catch (err) {
      toast({
        title: "⚠️ Erreur d’upload",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        const { error } = await supabase
          .from("profiles")
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq("id", editingUser.id);

        if (error) throw error;
        toast({ title: "✅ Utilisateur modifié avec succès" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: form },
        });
        if (error) throw error;

        toast({ title: "✅ Nouvel utilisateur créé" });
      }

      fetchUsers?.();
      setShowModal(false);
    } catch (err) {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-0">
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-xl w-full max-w-lg h-[90vh] sm:h-auto overflow-y-auto animate-in fade-in zoom-in">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 text-center">
          {editingUser ? "Modifier l’utilisateur" : "Créer un utilisateur"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Inputs classiques */}
          {["name", "email", "password", "phone"].map((field) => (
            (field !== "password" || !editingUser) && (
              <input
                key={field}
                name={field}
                type={field === "email" ? "email" : field === "password" ? "password" : "text"}
                value={form[field]}
                onChange={handleChange}
                placeholder={field === "name" ? "Nom complet" : field === "email" ? "Email" : field === "password" ? "Mot de passe" : "Téléphone"}
                className="border border-gray-300 dark:border-gray-600 p-3 w-full rounded-md text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                required={field !== "phone"}
              />
            )
          ))}

          {/* Select Structure */}
          <select
            name="structure"
            value={form.structure}
            onChange={handleChange}
            className="border border-gray-300 dark:border-gray-600 p-3 w-full rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            required
          >
            <option value="">Sélectionnez une structure</option>
            <option value="BATICOM">BATICOM</option>
            <option value="GTS">GTS</option>
          </select>

          {/* Select Role */}
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="border border-gray-300 dark:border-gray-600 p-3 w-full rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          >
            <option value="chauffeur">Chauffeur</option>
            <option value="superviseur">Superviseur</option>
            <option value="admin">Admin</option>
          </select>

          {/* Upload documents + expiration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            {[
              { field: "cniburl", exp: "cnib_expiration" },
              { field: "permisurl", exp: "permis_expiration" },
              { field: "carteurl", exp: "carte_expiration" },
              { field: "actenaissanceurl", exp: null },
            ].map(({ field, exp }) => (
              <div key={field}>
                <label className="text-sm text-gray-700 dark:text-gray-200 block mb-1">
                  {field.replace("url", "").toUpperCase()} :
                </label>
                <input
                  type="file"
                  name={field}
                  onChange={handleChange}
                  className="w-full"
                />
                {form[field] && (
                  <a
                    href={form[field]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 text-xs mt-1 block"
                  >
                    Voir fichier
                  </a>
                )}
                {exp && (
                  <input
                    type="date"
                    name={exp}
                    value={form[exp]}
                    onChange={handleChange}
                    className="border border-gray-300 dark:border-gray-600 p-2 w-full rounded mt-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Footer boutons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 sticky bottom-0 bg-white dark:bg-gray-800 pb-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowModal(false)}
              className="border-gray-400 w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto"
            >
              {loading ? "Enregistrement..." : editingUser ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
