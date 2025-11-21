import React, { useState, useEffect, useCallback } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../config/supabaseClient.js'; // Assurez-vous que le chemin est correct
import Logo from '../assets/logo.png'; // Assurez-vous que le chemin est correct
import Vehicles from '../assets/img-illust.png'; // Assurez-vous que le chemin est correct
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Loader2 } from 'lucide-react';

// --- Composant d'activation/désactivation du Mode Sombre ---
const DarkModeToggle = ({ darkMode, setDarkMode }) => (
    <button
        onClick={() => setDarkMode(!darkMode)}
        aria-label={darkMode ? "Passer en mode clair" : "Passer en mode sombre"}
        // Bouton légèrement plus grand pour une meilleure accessibilité (p-3 et icônes size={18})
        className="absolute top-6 right-6 p-3 rounded-full bg-gray-200/70 dark:bg-gray-700/70 text-gray-800 dark:text-gray-200 backdrop-blur-sm shadow-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors z-10"
    >
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
    </button>
);

export default function AuthPage() {
    // État initial basé sur les préférences système de l'utilisateur
    const [darkMode, setDarkMode] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);
    const [session, setSession] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // --- 1. Gestion de la session et du Mode Sombre global ---
    useEffect(() => {
        // Applique ou retire la classe 'dark' sur l'élément <html>
        document.documentElement.classList.toggle('dark', darkMode);

        // Récupère la session initiale et configure l'écouteur des changements d'état
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
        };
        fetchSession();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
        });

        // Fonction de nettoyage
        return () => listener?.subscription.unsubscribe();
    }, [darkMode]); // Le mode sombre est la seule dépendance ici.

    // --- Fonction de vérification de profil et d'autorisation (useCallback) ---
    const verifyProfile = useCallback(async (currentSession) => {
        try {
            setLoadingProfile(true);
            setError(null);

            // OPTIMISATION : Sélectionner uniquement les colonnes nécessaires
            const { data, error: dbError } = await supabase
                .from('profiles')
                .select('role, active')
                .eq('id', currentSession.user.id)
                .single();

            // Gestion des erreurs de base de données ou profil introuvable
            if (dbError || !data) {
                setError("Profil utilisateur introuvable ou erreur de base de données. Déconnexion forcée.");
                await supabase.auth.signOut();
                return;
            }

            // Gestion de l'état du compte
            if (!data.active) {
                setError("Compte désactivé par l'administrateur. Veuillez contacter le support. Déconnexion forcée.");
                await supabase.auth.signOut();
                return;
            }

            // Redirection en fonction du rôle
            switch (data.role) {
                case 'admin': navigate('/dashboard'); break;
                case 'superviseur': navigate('/missions'); break;
                case 'chauffeur': navigate('/chauffeur'); break;
                default: 
                    setError("Rôle utilisateur non reconnu. Déconnexion forcée.");
                    await supabase.auth.signOut(); 
                    break;
            }
        } catch (err) {
            setError("Une erreur inattendue est survenue lors de la vérification du profil.");
            console.error("Erreur de vérification de profil:", err);
            await supabase.auth.signOut(); // Sécurité: déconnecter en cas d'erreur non gérée
        } finally {
            setLoadingProfile(false);
        }
    }, [navigate]);

    // --- 2. Déclenchement de la vérification lors du changement de session ---
    useEffect(() => {
        if (session) {
            // Un petit délai pour s'assurer que l'UI de Supabase a bien mis à jour son état
            // et que le loader est visible, améliorant l'UX.
            const timeout = setTimeout(() => {
                verifyProfile(session);
            }, 100); 
            return () => clearTimeout(timeout);
        }
    }, [session, verifyProfile]);

    // --- Styles d'interface de Supabase (pour le Dark Mode) ---
    const supabaseThemeVariables = darkMode ? {
        default: {
            colors: {
                brand: 'hsl(214.3 31.8% 91.4%)', // Background clair du Dark Mode (Gray-800)
                brandAccent: 'hsl(214.3 31.8% 91.4%)', 
                inputBackground: '#1F2937', // Gray-800 pour les inputs
                inputBorder: '#374151', // Gray-700
                inputLabel: '#F3F4F6', // Gray-100 pour les labels
                inputPlaceholder: '#9CA3AF', // Gray-400
                defaultButtonBackground: '#1D4ED8', // Blue-700
                defaultButtonHoverBackground: '#2563EB', // Blue-600
                defaultButtonText: 'white',
                defaultButtonBorder: '#1D4ED8',
                messageText: '#F3F4F6', // Texte d'information
                messageBackground: '#374151', // Background des messages
            },
            // Le style des boutons peut rester commun pour le style général
        },
    } : {};
    
    // --- Rendu du Composant ---
    // Si la session existe et qu'on ne vérifie pas encore le profil, on affiche directement le loader
    const showAuthUI = !session || (session && error);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300 p-4">
            <div className="
                flex flex-col md:flex-row 
                bg-white dark:bg-gray-800 
                rounded-2xl 
                shadow-xl 
                overflow-hidden max-w-7xl 
                w-[95%] md:w-full 
                h-auto min-h-[500px] 
                mx-auto transition-all duration-300 ease-in-out
            ">

                {/* 1. Formulaire (Conteneur principal pour le chargement : relative) */}
                <div className="
                    md:w-1/2 flex flex-col justify-center items-center py-8 px-6 sm:px-10 relative 
                    h-full min-h-[500px]
                ">
                    <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />

                    <div className="w-full max-w-md">
                        <div className="flex flex-col items-center mb-8">
                            <img src={Logo} alt="GB-Fleet Logo" className="h-16 w-16 mb-4 animate-pulse-slow"/>
                            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 text-center">Connexion Sécurisée</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 text-center text-sm">Seuls les comptes autorisés par l’administrateur peuvent se connecter</p>
                        </div>

                        {/* Affichage des erreurs de vérification de profil */}
                        {error && <div className="mb-6 p-4 rounded-lg bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-100 text-sm font-medium text-center border border-red-300 dark:border-red-700" role="alert">{error}</div>}

                        {/* Loader pendant la vérification du profil */}
                        {session && loadingProfile && (
                            <div className="
                                absolute inset-0 
                                flex flex-col items-center justify-center 
                                bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm 
                                z-20 transition-opacity duration-300
                                text-blue-600 dark:text-blue-400 font-medium space-y-3
                            ">
                                <Loader2 className="animate-spin h-8 w-8" />
                                <span className="text-lg">Vérification du profil et des autorisations en cours...</span>
                            </div>
                        )}
                        
                        {/* Affichage du formulaire d'authentification */}
                        {showAuthUI && (
                            <Auth
                                supabaseClient={supabase}
                                appearance={{
                                    theme: ThemeSupa,
                                    variables: supabaseThemeVariables, // Application des variables de thème Dark Mode
                                    style: {
                                        // Styles génériques pour le ThemeSupa (boutons, inputs)
                                        button: { backgroundColor: '#1D4ED8', color: 'white', fontWeight: 'bold', borderRadius: '0.5rem', padding: '0.75rem' },
                                        input: { padding: '0.75rem', transition:'border-color 0.2s', borderColor: darkMode ? '#374151' : 'hsl(210 20% 90%)' }
                                    }
                                }}
                                localization={{
                                    variables: {
                                        sign_in: {
                                            email_label: "Adresse Email",
                                            password_label: "Mot de Passe",
                                            button_label: "Se Connecter"
                                        },
                                        forgotten_password: {
                                            email_label: "Adresse Email",
                                            password_label: "Nouveau Mot de Passe",
                                            button_label: "Réinitialiser le mot de passe",
                                            link_text: "Mot de passe oublié ?"
                                        },
                                        social_provider_text: "",
                                        sign_up: { link_text: "" } // supprime lien création compte
                                    }
                                }}
                                providers={[]}
                                view="sign_in"
                                // L'appel à verifyProfile est maintenant géré par l'useEffect basé sur `session`
                                // Nous laissons le onSignIn standard de Supabase mettre à jour la session
                                onSignIn={async (data) => {
                                    if (data?.session) {
                                        setSession(data.session); // Met à jour l'état de session, ce qui déclenchera l'useEffect
                                    }
                                }}
                            />
                        )}

                        <div className="mt-10 text-center text-gray-400 dark:text-gray-500 text-xs">
                            &copy; {new Date().getFullYear()} GB-Fleet. Tous droits réservés.
                        </div>
                    </div>
                </div>

                {/* 2. Illustration Flotte */}
                <div className="md:w-1/2 hidden md:flex items-center justify-center bg-blue-600 dark:bg-gray-900 p-8"> 
                    <img 
                        src={Vehicles} 
                        alt="Illustration flotte" 
                        className="h-full w-auto object-contain" 
                    />
                </div>
            </div>
        </div>
    );
}