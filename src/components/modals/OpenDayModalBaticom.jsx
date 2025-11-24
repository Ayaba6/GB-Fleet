import React, { useState } from "react";
// Correction du chemin d'accès pour Supabase
import { supabase } from "../../config/supabaseClient.js"; 
// Correction des chemins d'accès pour les composants UI
import { Button } from "../../components/ui/button.jsx"; 
import { useToast } from "../../components/ui/use-toast.jsx";
import { Loader2, X, Truck, User, Fuel } from "lucide-react";

const BASE_INPUT_STYLE = "w-full border rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors";

export default function OpenDayModalBaticom({ setShowModal, fetchJournees, chauffeurs = [], camions = [] }) {
    const { toast } = useToast(); // Hook pour afficher des notifications
    const [chauffeurId, setChauffeurId] = useState("");
    const [camionId, setCamionId] = useState("");
    const [fuelRestant, setFuelRestant] = useState("");
    const [fuelComplement, setFuelComplement] = useState("");
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState(null);

    // Filtrer les camions BATICOM disponibles
    const baticomCamions = camions.filter(c => c.structure === "BATICOM" && c.statut === "Disponible");
    
    // Filtrer les chauffeurs BATICOM
    const baticomChauffeurs = chauffeurs.filter(c => c.structure === "BATICOM");

    const handleCreate = async () => {
        setFormError(null);

        if (!chauffeurId || !camionId) {
            setFormError("Veuillez sélectionner un chauffeur et un camion.");
            return;
        }

        setLoading(true);

        try {
            // 1. Vérifier si une journée ouverte existe déjà pour ce chauffeur
            // Correction de l'erreur de chaînage .eq().eq() en utilisant .match({})
            const { data: existing, error: checkError } = await supabase
                .from("journee_chauffeur")
                .select("id")
                .match({ 
                    chauffeur_id: chauffeurId,
                    statut: "ouverte"
                });

            if (checkError) throw new Error("Erreur lors de la vérification des journées existantes: " + checkError.message);

            if (existing?.length > 0) {
                setFormError("Ce chauffeur a déjà une journée ouverte. Veuillez la clôturer avant d’en créer une nouvelle.");
                setLoading(false);
                return;
            }

            // 2. Créer la nouvelle journée
            const { error: insertError } = await supabase.from("journee_chauffeur").insert([
                {
                    chauffeur_id: chauffeurId,
                    camion_id: camionId,
                    fuel_restant: Number(fuelRestant) || 0,
                    fuel_complement: Number(fuelComplement) || 0,
                    statut: "ouverte",
                    structure: "BATICOM",
                    date: new Date().toISOString().split("T")[0],
                },
            ]);

            if (insertError) throw insertError;

            // 3. Mettre à jour le statut du camion à 'En cours de mission'
            const { error: updateCamionError } = await supabase
                .from("camions")
                .update({ statut: "En mission" })
                .eq("id", camionId);

            if (updateCamionError) {
                // Log l'erreur mais on ne bloque pas, la journée est déjà ouverte.
                console.error("Erreur de mise à jour du statut du camion :", updateCamionError.message);
                toast({ title: "Alerte", description: "Journée ouverte, mais le statut du camion n'a pas pu être mis à jour.", variant: "warning" });
            }

            toast({ title: "🎉 Journée Ouverte", description: "La journée de travail BATICOM a été démarrée avec succès." });
            setShowModal(false);
            fetchJournees();
        } catch (error) {
            setFormError(error.message);
            toast({ title: "❌ Erreur Critique", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-6 transform transition-all duration-300 scale-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* En-tête */}
                <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
                    <h2 className="text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                        <User className="w-6 h-6"/> Ouvrir Journée BATICOM
                    </h2>
                    <Button 
                        variant="ghost" 
                        onClick={() => setShowModal(false)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                        <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </Button>
                </div>

                {/* Erreur */}
                {formError && (
                    <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-300 dark:border-red-700">
                        {formError}
                    </div>
                )}

                {/* Formulaire */}
                <div className="flex flex-col gap-5">
                    {/* Chauffeur */}
                    <div className="space-y-1">
                        <label className="block font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <User size={18} className="text-indigo-500"/> Chauffeur
                        </label>
                        <select
                            value={chauffeurId}
                            onChange={(e) => setChauffeurId(e.target.value)}
                            className={BASE_INPUT_STYLE}
                            required
                        >
                            <option value="">-- Sélectionner un chauffeur BATICOM --</option>
                            {baticomChauffeurs.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Camion */}
                    <div className="space-y-1">
                        <label className="block font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <Truck size={18} className="text-indigo-500"/> Camion
                        </label>
                        <select
                            value={camionId}
                            onChange={(e) => setCamionId(e.target.value)}
                            className={BASE_INPUT_STYLE}
                            required
                        >
                            <option value="">-- Sélectionner un camion BATICOM disponible --</option>
                            {baticomCamions.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.immatriculation} ({c.marquemodele})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Seuls les camions BATICOM avec le statut 'Disponible' sont affichés.
                        </p>
                    </div>

                    {/* Fuel Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t dark:border-gray-700">
                        <div className="space-y-1">
                            <label className="block font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                <Fuel size={18} className="text-green-500"/> Fuel restant (L)
                            </label>
                            <input
                                type="number"
                                value={fuelRestant}
                                onChange={(e) => setFuelRestant(e.target.value)}
                                className={BASE_INPUT_STYLE}
                                min="0"
                                placeholder="Litres restants"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                <Fuel size={18} className="text-yellow-500"/> Fuel complément (L)
                            </label>
                            <input
                                type="number"
                                value={fuelComplement}
                                onChange={(e) => setFuelComplement(e.target.value)}
                                className={BASE_INPUT_STYLE}
                                min="0"
                                placeholder="Litres ajoutés"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                    <Button 
                        type="button" 
                        onClick={() => setShowModal(false)}
                        className="
                            bg-gray-100 dark:bg-gray-700
                            hover:bg-gray-200 dark:hover:bg-gray-600
                            !text-black dark:text-white 
                            border border-gray-300 dark:border-gray-600
                        "
                    >
                        Annuler
                    </Button>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white"
                        onClick={handleCreate}
                        disabled={loading || !chauffeurId || !camionId}
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ouverture en cours...</>
                        ) : (
                            "Ouvrir la journée"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}