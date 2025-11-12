// src/components/modals/NewMissionModalGTS.jsx
import React from 'react';
import { supabase } from "../../config/supabaseClient.js";
import { X, MapPin, Truck, CalendarCheck, Clock, Check, AlertTriangle } from 'lucide-react';

export default function NewMissionModalGTS({ mission, setShowModal, fetchMissions }) {
    if (!mission) return null;

    const handleAction = async (newStatut, updates = {}) => {
        try {
            if (newStatut === 'En Cours') {
                updates.started_at = new Date().toISOString();
            }
            // Envoi de la justification si 'Refusée' (à implémenter si besoin)

            await supabase.from("missions_gts")
                .update({ statut: newStatut, ...updates })
                .eq("id", mission.id);

            // Recharger les données pour mettre à jour le Tableau de Bord
            fetchMissions();
            setShowModal(false);
        } catch (error) {
            console.error(`Erreur ${newStatut} mission:`, error.message);
            alert(`Erreur lors de la mise à jour : ${error.message}`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scaleIn">
                
                {/* En-tête du Modal */}
                <div className="flex justify-between items-start border-b pb-3 mb-4">
                    <h2 className="text-2xl font-bold text-blue-900">
                        Nouvelle Mission Affectée
                    </h2>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                {/* Alerte d'Urgence */}
                <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-3 mb-4 rounded">
                    <p className="font-semibold flex items-center"><AlertTriangle size={18} className="mr-2"/>Départ demandé : **IMMEDIATEMENT**</p>
                </div>

                {/* Détails de la Mission */}
                <div className="space-y-3 text-gray-700">
                    <DetailItem icon={CalendarCheck} label="Titre de la Mission" value={mission.titre || "N/A"} />
                    <DetailItem icon={MapPin} label="Chargement" value={mission.depart || "N/A"} />
                    <DetailItem icon={MapPin} label="Livraison" value={mission.destination || "N/A"} />
                    <DetailItem icon={Truck} label="Chargement" value={mission.description_chargement || "Non spécifié"} />
                    <DetailItem icon={Clock} label="Heure Limite" value={mission.heure_limite ? new Date(mission.heure_limite).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : "N/A"} />
                </div>

                {/* Boutons d'Action */}
                <div className="mt-6 space-y-3">
                    <button
                        onClick={() => handleAction('En Cours')}
                        className="w-full flex items-center justify-center bg-green-600 text-white text-lg font-bold py-3 rounded-lg shadow-lg hover:bg-green-700 transition"
                    >
                        <Check size={20} className="mr-2" /> Démarrer Dès Que Possible
                    </button>
                    
                    {/* Bouton pour reporter ou refuser (implémentation de la justification à ajouter) */}
                    <button
                        onClick={() => handleAction('Refusée')} // Refuser temporairement pour cet exemple
                        className="w-full bg-red-100 text-red-600 py-2 rounded-lg hover:bg-red-200 transition"
                    >
                        Refuser la Mission
                    </button>
                </div>

            </div>
        </div>
    );
}

// Composant utilitaire pour les détails
const DetailItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-start text-sm">
        <Icon size={16} className="text-blue-500 mr-3 mt-1 flex-shrink-0" />
        <div>
            <span className="font-medium block text-gray-500">{label}</span>
            <span className="font-semibold block text-gray-800">{value}</span>
        </div>
    </div>
);