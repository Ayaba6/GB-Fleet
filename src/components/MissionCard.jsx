// src/components/MissionCard.jsx
import React, { useState } from "react";

export default function MissionCard({ mission, onDeclareIncident }) {
    const [status, setStatus] = useState(mission.statut);

    const handleStart = () => setStatus("En Cours");
    const handleArriveLome = () => setStatus("À Lomé");
    const handleReturnOuaga = () => setStatus("Terminé");

    const handleNavigation = (destination) => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`, "_blank");
    };

    return (
        <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-blue-500 space-y-3">
            <h2 className="text-xl font-bold text-blue-800">{mission.titre}</h2>
            <p><strong>Départ :</strong> {mission.depart}</p>
            <p><strong>Destination :</strong> {mission.destination}</p>
            <p><strong>Status :</strong> {status}</p>

            <div className="space-y-2">
                {status === "Affectée" && (
                    <button onClick={handleStart} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                        Démarrer Mission
                    </button>
                )}
                {status === "En Cours" && (
                    <button onClick={handleArriveLome} className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition">
                        Entrée à Lomé
                    </button>
                )}
                {status === "À Lomé" && (
                    <button onClick={handleReturnOuaga} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                        Retour à Ouaga
                    </button>
                )}
                <button onClick={() => handleNavigation(mission.destination)} className="w-full bg-gray-500 text-white py-2 rounded-lg font-bold hover:bg-gray-600 transition">
                    Navigation
                </button>
                <button onClick={onDeclareIncident} className="w-full bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition">
                    Déclarer Panne / Incident
                </button>
            </div>
        </div>
    );
}
