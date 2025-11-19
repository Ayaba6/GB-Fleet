import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export default function DarkModeToggle({ initialDarkMode, setDarkMode }) {
    // Le composant AuthPage doit gérer l'état, mais c'est bien de s'assurer que 
    // l'effet d'application des classes est ici.
    const darkMode = initialDarkMode;

    useEffect(() => {
      // 1. Appliquer la classe 'dark' au body/html pour que Tailwind fonctionne
      document.documentElement.classList.toggle("dark", darkMode);
      
      // 2. Sauvegarder la préférence de l'utilisateur
      localStorage.setItem("darkMode", darkMode);
    }, [darkMode]);

    // La transparence est gérée par bg-gray-200/70 et backdrop-blur-sm
    return (
        <button
            onClick={() => setDarkMode(!darkMode)}
            aria-label={darkMode ? "Passer en mode clair" : "Passer en mode sombre"}
            className={`
                p-2 rounded-full                             /* Padding ajusté pour un look rond */
                bg-gray-200/70 dark:bg-gray-700/70          /* Semi-transparent (70% opacité) */
                text-gray-800 dark:text-gray-200
                backdrop-blur-sm shadow-md                  /* Effet de flou */
                hover:bg-gray-300 dark:hover:bg-gray-600
                transition-colors 
            `}
        >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
    );
}