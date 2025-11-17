import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../config/supabaseClient.js';
import Logo from '../assets/logo.png';
import Vehicles from '../assets/vehicles.png';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Loader2 } from 'lucide-react';

// Toggle Dark Mode
const DarkModeToggle = ({ darkMode, setDarkMode }) => (
  <button
    onClick={() => setDarkMode(!darkMode)}
    aria-label={darkMode ? "Passer en mode clair" : "Passer en mode sombre"}
    className="absolute top-4 right-4 p-2 rounded-full bg-gray-200/70 dark:bg-gray-700/70 text-gray-800 dark:text-gray-200 backdrop-blur-sm shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors z-10"
  >
    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
  </button>
);

export default function AuthPage() {
  const [darkMode, setDarkMode] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [session, setSession] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Session listener global
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener?.subscription.unsubscribe();
  }, [darkMode]);

  // Vérification du profil et redirection
  const verifyProfile = useCallback(async (session) => {
    try {
      setLoadingProfile(true);
      setError(null);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error || !data) { setError("Profil introuvable."); await supabase.auth.signOut(); return; }
      if (!data.active) { setError("Compte désactivé."); await supabase.auth.signOut(); return; }

      // Redirection selon rôle
      switch (data.role) {
        case 'admin': navigate('/dashboard'); break;
        case 'superviseur': navigate('/missions'); break;
        case 'chauffeur': navigate('/chauffeur'); break;
        default: navigate('/'); break;
      }
    } catch (err) {
      setError("Une erreur inattendue est survenue.");
      console.error(err);
    } finally {
      setLoadingProfile(false);
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900 transition-colors duration-300">

      {/* Formulaire */}
      <div className="flex-1 flex flex-col justify-center items-center py-10 px-4 sm:p-8 relative overflow-y-auto">
        <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />

        <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700/50 transition-all duration-300 animate-fadeInUp">
          <div className="flex flex-col items-center mb-8">
            <img src={Logo} alt="GB-Fleet Logo" className="h-16 w-16 mb-4 animate-pulse-slow"/>
            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 text-center">Connexion GB-Fleet</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-center text-sm">Accédez à votre portail professionnel</p>
          </div>

          {error && <div className="mb-6 p-4 rounded-lg bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-100 text-sm font-medium text-center border border-red-300 dark:border-red-700" role="alert">{error}</div>}

          {!session && (
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa, style: { input: { borderColor: 'hsl(210 20% 90%)', padding: '0.75rem', transition:'border-color 0.2s' } } }}
              localization={{ variables: { sign_in:{ email_label:"Adresse Email", password_label:"Mot de Passe", button_label:"Se Connecter" }}}}
              providers={[]}
              view="sign_in"
              // ✅ Nouveau : callback après login
              onSignIn={async (data) => {
                if (data?.session) {
                  await verifyProfile(data.session);
                }
              }}
            />
          )}

          {session && loadingProfile && (
            <div className="mt-6 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 font-medium space-y-2">
              <Loader2 className="animate-spin h-6 w-6" />
              <span>Vérification du profil en cours...</span>
            </div>
          )}

          <div className="mt-10 text-center text-gray-400 dark:text-gray-500 text-xs">
            &copy; {new Date().getFullYear()} GB-Fleet. Tous droits réservés.
          </div>
        </div>
      </div>

      {/* Illustration Flotte */}
      <div className="hidden md:flex flex-1 bg-blue-600 dark:bg-gray-900 items-center justify-center p-8">
        <img src={Vehicles} alt="Illustration de la flotte de véhicules" className="w-auto h-auto max-w-xl max-h-full object-contain mx-auto transition-opacity duration-700"/>
      </div>

    </div>
  );
}
