import React, { useState, useEffect } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Loader2, Plus, Wrench, Droplet } from "lucide-react";
import { Button } from "./ui/button.jsx";
import { useToast } from "./ui/use-toast.jsx";

const MAINTENANCE_TYPES = {
    VIDANGE: "vidange",
    REPARATION: "reparation",
};

export default function MaintenanceSection({ camions }) {
    const { toast } = useToast();
    const [selectedCamion, setSelectedCamion] = useState(null);
    const [maintenances, setMaintenances] = useState([]);
    const [loading, setLoading] = useState(false);

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
            toast({
                title: "Erreur de chargement",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCamion) fetchMaintenances(selectedCamion.id);
        else setMaintenances([]);
    }, [selectedCamion]);

    const handleAdd = async () => {
        if (!selectedCamion || !description || !date) {
            toast({
                title: "Erreur",
                description: "Veuillez remplir la description et la date.",
                variant: "destructive",
            });
            return;
        }

        try {
            const { data, error } = await supabase
                .from("maintenance")
                .insert([{ camion_id: selectedCamion.id, type, description, date }])
                .select();

            if (error) throw error;

            setMaintenances((prev) => [data[0], ...prev]);
            setDescription("");

            toast({
                title: "Ajouté",
                description: "Maintenance enregistrée avec succès.",
                variant: "success",
            });
        } catch (err) {
            toast({
                title: "Erreur d'ajout",
                description: err.message,
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-6 w-full p-4 md:p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg">

            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2 border-b pb-3 border-gray-200 dark:border-gray-800">
                <Wrench size={24} className="text-blue-600 dark:text-blue-400" />
                Gestion Maintenance du Parc
            </h2>

            {/* Sélection camion */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <label className="font-semibold text-gray-700 dark:text-gray-300 min-w-[150px]">
                    Sélectionner un camion :
                </label>

                <select
                    value={selectedCamion?.id || ""}
                    onChange={(e) =>
                        setSelectedCamion(camions.find((c) => c.id === e.target.value))
                    }
                    className="p-2 border border-gray-300 rounded-md shadow-sm
                               bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                    <option value="">-- Sélectionnez un camion --</option>
                    {camions.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.immatriculation} ({c.type})
                        </option>
                    ))}
                </select>
            </div>

            {!selectedCamion && (
                <div className="text-gray-500 dark:text-gray-400 py-20 text-center border border-dashed rounded-lg">
                    Veuillez sélectionner un camion pour afficher la maintenance.
                </div>
            )}

            {selectedCamion && (
                <>
                    {/* Formulaire ajout */}
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 shadow-inner">
                        <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Plus size={18} className="text-green-600 dark:text-green-500" />
                            Enregistrer une nouvelle intervention
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:items-end">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Type
                                </label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="p-2 border border-gray-300 rounded-md bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 w-full"
                                >
                                    <option value={MAINTENANCE_TYPES.VIDANGE}>Vidange</option>
                                    <option value={MAINTENANCE_TYPES.REPARATION}>Réparation</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ex: Remplacement filtre à huile"
                                    className="p-2 border border-gray-300 rounded-md bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 w-full"
                                />
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="p-2 border border-gray-300 rounded-md bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 w-full"
                                />
                            </div>

                            <Button
                                onClick={handleAdd}
                                disabled={loading}
                                className="w-full md:w-auto h-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white flex items-center gap-2"
                            >
                                <Plus size={16} /> Enregistrer
                            </Button>
                        </div>
                    </div>

                    {/* Liste */}
                    <div className="mt-6">
                        <h3 className="font-bold text-lg mb-3 text-gray-800 dark:text-gray-100">
                            Historique des interventions ({maintenances.length})
                        </h3>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
                            </div>
                        ) : maintenances.length === 0 ? (
                            <div className="text-gray-500 dark:text-gray-400 py-10 text-center border rounded-lg">
                                Aucune maintenance enregistrée.
                            </div>
                        ) : (
                            <div className="overflow-x-auto shadow-md rounded-lg border border-gray-300 dark:border-gray-700">
                                <table className="min-w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                        <tr>
                                            <th className="p-3 border-r border-gray-300 dark:border-gray-600 w-1/5">
                                                Type
                                            </th>
                                            <th className="p-3 border-r border-gray-300 dark:border-gray-600 w-3/5">
                                                Description
                                            </th>
                                            <th className="p-3 w-1/5">Date</th>
                                        </tr>
                                    </thead>

                                    <tbody className="text-gray-900 dark:text-gray-200">
                                        {maintenances.map((m) => (
                                            <tr
                                                key={m.id}
                                                className="border-b border-gray-200 dark:border-gray-700 even:bg-gray-50 dark:even:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <td className="p-3 flex items-center gap-2 border-r border-gray-200 dark:border-gray-700 font-medium">
                                                    {m.type === MAINTENANCE_TYPES.VIDANGE ? (
                                                        <Droplet size={16} className="text-amber-600 dark:text-amber-400" />
                                                    ) : (
                                                        <Wrench size={16} className="text-red-600 dark:text-red-400" />
                                                    )}
                                                    {m.type.charAt(0).toUpperCase() + m.type.slice(1)}
                                                </td>

                                                <td className="p-3 border-r border-gray-200 dark:border-gray-700">
                                                    {m.description}
                                                </td>

                                                <td className="p-3 font-mono">
                                                    {m.date}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
