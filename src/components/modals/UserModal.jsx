import React, { useState, useCallback } from "react";
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
                    {selectedFile ? `Fichier sélectionné (${selectedFile.name})` : (fileUploaded ? `Fichier chargé` : `Charger un fichier ${label}`)}
                </label>

                {fileUploaded && !selectedFile && (
                    <a href={form[field]} target="_blank" rel="noopener noreferrer"
                        className="text-blue-500 dark:text-blue-400 text-xs hover:underline truncate transition-colors">
                        Voir le document actuel
                    </a>
                )}
                {selectedFile && (
                    <span className="flex items-center text-xs text-gray-600 dark:text-gray-400 mt-1">
                        <File size={12} className="mr-1" /> **Nouveau** fichier en attente d'upload.
                    </span>
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

// --- COMPOSANT PRINCIPAL UserModal ---

export default function UserModal({ editingUser = null, setShowModal, fetchUsers }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [form, setForm] = useState(() => ({
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
    }));

    const [fileObjects, setFileObjects] = useState({});

    const handleChange = useCallback((e) => {
        const { name, value, files } = e.target;
        
        if (files && files.length > 0) {
            setFileObjects((prev) => ({ ...prev, [name]: files[0] }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    }, []);

    // Fonction principale d'upload
    const uploadFile = async (field, file, userIdentifier) => {
        try {
            const ext = file.name.split(".").pop();
            const path = `user_documents/${userIdentifier}/${field}/${Date.now()}.${ext}`;
            
            const { error: uploadError } = await supabase.storage
                .from("uploads")
                .upload(path, file, { upsert: true }); 
            
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from("uploads").getPublicUrl(path);
            
            return { field, publicUrl };
            
        } catch (err) {
            // Log l'erreur mais ne la relève pas pour ne pas bloquer les autres fichiers
            console.error(`Erreur d'upload pour ${field}:`, err);
            return { field, publicUrl: null };
        }
    };
    
    // Processus d'upload des fichiers (Utilise Promise.all pour la parallélisation)
    const processFileUploads = async (userIdentifier) => {
        const filesToUpload = Object.entries(fileObjects).filter(([, file]) => file);

        if (filesToUpload.length === 0) return {};

        setUploading(true);
        
        const uploadPromises = filesToUpload.map(([field, file]) => 
            uploadFile(field, file, userIdentifier)
        );

        const uploadedResults = await Promise.all(uploadPromises);

        const newUrls = uploadedResults.reduce((acc, result) => {
            // N'inclut que les uploads réussis
            if (result.publicUrl) {
                acc[result.field] = result.publicUrl;
            }
            return acc;
        }, {});

        setUploading(false);
        return newUrls;
    }


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        // --- 1. CAPTURER LE JETON DE L'ADMIN AVANT LE CONFLIT DE SESSION ---
        let adminSessionData = null; 
        const { data: currentSessionData } = await supabase.auth.getSession();
        
        if (currentSessionData?.session) {
            adminSessionData = currentSessionData.session;
        }

        try {
            let currentUserId = editingUser?.id;

            // 1. Validation de base
            if (!editingUser) {
                if (!form.password) throw new Error("Le mot de passe est requis pour la création d'utilisateur.");
                if (!form.structure) throw new Error("La structure est requise.");
                if (!form.email) throw new Error("L'email est requis.");
            }
            if (!form.name) throw new Error("Le nom complet est requis.");
            
            const uploadIdentifier = currentUserId || form.email; 

            // 2. Lancer l'Upload des fichiers IMMÉDIATEMENT et en parallèle (sans l'attendre ici)
            const uploadPromise = processFileUploads(uploadIdentifier); 
            
            // --- DONNÉES DE BASE (PROFIL) ---
            let finalDataWithPassword = { ...form };
            let finalData = { ...finalDataWithPassword }; 
            delete finalData.password; 
            
            if (!editingUser) {
                // ----------------------------------------------------
                // --- CRÉATION (Signup + Mise à jour Profile) ---
                // ----------------------------------------------------
                
                // 3a. Créer l'utilisateur dans auth.users (RAPIDE)
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
                    email: form.email,
                    password: form.password,
                    options: { 
                        data: { 
                            name: finalDataWithPassword.name, 
                            role: finalDataWithPassword.role, 
                            structure: finalDataWithPassword.structure, 
                            phone: finalDataWithPassword.phone 
                        }
                    }, 
                });
                
                if (signUpError) throw signUpError;
                currentUserId = signUpData.user.id;
                
                // 3b. Mettre à jour la table profiles (SANS LES URLS DE FICHIERS, seulement les métadonnées)
                const profileDataWithoutUrls = { ...finalData };
                delete profileDataWithoutUrls.cniburl;
                delete profileDataWithoutUrls.permisurl;
                delete profileDataWithoutUrls.carteurl;
                delete profileDataWithoutUrls.actenaissanceurl;
                
                const { error: profileUpdateError } = await supabase
                    .from("profiles")
                    .update(profileDataWithoutUrls) 
                    .eq("id", currentUserId); 
                    
                if (profileUpdateError) throw profileUpdateError;
                
                // 3c. Déconnexion immédiate du nouvel utilisateur
                await supabase.auth.signOut(); 
                
                // 3d. RESTAURATION DE LA SESSION DE L'ADMIN
                if (adminSessionData) {
                    const { error: setSessionError } = await supabase.auth.setSession(adminSessionData);

                    if (setSessionError) {
                        toast({
                            title: "Session Admin Expirée",
                            description: "Veuillez vous reconnecter pour poursuivre les opérations.",
                            variant: "destructive"
                        });
                        await supabase.auth.signOut(); 
                    } else {
                        // Temporisation pour stabilisation du routeur (évite la redirection)
                        await new Promise(resolve => setTimeout(resolve, 500)); 
                    }
                }
                
                toast({ 
                    title: "🎉 Utilisateur créé (Instantané)", 
                    description: "Le compte est créé. Les documents sont en cours d'enregistrement en arrière-plan." 
                });

            } else {
                // ----------------------------------------------------
                // --- MISE À JOUR (Profiles) ---
                // ----------------------------------------------------
                const updateData = { ...finalData, updated_at: new Date().toISOString() };
                
                // 4a. Mettre à jour le mot de passe si fourni
                if (form.password) {
                    const { error: authUpdateError } = await supabase.auth.updateUser({ password: form.password });
                    if (authUpdateError) throw authUpdateError;
                    toast({ title: "🔑 Mot de passe mis à jour", description: "Le mot de passe a été modifié." });
                }

                // 4b. Mettre à jour le profil (sans URLs de fichiers ici)
                const { error: updateError } = await supabase.from("profiles").update(updateData).eq("id", editingUser.id);
                if (updateError) throw updateError;
                
                toast({ title: "👌 Utilisateur mis à jour", description: "Les modifications de profil sont faites. Documents en cours." });
            }

            // Fermeture de la modale et rafraîchissement de la liste DÈS MAINTENANT pour libérer l'admin
            fetchUsers?.();
            setShowModal(false);
            
            // --- ATTENDRE LES UPLOADS EN ARRIÈRE-PLAN ---
            // C'est ici que l'attente a lieu, mais elle est gérée APRÈS la fermeture de la modale.
            const uploadedUrls = await uploadPromise; 
            
            // --- MISE À JOUR FINALE AVEC LES URLS ---
            if (Object.keys(uploadedUrls).length > 0) {
                // Mise à jour de la table profiles UNIQUEMENT avec les URLs
                const { error: urlUpdateError } = await supabase
                    .from("profiles")
                    .update(uploadedUrls)
                    .eq("id", currentUserId);
                
                if (urlUpdateError) {
                    // Si l'erreur se produit ici, elle n'affecte que l'enregistrement des URLs
                    console.error("Erreur de mise à jour des URLs:", urlUpdateError);
                    toast({
                         title: "Attention: Erreur Document",
                         description: "Le compte a été créé/mis à jour, mais l'enregistrement des documents a échoué. Vérifiez la console.",
                         variant: "destructive"
                    });
                } else {
                    toast({ 
                        title: "✅ Documents enregistrés", 
                        description: "Tous les documents ont été téléchargés et liés au profil.",
                        variant: "success"
                    });
                }
            }
            
        } catch (err) {
            console.error(err);
            toast({ title: "❌ Erreur Critique", description: err.message || "Une erreur inconnue s'est produite lors de l'enregistrement de base.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // --- Rendu du Composant (Inchangé) ---
    
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
                {editingUser ? "📝 Modifier l’utilisateur" : "➕ Créer un nouvel utilisateur"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* PROFIL ET CONTACT (Inchangé) */}
                <fieldset className="p-4 border border-blue-400/50 dark:border-blue-600/50 rounded-xl space-y-3">
                    <legend className="px-2 text-md font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <User size={18} /> Informations de Profil
                    </legend>
                    
                    <input name="name" value={form.name} onChange={handleChange} placeholder="Nom complet" className={baseInputStyle} required />
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" className={baseInputStyle} required />
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="Téléphone" className={baseInputStyle} />
                </fieldset>

                {/* RÔLE ET SÉCURITÉ (Inchangé) */}
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
                        <input 
                            name="password" 
                            type="password" 
                            value={form.password} 
                            onChange={handleChange} 
                            placeholder={editingUser ? "Nouveau mot de passe (optionnel)" : "Mot de passe (requis)"} 
                            className={`${baseInputStyle} ${!editingUser && !form.password ? 'border-red-400 dark:border-red-500' : ''}`} 
                            required={!editingUser} 
                        />
                        {(editingUser && !form.password) && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Laissez vide pour conserver le mot de passe actuel.</p>}
                        {(!editingUser && !form.password) && <p className="text-xs text-red-500 dark:text-red-400 mt-1">Requis pour la création.</p>}
                    </div>
                </fieldset>

                {/* DOCUMENTS (Inchangé) */}
                <fieldset className="p-4 border border-green-400/50 dark:border-green-600/50 rounded-xl space-y-4">
                    <legend className="px-2 text-md font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                        <Briefcase size={18} /> Documents et Validité
                    </legend>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FileUploadField 
                            field="cniburl" label="CNIB / Carte d'Identité" expField="cnib_expiration" 
                            form={form} fileObjects={fileObjects} handleChange={handleChange} loading={loading || uploading} 
                        />
                        <FileUploadField 
                            field="permisurl" label="Permis de Conduire" expField="permis_expiration" 
                            form={form} fileObjects={fileObjects} handleChange={handleChange} loading={loading || uploading} 
                        />
                        <FileUploadField 
                            field="carteurl" label="Carte de Transport" expField="carte_expiration" 
                            form={form} fileObjects={fileObjects} handleChange={handleChange} loading={loading || uploading} 
                        />
                        <FileUploadField 
                            field="actenaissanceurl" label="Acte de Naissance" 
                            form={form} fileObjects={fileObjects} handleChange={handleChange} loading={loading || uploading} 
                        />
                    </div>

                    {(uploading || loading) && (
                        <div className="flex items-center justify-center pt-2 text-sm text-blue-600 dark:text-blue-400">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {uploading ? "Transfert des fichiers en cours..." : "Soumission du formulaire..."}
                        </div>
                    )}
                </fieldset>

                {/* ACTIONS (Inchangé) */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="
                            bg-gray-100 dark:bg-gray-700
                            hover:bg-gray-200 dark:hover:bg-gray-600
                            !text-black dark:text-white 
                            border border-gray-300 dark:border-gray-600
                            rounded-lg
                        "
                        disabled={loading || uploading}
                    >
                        Annuler
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={loading} // Utilise seulement 'loading' ici
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Soumission en cours...
                            </>
                        ) : editingUser ? "Mettre à jour" : "Créer l'utilisateur"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}