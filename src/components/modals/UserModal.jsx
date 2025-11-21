import React, { useState } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../ui/button.jsx";
import { useToast } from "../ui/use-toast.jsx";
import { Loader2, Upload, User, KeyRound, Briefcase, FileText } from "lucide-react";

// Composant Modal (Base UI pour la superposition)
const Modal = ({ children, onClose }) => (
    <div 
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[100] flex items-center justify-center p-3 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
    >
        <div 
            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto transform scale-100 transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>
    </div>
);

// Composant de champ de fichier réutilisable
const FileUploadField = ({ field, label, expField, form, handleChange, loading }) => {
    const fileUploaded = form[field] && form[field].startsWith('http');
    
    const baseInputStyle = `
        input-base w-full p-2 rounded-lg border 
        border-gray-300 dark:border-gray-600 
        bg-gray-50 dark:bg-gray-700 
        text-gray-900 dark:text-gray-100 
        focus:ring-blue-500 focus:border-blue-500
    `;

    return (
        <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 transition-colors">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                <FileText size={16} className="text-blue-500" /> {label}
            </label>
            
            <div className="flex flex-col gap-2">
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
                        w-full flex items-center justify-center p-2 rounded-lg cursor-pointer transition-colors
                        text-sm font-semibold
                        ${fileUploaded 
                            ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800"
                            : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
                        }
                    `}
                >
                    <Upload size={16} className="mr-2" />
                    {fileUploaded ? `Fichier chargé (${label})` : `Charger un fichier ${label}`}
                </label>

                {fileUploaded && (
                    <a href={form[field]} target="_blank" rel="noopener noreferrer"
                        className="text-blue-500 dark:text-blue-400 text-xs hover:underline truncate transition-colors">
                        Voir le document actuel
                    </a>
                )}

                {expField && (
                    <div className="mt-1">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">Date d'Expiration :</label>
                        <input 
                            type="date" 
                            name={expField}
                            value={form[expField] || ''} 
                            onChange={handleChange}
                            className={baseInputStyle}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default function UserModal({ editingUser = null, setShowModal, fetchUsers }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

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

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (files && files.length > 0) {
            uploadFile(name, files[0]);
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const uploadFile = async (field, file) => {
        setUploading(true);
        try {
            const ext = file.name.split(".").pop();
            const path = `user_documents/${editingUser?.id || form.email}/${field}/${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage.from("uploads").upload(path, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(path);
            setForm((prev) => ({ ...prev, [field]: publicUrl }));
            toast({ title: "📄 Upload réussi", description: `${file.name} chargé.` });
        } catch (err) {
            toast({ title: "❌ Échec de l’upload", description: err.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!editingUser) {
                if (!form.password) {
                    toast({ title: "Mot de passe requis", variant: "destructive" });
                    setLoading(false);
                    return;
                }
                if (!form.structure) {
                    toast({ title: "Structure requise", variant: "destructive" });
                    setLoading(false);
                    return;
                }

                const { error: signUpError } = await supabase.auth.signUp({
                    email: form.email,
                    password: form.password,
                    options: { data: form },
                });
                if (signUpError) throw signUpError;
                toast({ title: "🎉 Utilisateur créé avec succès" });

            } else {
                const updateData = { ...form, updated_at: new Date().toISOString() };
                delete updateData.password;
                const { error: updateError } = await supabase.from("profiles").update(updateData).eq("id", editingUser.id);
                if (updateError) throw updateError;
                toast({ title: "👌 Utilisateur mis à jour" });
            }

            fetchUsers?.();
            setShowModal(false);
        } catch (err) {
            toast({ title: "❌ Erreur", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const baseInputStyle = `
        w-full p-2.5 rounded-lg border 
        border-gray-300 dark:border-gray-600 
        bg-gray-50 dark:bg-gray-700 
        text-gray-900 dark:text-gray-100 
        focus:ring-blue-500 focus:border-blue-500 
        transition-all duration-200
    `;

    return (
        <Modal onClose={() => setShowModal(false)}>
            <h2 className="text-3xl font-extrabold text-center mb-6 text-gray-900 dark:text-white border-b pb-3 border-gray-200 dark:border-gray-700">
                {editingUser ? "Modifier l’utilisateur" : "Créer un nouvel utilisateur"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* PROFIL ET CONTACT */}
                <fieldset className="p-4 border border-blue-400/50 dark:border-blue-600/50 rounded-xl space-y-3">
                    <legend className="px-2 text-md font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <User size={18} /> Informations de Profil
                    </legend>
                    
                    <input name="name" value={form.name} onChange={handleChange} placeholder="Nom complet" className={baseInputStyle} required />
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" className={baseInputStyle} required />
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="Téléphone" className={baseInputStyle} />
                </fieldset>

                {/* RÔLE ET SÉCURITÉ */}
                <fieldset className="p-4 border border-purple-400/50 dark:border-purple-600/50 rounded-xl space-y-3">
                    <legend className="px-2 text-md font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                        <KeyRound size={18} /> Rôle et Accès
                    </legend>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select name="structure" value={form.structure} onChange={handleChange} className={baseInputStyle} required>
                            <option value="" disabled>Choisir la structure</option>
                            <option value="BATICOM">BATICOM</option>
                            <option value="GTS">GTS</option>
                        </select>

                        <select name="role" value={form.role} onChange={handleChange} className={baseInputStyle}>
                            <option value="chauffeur">Chauffeur</option>
                            <option value="superviseur">Superviseur</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div className="relative">
                        <input name="password" type="password" value={form.password} onChange={handleChange} placeholder={editingUser ? "Nouveau mot de passe (optionnel)" : "Mot de passe (requis)"} className={`${baseInputStyle} ${!editingUser && 'border-red-400 dark:border-red-500'}`} required={!editingUser} />
                        {(editingUser && !form.password) && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Laissez vide pour conserver le mot de passe actuel.</p>}
                    </div>
                </fieldset>

                {/* DOCUMENTS */}
                <fieldset className="p-4 border border-green-400/50 dark:border-green-600/50 rounded-xl space-y-4">
                    <legend className="px-2 text-md font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                        <Briefcase size={18} /> Documents et Validité
                    </legend>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FileUploadField field="cniburl" label="CNIB / Carte d'Identité" expField="cnib_expiration" form={form} handleChange={handleChange} loading={uploading} />
                        <FileUploadField field="permisurl" label="Permis de Conduire" expField="permis_expiration" form={form} handleChange={handleChange} loading={uploading} />
                        <FileUploadField field="carteurl" label="Carte de Transport" expField="carte_expiration" form={form} handleChange={handleChange} loading={uploading} />
                        <FileUploadField field="actenaissanceurl" label="Acte de Naissance" form={form} handleChange={handleChange} loading={uploading} />
                    </div>

                    {uploading && (
                        <div className="flex items-center justify-center pt-2 text-sm text-blue-600 dark:text-blue-400">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Transfert des fichiers en cours...
                        </div>
                    )}
                </fieldset>

                {/* ACTIONS */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="
                            bg-gray-100 dark:bg-gray-700
                            hover:bg-gray-200 dark:hover:bg-gray-600
                            !text-black dark:text-white  <-- CORRECTION CLASSE 'IMPORTANT' APPLIQUÉE ICI
                            border border-gray-300 dark:border-gray-600
                            rounded-lg
                        "
                    >
                        Annuler
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={loading || uploading}
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                    >
                        {(loading || uploading) ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Patientez...
                            </>
                        ) : editingUser ? "Mettre à jour" : "Créer l'utilisateur"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}