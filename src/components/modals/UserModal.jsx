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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {editingUser ? "Modifier l’utilisateur" : "Créer un utilisateur"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nom complet"
            className="border p-2 w-full rounded"
            required
          />
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className="border p-2 w-full rounded"
            required
          />
          {!editingUser && (
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mot de passe"
              className="border p-2 w-full rounded"
              required
            />
          )}
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Téléphone"
            className="border p-2 w-full rounded"
          />

          {/* Structure en liste déroulante */}
          <select
            name="structure"
            value={form.structure}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            required
          >
            <option value="">Sélectionnez une structure</option>
            <option value="BATICOM">BATICOM</option>
            <option value="GTS">GTS</option>
          </select>

          {/* Role en liste déroulante */}
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="border p-2 w-full rounded"
          >
            <option value="chauffeur">Chauffeur</option>
            <option value="superviseur">Superviseur</option>
            <option value="admin">Admin</option>
          </select>

          {/* Documents avec upload et expiration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            {[
              { field: "cniburl", exp: "cnib_expiration" },
              { field: "permisurl", exp: "permis_expiration" },
              { field: "carteurl", exp: "carte_expiration" },
              { field: "actenaissanceurl", exp: null },
            ].map(({ field, exp }) => (
              <div key={field}>
                <label className="text-sm text-gray-700 block">
                  {field.replace("url", "").toUpperCase()} :
                  <input
                    type="file"
                    name={field}
                    onChange={handleChange}
                    className="mt-1 w-full"
                  />
                  {form[field] && (
                    <a href={form[field]} target="_blank" className="text-blue-600 text-xs">
                      Voir fichier
                    </a>
                  )}
                </label>
                {exp && (
                  <input
                    type="date"
                    name={exp}
                    value={form[exp]}
                    onChange={handleChange}
                    className="border p-2 w-full rounded mt-1"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowModal(false)}
              className="border-gray-400"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {loading
                ? "Enregistrement..."
                : editingUser
                ? "Mettre à jour"
                : "Créer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
