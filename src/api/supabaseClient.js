// src/api/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan las variables de entorno de Supabase.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    debug: false,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce',
  },
  // Configuración optimizada para velocidad
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web',
      'Cache-Control': 'no-cache',
    },
  },
  // Timeouts más cortos
  db: {
    schema: 'public',
  },
  // Configuración de red optimizada
  fetch: (url, options = {}) => {
    return fetch(url, {
      ...options,
      // Timeout corto para detección rápida de problemas
      signal: AbortSignal.timeout(2000), // Reducido a 2 segundos
    });
  },
});

// ⬅️ COMENTAR O REMOVER este listener adicional que puede causar duplicados
// supabase.auth.onAuthStateChange((event, session) => {
//   // Solo logs críticos
//   if (event === 'SIGNED_OUT') {
//     console.log('🚪 Sesión cerrada');
//   }
// });

// Detector de problemas de red
window.addEventListener('online', () => {
  console.log('🌐 Conexión restaurada');
});

window.addEventListener('offline', () => {
  console.warn('⚠️ Sin conexión a internet');
});
