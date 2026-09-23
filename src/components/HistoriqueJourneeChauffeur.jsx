// src/components/MissionsChauffeur.jsx
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../config/supabaseClient.js";
import { Card, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.jsx";
import { Loader2, CalendarDays, Truck, Eye, Filter } from "lucide-react";
import DetailsJourneeModal from "./modals/DetailsJourneeModal.jsx";

// Constante pour un formatage de date clair
const DATE_FORMAT_OPTIONS = {
    year: "numeric",
    month: "long",
    day: "numeric",
};

export default function MissionsChauffeur({ chauffeurId }) {
    const [missions, setMissions] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [camions, setCamions] = useState([]);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedCamion, setSelectedCamion] = useState("");
    const [selectedMission, setSelectedMission] = useState(null);

    // Charger missions et camions
    const loadData = useCallback(async () => {
        if (!chauffeurId) return;
        setLoading(true);
        try {
            const { data: missionsData, error: missionsError } = await supabase
                .from("journee_baticom")
                .select("*")
                .eq("chauffeur_id", chauffeurId)
                .order("date", { ascending: false });

            if (missionsError) throw missionsError;
            setMissions(missionsData || []);
            setFiltered(missionsData || []);

            const { data: camionsData } = await supabase
                .from("camions")
                .select("id, code")
                .order("code", { ascending: true });

            setCamions(camionsData || []);
        } catch (err) {
            console.error("Erreur chargement missions:", err.message);
        } finally {
            setLoading(false);
        }
    }, [chauffeurId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Appliquer les filtres
    const applyFilters = () => {
        let result = [...missions];
        if (selectedDate) result = result.filter(m => m.date === selectedDate);
        if (selectedCamion) result = result.filter(m => String(m.camion_id) === String(selectedCamion)); 
        setFiltered(result);
    };

    const resetFilters = () => {
        setSelectedDate("");
        setSelectedCamion("");
        setFiltered(missions);
    };

    // Card Mission (Style professionnel amélioré + Dark Mode)
    const CardMission = ({ mission }) => {
        const camionCode = camions.find(c => String(c.id) === String(mission.camion_id))?.code || "N/A";

        const dateDisplay = mission.date
            ? new Date(mission.date).toLocaleDateString("fr-FR", DATE_FORMAT_OPTIONS)
            : "N/A";

        return (
            <Card className="shadow-lg hover:shadow-xl transition-shadow border-l-4 border-blue-600 dark:border-blue-400 dark:bg-gray-800 dark:border dark:border-gray-700">
                <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    {/* Infos Principales */}
                    <div className="space-y-1 mb-3 sm:mb-0">
                        <p className="font-bold text-lg text-blue-800 dark:text-blue-200">
                            <CalendarDays className="inline w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" /> Journée du **{dateDisplay}**
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-400">
                            <Truck className="inline w-4 h-4 mr-2" /> Camion : <span className="font-semibold">{camionCode}</span>
                        </p>
                    </div>

                    {/* Statistiques (Mis en évidence) */}
                    <div className="flex flex-col text-left sm:text-right space-y-1 sm:ml-4">
                        <p className="text-md font-medium dark:text-white">Tonnage : <span className="text-green-600 dark:text-green-400 font-bold">{mission.tonnage || 0} t</span></p>
                        <p className="text-md font-medium dark:text-white">Voyages : <span className="font-bold">{mission.voyages || 0}</span></p>
                    </div>
                    
                    {/* Bouton Détails */}
                    <Button
                        onClick={() => setSelectedMission(mission)}
                        className="mt-3 sm:mt-0 ml-0 sm:ml-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                        size="sm"
                    >
                        <Eye className="w-4 h-4 mr-2" /> Détails
                    </Button>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <h2 className="text-3xl font-extrabold flex items-center gap-3 text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-gray-700">
                <CalendarDays size={28} className="text-blue-600 dark:text-blue-400" /> Mes Missions de Chauffeur
            </h2>

            {/* FILTRES (Dark Mode appliqué) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-inner border border-gray-200 dark:border-gray-700">
                {/* Filtre Date */}
                <div>
                    <label className="text-sm font-medium mb-1 block text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <CalendarDays size={14} /> Date
                    </label>
                    <Input 
                        type="date" 
                        value={selectedDate} 
                        onChange={e => setSelectedDate(e.target.value)} 
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>

                {/* Filtre Camion */}
                <div>
                    <label className="text-sm font-medium mb-1 block text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <Truck size={14} /> Camion
                    </label>
                    <Select value={selectedCamion} onValueChange={setSelectedCamion}>
                        <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <SelectValue placeholder="Choisir un camion" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            {camions.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Boutons d'Action */}
                <div className="flex gap-3 items-end pt-2 md:pt-0">
                    <Button 
                        className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white" 
                        onClick={applyFilters}
                    >
                        <Filter className="w-4 h-4 mr-2" /> Filtrer
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={resetFilters} 
                        className="w-full dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                    >
                        Reset
                    </Button>
                </div>
            </div>

            {/* LISTE DES MISSIONS */}
            <div className="space-y-4 pt-4">
                {loading && (
                    <div className="flex justify-center items-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <Loader2 className="animate-spin w-10 h-10 text-blue-600 dark:text-blue-400" />
                        <span className="ml-3 text-lg text-gray-600 dark:text-gray-300">Chargement des missions...</span>
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="py-10 text-center border-2 border-dashed rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow">
                        <CalendarDays className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500" />
                        <p className="mt-3 text-xl font-semibold text-gray-500 dark:text-gray-400">
                            Aucune mission trouvée
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                            Utilisez les filtres ci-dessus pour rechercher.
                        </p>
                    </div>
                )}

                {!loading && filtered.map(m => <CardMission key={m.id} mission={m} />)}
            </div>

            {/* MODAL DETAILS */}
            {selectedMission && (
                <DetailsJourneeModal
                    journee={selectedMission}
                    setShowModal={setSelectedMission}
                />
            )}
        </div>
    );
}