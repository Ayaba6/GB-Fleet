// src/components/modals/NewMissionModalGTS.jsx
import React from "react";
import MissionCard from "../MissionCard.jsx";

export default function NewMissionModalGTS({ mission, setShowModal, fetchMissions }) {
    const handleAccept = async () => {
        await fetchMissions(); // Met à jour les missions
        setShowModal(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl max-w-md w-full space-y-4">
                <button onClick={() => setShowModal(false)} className="absolute top-3 right-3 text-gray-700 dark:text-gray-100">X</button>
                <h3 className="text-xl font-bold">Nouvelle Mission</h3>
                <MissionCard mission={mission} onDeclareIncident={() => {}}/>
                <button onClick={handleAccept} className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition">
                    Accepter la Mission
                </button>
            </div>
        </div>
    );
}
