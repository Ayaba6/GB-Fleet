/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // ← Activation du mode sombre via une classe
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // Tous tes fichiers React
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
