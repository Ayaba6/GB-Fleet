// src/components/modals/CreateMissionModalGTS.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { X, MapPin, Truck, CalendarCheck, Check, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button.jsx";

export default function CreateMissionModalGTS({ chauffeurs, camions, setShowModal, fetchMissionsAdmin }) {
    const [title, setTitle] = useState("");
    const [depart, setDepart] = useState("");
    const [destination, setDestination] = useState("");
    const [chauffeurId, setChauffeurId] = useState("");
    const [camionId, setCamionId] = useState("");
    const [tonnage, setTonnage] = useState("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD

    if (!chauffeurs || !camions) return null;

    const handleCreate = async () => {
        if (!title || !depart || !destination || !chauffeurId || !camionId) {
            alert("Veuillez remplir tous les champs obligatoires.");
            return;
        }

        try {
            const { data, error } = await supabase
                .from("missions_gts")
                .insert([
                    {
                        titre: title,
                        depart,
                        destination,
                        chauffeur_id: chauffeurId,
                        camion_id: camionId,
                        tonnage: parseFloat(tonnage) || 0,
                        date,
                        statut: "Affectée", // clé pour que le chauffeur voie la mission
                        structure: "GTS",
                        created_at: new Date().toISOString()
                    }
                ]);

            if (error) throw error;
            console.log("Mission créée :", data[0]);
            fetchMissionsAdmin(); // met à jour le dashboard admin
            setShowModal(false);
        } catch (err) {
            console.error("Erreur création mission :", err.message);
            alert("Erreur lors de la création de la mission : " + err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scaleIn overflow-y-auto max-h-[90vh]">
                
                {/* En-tête */}
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 className="text-2xl font-bold text-blue-900">
                        Créer une Nouvelle Mission
                    </h2>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Alerte */}
                <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-3 mb-4 rounded flex items-center gap-2">
                    <AlertTriangle size={18} /> Mission urgente : affectée immédiatement
                </div>

                {/* Formulaire */}
                <div className="space-y-3 text-gray-700">
                    <DetailInput label="Titre" value={title} setValue={setTitle} placeholder="Mission Livraison Lomé" />
                    <DetailInput label="Départ" value={depart} setValue={setDepart} placeholder="Ouaga" />
                    <DetailInput label="Destination" value={destination} setValue={setDestination} placeholder="Lomé" />
                    <DetailSelect label="Chauffeur" value={chauffeurId} setValue={setChauffeurId} options={chauffeurs.map(c => ({ id: c.id, name: c.name }))} />
                    <DetailSelect label="Camion" value={camionId} setValue={setCamionId} options={camions.map(c => ({ id: c.id, name: c.immatriculation }))} />
                    <DetailInput label="Tonnage prévu" value={tonnage} setValue={setTonnage} type="number" placeholder="10" />
                    <DetailInput label="Date" value={date} setValue={setDate} type="date" />
                </div>

                {/* Bouton création */}
                <div className="mt-6">
                    <Button onClick={handleCreate} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg">
                        <Check size={20} className="mr-2" /> Créer la Mission
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Composants utilitaires
const DetailInput = ({ label, value, setValue, type = "text", placeholder }) => (
    <div className="flex flex-col">
        <span className="font-medium text-gray-600 mb-1">{label}</span>
        <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    </div>
);

const DetailSelect = ({ label, value, setValue, options }) => (
    <div className="flex flex-col">
        <span className="font-medium text-gray-600 mb-1">{label}</span>
        <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            <option value="">Sélectionner</option>
            {options.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
        </select>
    </div>
);
