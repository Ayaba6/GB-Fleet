// src/pages/AdminAppRouter.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout.jsx'; 

// Importez TOUTES vos sections ici
import UserSection from '../components/UserSection.jsx';
import CamionsSection from '../components/CamionsSection.jsx';
import MissionsSectionAdmin from '../components/MissionsSectionAdmin.jsx';
import AlertesExpirationCardsStyled from '../components/AlertesExpiration.jsx'; // ⚠️ Vérifiez le nom du fichier
import PannesDeclareesCards from '../components/PannesDeclarees.jsx'; // ⚠️ Ajoutez les imports manquants
// import AutresSections from '...'; 

// Ce composant est le routeur principal pour les administrateurs
export default function AdminAppRouter({ session }) {
    // La session n'est pas utilisée ici, mais elle pourrait servir à passer 
    // des données utilisateur au Layout si nécessaire (ex: user={session.user})

    return (
        <Routes>
            {/* Route Parent : Le AdminLayout englobe la Sidebar et l'Outlet */}
            <Route element={<AdminLayout user={session.user} />}>
                
                {/* 1. Page d'Accueil par défaut (index) */}
                <Route index element={<UserSection />} />
                <Route path="dashboard" element={<UserSection />} />

                {/* 2. Routes des Sections complètes (utilisées par la Sidebar) */}
                <Route path="utilisateurs" element={<UserSection />} />
                <Route path="flotte" element={<CamionsSection />} />
                <Route path="missions" element={<MissionsSectionAdmin />} />
                <Route path="pannes" element={<PannesDeclareesCards />} />
                <Route path="alertes-exp" element={<AlertesExpirationCardsStyled />} />
                
                {/* Ajoutez les chemins pour 'documents' et 'facturation' ici */}
                {/* <Route path="documents" element={<DocumentsSection />} /> */}
                {/* <Route path="facturation" element={<FacturationSection />} /> */}


                {/* 3. Route de secours : Redirige vers la page d'accueil en cas de route inconnue */}
                {/* La Navigate utilise un chemin relatif, donc "dashboard" est correct ici */}
                <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>
        </Routes>
    );
}