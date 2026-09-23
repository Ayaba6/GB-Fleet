import React, { useState, useEffect } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Loader2, Plus, Wrench, Droplet, CarFront } from "lucide-react";
import { Button } from "./ui/button.jsx";
import { toast } from "react-hot-toast"; // Utilisation de react-hot-toast pour cohérence avec le dashboard

const MAINTENANCE_TYPES = {
    VIDANGE: "vidange",
    REPARATION: "reparation",
};

export default function MaintenanceSection({ camions = [] }) {
    const [selectedCamion, setSelectedCamion] = useState(null);
    const [maintenances, setMaintenances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [type, setType] = useState(MAINTENANCE_TYPES.VIDANGE);
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

    const fetchMaintenances = async (camionId) => {
        if (!camionId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("maintenance")
                .select("*")
                .eq("camion_id", camionId)
                .order("date", { ascending: false });

            if (error) throw error;
            setMaintenances(data || []);
        } catch (err) {
            console.error("Erreur maintenance:", err.message);
            toast.error("Impossible de charger l'historique");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCamion?.id) {
            fetchMaintenances(selectedCamion.id);
        } else {
            setMaintenances([]);
        }
    }, [selectedCamion]);

    const handleAdd = async () => {
        if (!selectedCamion || !description.trim() || !date) {
            toast.error("Veuillez remplir tous les champs.");
            return;
        }

        setIsSubmitting(true);
        try {
            // On récupère la structure du camion pour l'enregistrer avec la maintenance
            const { data, error } = await supabase
                .from("maintenance")
                .insert([{ 
                    camion_id: selectedCamion.id, 
                    type, 
                    description: description.trim(), 
                    date,
                    structure: selectedCamion.structure // Liaison importante pour le futur
                }])
                .select();

            if (error) throw error;

            setMaintenances((prev) => [data[0], ...prev]);
            setDescription("");
            toast.success("Maintenance enregistrée");
        } catch (err) {
            toast.error("Erreur lors de l'enregistrement");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Wrench size={24} className="text-blue-600" />
                    Maintenance du Parc {selectedCamion?.structure ? `(${selectedCamion.structure})` : ""}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Gérez les vidanges et réparations de vos véhicules</p>
            </div>

            {/* Sélection camion */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <CarFront className="text-gray-400" size={20} />
                    <label className="font-bold text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        Véhicule :
                    </label>
                </div>

                <select
                    value={selectedCamion?.id || ""}
                    onChange={(e) => setSelectedCamion(camions.find((c) => c.id === e.target.value))}
                    className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                    <option value="">-- Choisissez un véhicule --</option>
                    {camions.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.immatriculation} - {c.marquemodele || c.type || "Camion"}
                        </option>
                    ))}
                </select>
            </div>

            {!selectedCamion ? (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 border-2 border-dashed border-blue-200 dark:border-blue-800 py-20 text-center rounded-2xl">
                    <Wrench className="mx-auto text-blue-300 mb-4" size={48} />
                    <p className="text-blue-600 dark:text-blue-400 font-medium">Sélectionnez un camion pour gérer sa maintenance.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Formulaire d'ajout */}
                    <div className="lg:col-span-1 space-y-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-fit">
                        <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                            <Plus size={18} className="text-green-500" />
                            Nouvelle Entrée
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Type d'intervention</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full p-2.5 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                                >
                                    <option value={MAINTENANCE_TYPES.VIDANGE}>Vidange</option>
                                    <option value={MAINTENANCE_TYPES.REPARATION}>Réparation</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Détails de l'intervention..."
                                    className="w-full p-2.5 border rounded-lg dark:bg-gray-900 dark:border-gray-700 min-h-[100px]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full p-2.5 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                                />
                            </div>

                            <Button
                                onClick={handleAdd}
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl font-bold"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : "Enregistrer"}
                            </Button>
                        </div>
                    </div>

                    {/* Historique */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold mb-4 flex justify-between items-center text-gray-800 dark:text-white">
                            <span>Historique {selectedCamion.immatriculation}</span>
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-500">
                                {maintenances.length} intervention(s)
                            </span>
                        </h3>

                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>
                        ) : maintenances.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 border border-dashed rounded-xl">Aucune donnée</div>
                        ) : (
                            <div className="space-y-3">
                                {maintenances.map((m) => (
                                    <div key={m.id} className="flex items-center justify-between p-4 border border-gray-50 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${m.type === 'vidange' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                                                {m.type === 'vidange' ? <Droplet size={20} /> : <Wrench size={20} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm dark:text-white">{m.description}</p>
                                                <p className="text-xs text-gray-500 uppercase font-mono">{m.type}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{new Date(m.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}