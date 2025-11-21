// src/layouts/AdminLayout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/AdminSidebar.jsx'; // Assurez-vous que le chemin est correct

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      
      {/* 1. Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden transition-all duration-300">
        
        {/* Barre de navigation / Bouton pour ouvrir la sidebar en mode mobile */}
        <header className="sticky top-0 bg-white dark:bg-gray-800 shadow p-4 md:hidden flex justify-between items-center z-10">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-600 dark:text-gray-300"
          >
            Menu
          </button>
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Administration</h1>
        </header>

        {/* 3. Section de Contenu (où la Route enfant s'affiche) */}
        <main className="flex-1 w-full pb-6">
          {/* L'Outlet rendra le composant correspondant à la route (ex: UserSection) */}
          <Outlet /> 
        </main>
      </div>
    </div>
  );
}