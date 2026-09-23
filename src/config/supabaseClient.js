// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js'

// Utilisation des variables d'environnement de Vite (VITE_ prefixe)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Vérification simple (utile pour le débogage)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Les variables VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ne sont pas définies dans votre fichier .env.local.")
}

// Crée le client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)