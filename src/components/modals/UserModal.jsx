import React, { useState, useCallback, useEffect } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Button } from "../ui/button.jsx";
import { useToast } from "../ui/use-toast.jsx";
import { Loader2, Upload, User, KeyRound, Briefcase, FileText, File } from "lucide-react";

// --- Composant Modal (Inchangé) ---
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

// --- Composant FileUploadField (Inchangé) ---
const FileUploadField = ({ field, label, expField, form, fileObjects, handleChange, loading }) => {
    const fileUploaded = form[field] && form[field].startsWith('http');
    const selectedFile = fileObjects[field];

    const baseInputStyle = `
        w-full p-2 rounded-lg border 
        border-gray-300 dark:border-gray-600 
        bg-gray-50 dark:bg-gray-700 
        text-gray-900 dark:text-gray-100 
        focus:ring-blue-500 focus:border-blue-500
        transition-all duration-200
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
                        ${(fileUploaded || selectedFile)
                            ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800"
                            : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
                        }
                        ${loading ? 'opacity-70 cursor-not-allowed' : ''}
                    `}
                >
                    <Upload size={16} className="mr-2" />
                    {selectedFile ? `Prêt : ${selectedFile.name.slice(0, 10)}...` : (fileUploaded ? `Fichier chargé` : `Charger ${label}`)}
                </label>

                {fileUploaded && !selectedFile && (
                    <a href={form[field]} target="_blank" rel="noopener noreferrer"
                        className="text-blue-500 dark:text-blue-400 text-xs hover:underline truncate transition-colors">
                        Voir le document actuel
                    </a>
                )}

                {expField && (
                    <div className="mt-1">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">Expiration :</label>
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

// --- COMPOSANT PRINCIPAL UserModal ---

export default function UserModal({ editingUser = null, setShowModal, fetchUsers }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fileObjects, setFileObjects] = useState({});

    const [form, setForm] = useState({
        name: "", email: "", password: "", phone: "", role: "chauffeur", structure: "",
        cniburl: "", cnib_expiration: "", permisurl: "", permis_expiration: "",
        carteurl: "", carte_expiration: "", actenaissanceurl: ""
    });

    // ✅ EFFET DE CHARGEMENT : Pré-remplit les champs quand on clique sur "Modifier"
    useEffect(() => {
        if (editingUser) {
            setForm({
                name: editingUser.name || "",
                email: editingUser.email || "",
                password: "", // Toujours vide par sécurité
                phone: editingUser.phone || "",
                role: editingUser.role || "chauffeur",
                structure: editingUser.structure || "",
                cniburl: editingUser.cniburl || "",
                cnib_expiration: editingUser.cnib_expiration || "",
                permisurl: editingUser.permisurl || "",
                permis_expiration: editingUser.permis_expiration || "",
                carteurl: editingUser.carteurl || "",
                carte_expiration: editingUser.carte_expiration || "",
                actenaissanceurl: editingUser.actenaissanceurl || "",
            });
            setFileObjects({}); // Réinitialise les fichiers sélectionnés
        }
    }, [editingUser]);

    const handleChange = useCallback((e) => {
        const { name, value, files } = e.target;
        if (files && files.length > 0) {
            setFileObjects((prev) => ({ ...prev, [name]: files[0] }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    }, []);

    const uploadFile = async (field, file, userIdentifier) => {
        try {
            const ext = file.name.split(".").pop();
            const path = `user_documents/${userIdentifier}/${field}/${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage.from("uploads").upload(path, file, { upsert: true }); 
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(path);
            return { field, publicUrl };
        } catch (err) {
            console.error(`Erreur d'upload pour ${field}:`, err);
            return { field, publicUrl: null };
        }
    };
    
    const processFileUploads = async (userIdentifier) => {
        const filesToUpload = Object.entries(fileObjects).filter(([, file]) => file);
        if (filesToUpload.length === 0) return {};
        setUploading(true);
        const uploadPromises = filesToUpload.map(([field, file]) => uploadFile(field, file, userIdentifier));
        const uploadedResults = await Promise.all(uploadPromises);
        const newUrls = uploadedResults.reduce((acc, result) => {
            if (result.publicUrl) acc[result.field] = result.publicUrl;
            return acc;
        }, {});
        setUploading(false);
        return newUrls;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const { data: currentSessionData } = await supabase.auth.getSession();
        const adminSessionData = currentSessionData?.session;

        try {
            let currentUserId = editingUser?.id;
            const uploadIdentifier = currentUserId || form.email; 
            const uploadPromise = processFileUploads(uploadIdentifier); 
            
            // ✅ FILTRAGE STRICT : On ne prend QUE les colonnes qui existent en base
            const profileData = {
                name: form.name,
                phone: form.phone,
                role: form.role,
                structure: form.structure,
                cnib_expiration: form.cnib_expiration || null,
                permis_expiration: form.permis_expiration || null,
                carte_expiration: form.carte_expiration || null,
                updated_at: new Date().toISOString()
            };

            if (!editingUser) {
                // --- CRÉATION ---
                if (!form.password) throw new Error("Le mot de passe est requis.");
                
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
                    email: form.email,
                    password: form.password,
                    options: { data: { name: form.name, role: form.role } }
                });
                
                if (signUpError) throw signUpError;
                currentUserId = signUpData.user.id;
                
                const { error: profileError } = await supabase
                    .from("profiles")
                    .update(profileData) 
                    .eq("id", currentUserId);

                if (profileError) throw profileError;

                await supabase.auth.signOut(); 
                if (adminSessionData) await supabase.auth.setSession(adminSessionData);
                toast({ title: "🎉 Utilisateur créé" });

            } else {
                // --- MISE À JOUR ---
                if (form.password) {
                    const { error: authError } = await supabase.rpc('secure_change_password', { 
                        target_user_id: currentUserId, 
                        new_password: form.password 
                    });
                    if (authError) throw authError;
                }

                const { error: updateError } = await supabase
                    .from("profiles")
                    .update(profileData) 
                    .eq("id", currentUserId);
                
                if (updateError) throw updateError;
                toast({ title: "👌 Profil mis à jour" });
            }

            fetchUsers?.();
            setShowModal(false);
            
            // Finalisation des URLs de fichiers
            const uploadedUrls = await uploadPromise; 
            if (Object.keys(uploadedUrls).length > 0) {
                await supabase.from("profiles").update(uploadedUrls).eq("id", currentUserId);
            }
            
        } catch (err) {
            toast({ title: "❌ Erreur", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const baseInputStyle = `w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200`;

    return (
        <Modal onClose={() => setShowModal(false)}>
            <h2 className="text-3xl font-extrabold text-center mb-6 text-gray-900 dark:text-white border-b pb-3 border-gray-200 dark:border-gray-700">
                {editingUser ? "📝 Modifier l’utilisateur" : "➕ Créer un nouvel utilisateur"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                <fieldset className="p-4 border border-blue-400/50 dark:border-blue-600/50 rounded-xl space-y-3">
                    <legend className="px-2 text-md font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2"><User size={18} /> Profil</legend>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="Nom complet" className={baseInputStyle} required />
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" className={baseInputStyle} required disabled={!!editingUser} />
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="Téléphone" className={baseInputStyle} />
                </fieldset>

                <fieldset className="p-4 border border-purple-400/50 dark:border-purple-600/50 rounded-xl space-y-3">
                    <legend className="px-2 text-md font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-2"><KeyRound size={18} /> Accès</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select name="structure" value={form.structure} onChange={handleChange} className={baseInputStyle} required>
                            <option value="" disabled>Structure</option>
                            <option value="BATICOM">BATICOM</option>
                            <option value="GTS">GTS</option>
                        </select>
                        <select name="role" value={form.role} onChange={handleChange} className={baseInputStyle}>
                            <option value="chauffeur">Chauffeur</option>
                            <option value="superviseur">Superviseur</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <input name="password" type="password" value={form.password} onChange={handleChange} placeholder={editingUser ? "Nouveau MDP (optionnel)" : "Mot de passe (requis)"} className={baseInputStyle} required={!editingUser} />
                </fieldset>

                <fieldset className="p-4 border border-green-400/50 dark:border-green-600/50 rounded-xl space-y-4">
                    <legend className="px-2 text-md font-semibold text-green-600 dark:text-green-400 flex items-center gap-2"><Briefcase size={18} /> Documents</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FileUploadField field="cniburl" label="CNIB" expField="cnib_expiration" form={form} fileObjects={fileObjects} handleChange={handleChange} loading={loading || uploading} />
                        <FileUploadField field="permisurl" label="Permis" expField="permis_expiration" form={form} fileObjects={fileObjects} handleChange={handleChange} loading={loading || uploading} />
                        <FileUploadField field="carteurl" label="Carte Transport" expField="carte_expiration" form={form} fileObjects={fileObjects} handleChange={handleChange} loading={loading || uploading} />
                        <FileUploadField field="actenaissanceurl" label="Acte Naissance" form={form} fileObjects={fileObjects} handleChange={handleChange} loading={loading || uploading} />
                    </div>
                </fieldset>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button type="button" onClick={() => setShowModal(false)} variant="outline" disabled={loading || uploading}>Annuler</Button>
                    <Button type="submit" disabled={loading || uploading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : editingUser ? "Mettre à jour" : "Créer l'utilisateur"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}