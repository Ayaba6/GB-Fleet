// src/components/ProfileMenu.jsx
import React, { useState } from "react";
import { LogOut, User } from "lucide-react";
import { supabase } from "../config/supabaseClient.js";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="relative">
      {/* Bouton icône profil */}
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
      >
        <User size={22} />
      </button>

      {/* Menu déroulant */}
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 border dark:border-gray-700 p-2 z-50">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
