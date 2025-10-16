// src/api/supabaseClient.js

import { createClient } from '@supabase/supabase-js';

// *** PASO 1: OBTIENE TUS CREDENCIALES DE SUPABASE ***
// Ve a tu proyecto Supabase -> Settings -> API

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Faltan las variables de entorno de Supabase.");
}

// Crea y exporta el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);