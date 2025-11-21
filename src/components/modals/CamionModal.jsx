import React, { useState, useEffect, createContext, useContext } from "react"; 
import { Loader2, Upload, Camera, FileText, Trash2 } from "lucide-react";

// --- Dépendances Mockées ---
const supabase = {
    from: (table) => ({
        update: (payload) => ({ eq: (field, value) => ({ error: null }) }),
        insert: (payload) => ({ error: null }),
    }),
    storage: {
        from: (bucket) => ({
            upload: (path, file, options) => ({ error: null }),
            getPublicUrl: (path) => ({ data: { publicUrl: `https://mock-url.com/${path}` } }),
        }),
    },
};

const ToastContext = createContext(() => {});
const useToast = () => useContext(ToastContext);
const MockToastProvider = ({ children }) => {
    const toast = ({ title, description, variant }) => console.log(`[Toast ${variant || 'default'}] ${title}: ${description}`);
    return <ToastContext.Provider value={{ toast }}>{children}</ToastContext.Provider>;
};

// --- Composants UI ---
const Button = ({ children, onClick, variant = 'default', className = '', disabled = false, type = 'button', ...props }) => {
    let baseStyle = 'px-4 py-2 font-semibold rounded-lg transition duration-150 ease-in-out shadow-sm';
    if (variant === 'outline') {
        // Style 'outline' : texte noir en mode clair, gris clair en mode sombre
        baseStyle += ' bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-black dark:text-gray-100 border border-gray-300 dark:border-gray-600';
    } else {
        // Style 'default' (principal) : texte blanc
        baseStyle += ' bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white';
    }
    if (disabled) baseStyle += ' opacity-50 cursor-not-allowed';
    return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${className}`} {...props}>{children}</button>;
};

// --- Modal réutilisable ---
const Modal = ({ children, onClose }) => {
    useEffect(() => {
        const handleEsc = (event) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-0" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
};

// --- Styles ---
const BASE_INPUT_STYLE = `
    w-full p-2.5 rounded-lg border 
    border-gray-300 dark:border-gray-600 
    bg-gray-50 dark:bg-gray-700 
    text-gray-900 dark:text-gray-100 
    focus:ring-blue-500 focus:border-blue-500 
    transition-all duration-200
`;

// --- FileUploadField identique au UserModal ---
const FileUploadField = ({ field, label, expField, form, handleChange, handleClearFile, loading, icon }) => {
    const fileUploaded = form[field] && form[field].startsWith('http');
    return (
        <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 transition-colors">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {icon} {label}
            </label>
            <div className="flex flex-col gap-2">
                <input type="file" id={`file-${field}`} name={field} onChange={handleChange} disabled={loading} className="hidden"/>
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
                    <Upload size={16} className="mr-2"/>
                    {fileUploaded ? `Fichier chargé (${label})` : `Charger un fichier ${label}`}
                </label>

                {fileUploaded && (
                    <a href={form[field]} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 text-xs hover:underline truncate transition-colors">
                        Voir le document actuel
                    </a>
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

// --- CamionModal ---
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

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (files?.length) uploadFile(name, files[0]);
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
                {/* Informations du Camion */}
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

                {/* Documents */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FileUploadField field="photourl" label="Photo du Camion" icon={<Camera size={16}/>} form={form} handleChange={handleChange} handleClearFile={handleClearFile} loading={loading}/>
                    <FileUploadField field="cartegriseurl" label="Carte Grise" icon={<FileText size={16}/>} expField="cartegriseexpiry" form={form} handleChange={handleChange} handleClearFile={handleClearFile} loading={loading}/>
                    <FileUploadField field="assuranceurl" label="Assurance" icon={<FileText size={16}/>} expField="assuranceexpiry" form={form} handleChange={handleChange} handleClearFile={handleClearFile} loading={loading}/>
                    <FileUploadField field="visitetechniqueurl" label="Visite Technique" icon={<FileText size={16}/>} expField="visitetechniqueexpiry" form={form} handleChange={handleChange} handleClearFile={handleClearFile} loading={loading}/>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button 
                        type="button" 
                        onClick={() => setShowModal(false)} 
                        variant="outline" // Correction appliquée ici
                        className="rounded-lg"
                    >
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