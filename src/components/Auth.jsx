// src/components/Auth.jsx
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../config/supabaseClient.js';
import Logo from '../assets/logo.png';
import Vehicles from '../assets/vehicles.png';
import { useState, useEffect } from 'react';

export default function AuthPage() {
  const [darkMode, setDarkMode] = useState(false);

  // Applique le dark mode sur <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900 overflow-hidden">

      {/* Partie gauche : Formulaire */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white dark:bg-gray-800 shadow-xl animate-slide-fade-left relative">
        <div className="w-full max-w-md">

          {/* Toggle Dark/Light */}
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-3 py-1 border rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
              {darkMode ? "Mode Clair" : "Mode Sombre"}
            </button>
          </div>

          {/* Logo et titre */}
          <div className="flex flex-col items-center mb-6">
            <img src={Logo} alt="GB-Fleet Logo" className="h-16 w-16 mb-4" />
            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">GB-Fleet</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2 text-center">
              Portail de connexion sécurisé
            </p>
          </div>

          {/* Message explicatif */}
          <p className="text-gray-700 dark:text-gray-300 italic mb-6 text-center text-sm">
            Seuls les comptes créés par l’administrateur sont autorisés à se connecter.
          </p>

          {/* Formulaire Supabase */}
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              style: {
                button: { backgroundColor: '#1D4ED8', color: 'white', fontWeight: 'bold' },
                input: { borderRadius: '0.5rem', borderColor: '#CBD5E0' },
              },
            }}
            localization={{
              variables: {
                sign_in: {
                  email_label: "Adresse Email",
                  password_label: "Mot de Passe",
                  button_label: "Se Connecter",
                },
              },
            }}
            providers={[]} // Pas de login externe
            view="sign_in"
          />

          {/* Footer */}
          <div className="mt-6 text-center text-gray-400 dark:text-gray-400 text-xs">
            &copy; {new Date().getFullYear()} GB-Fleet. Tous droits réservés.
          </div>
        </div>
      </div>

      {/* Partie droite : Image véhicules */}
      <div className="hidden lg:flex flex-1 bg-blue-50 dark:bg-gray-900 items-center justify-center animate-slide-fade-right">
        <img src={Vehicles} alt="Véhicules GB-Fleet" className="h-3/4 object-contain" />
      </div>
    </div>
  );
}
