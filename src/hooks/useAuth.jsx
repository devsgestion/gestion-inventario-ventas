// src/hooks/useAuth.jsx
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { DEBUG_CONFIG } from '../config/debug';

// Helper para logs condicionales
const authLog = (...args) => {
  if (DEBUG_CONFIG.enableAuthLogs) console.log(...args);
};

const AuthContext = createContext(null);

const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('perfiles')
    .select(`
      id,
      nombre_completo,
      nombre,
      is_admin,
      rol,
      activo,
      empresa_id,
      empresa:empresas(id, nombre, plan_activo)
    `)
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);
  const bootstrapCompletedRef = useRef(false);
  const lastUserIdRef = useRef(null);
  const bootstrapStartTimeRef = useRef(Date.now());
  const isLoggedOutRef = useRef(false);
  const lastEventTimeRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    isMountedRef.current = true;
    bootstrapCompletedRef.current = false;
    lastUserIdRef.current = null;
    isLoggedOutRef.current = false;
    bootstrapStartTimeRef.current = Date.now();
    let bootstrapTimeoutId;

    // Funciones internas del useEffect para evitar dependencias
    const loadProfile = async (userId) => {
      if (lastUserIdRef.current === userId && perfil && perfil.id) {
        authLog('🚫 Perfil ya cargado para:', userId);
        return perfil;
      }
      
      lastUserIdRef.current = userId;

      try {
        authLog('🔄 Cargando perfil para usuario:', userId);
        const profile = await fetchProfile(userId);
        if (!isMountedRef.current) return null;
        
        if (profile) {
          setPerfil(profile);
          setError(null);
          authLog('✅ Perfil cargado exitosamente:', profile.nombre);
          
          // Verificar si el usuario está desactivado
          if (profile.activo === false) {
            authLog('⛔ Usuario desactivado detectado, cerrando sesión');
            await supabase.auth.signOut();
            setPerfil(null);
            setSession(null);
            setError('Tu cuenta ha sido desactivada. Contacta al administrador.');
            return null;
          }
        } else {
          authLog('⚠️ No se encontró perfil para el usuario:', userId);
          setPerfil(null);
          setError('Perfil no encontrado');
        }
        return profile;
      } catch (err) {
        console.error('❌ Error fetching perfil:', err); // Mantener errores siempre visibles
        if (!isMountedRef.current) return null;
        setPerfil(null);
        setError(err);
        return null;
      }
    };

    const finishBootstrap = () => {
      if (isMountedRef.current && !bootstrapCompletedRef.current) {
        bootstrapCompletedRef.current = true;
        setIsBootstrapping(false);
        authLog('✅ Bootstrap finalizado');
      }
    };

    // Timeout ULTRA-agresivo para bootstrap
    bootstrapTimeoutId = setTimeout(() => {
      if (isMountedRef.current && !bootstrapCompletedRef.current) {
        finishBootstrap();
      }
    }, 800);

    // Bootstrap con carga paralela optimizada
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const nextSession = data?.session ?? null;
        
        if (isMountedRef.current) {
          setSession(nextSession);
        }

        // Carga de perfil paralela y más rápida
        if (nextSession?.user?.id) {
          loadProfile(nextSession.user.id).catch(console.error);
        } else {
          if (isMountedRef.current) {
            setPerfil(null);
          }
        }

        // Finalizar bootstrap inmediatamente sin esperar perfil
        if (bootstrapTimeoutId) {
          clearTimeout(bootstrapTimeoutId);
          bootstrapTimeoutId = null;
        }
        finishBootstrap();
        
      } catch (error) {
        console.error('❌ Error en bootstrap:', error);
        if (bootstrapTimeoutId) {
          clearTimeout(bootstrapTimeoutId);
          bootstrapTimeoutId = null;
        }
        finishBootstrap();
      }
    })();

    // Suscripción a cambios de auth - ULTRA-ESTRICTO con SessionStorage
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMountedRef.current) return;
      
      // BLOQUEO GLOBAL: Solo 1 SIGNED_IN por sesión del browser
      const sessionStorageKey = 'signed_in_processed';
      const signedInProcessedInSession = sessionStorage.getItem(sessionStorageKey);
      
      // THROTTLING: Ignorar eventos muy frecuentes (menos de 500ms)
      const now = Date.now();
      if (now - lastEventTimeRef.current < 500 && event === 'SIGNED_IN') {
        authLog('🚫 Evento SIGNED_IN throttled - muy frecuente (< 500ms)');
        return;
      }
      lastEventTimeRef.current = now;
      
      authLog('🔐 Auth event:', event, 'SessionProcessed?', !!signedInProcessedInSession, 'LoggedOut?', isLoggedOutRef.current);
      
      // Si aún no terminó el bootstrap, finalizarlo
      if (!bootstrapCompletedRef.current) {
        finishBootstrap();
        return;
      }
      
      // Procesar logout siempre
      if (event === 'SIGNED_OUT') {
        authLog('🚪 Procesando logout');
        setSession(null);
        setPerfil(null);
        lastUserIdRef.current = null;
        isLoggedOutRef.current = true;
        sessionStorage.removeItem(sessionStorageKey); // PERMITIR nuevo login
      } 
      // Procesar login SOLO si nunca se ha procesado en esta sesión del browser
      else if (event === 'SIGNED_IN' && !signedInProcessedInSession && nextSession) {
        authLog('🔑 Primer SIGNED_IN de la sesión del browser');
        sessionStorage.setItem(sessionStorageKey, 'true'); // MARCAR como procesado
        setSession(nextSession);
        isLoggedOutRef.current = false;
        
        if (nextSession.user?.id) {
          await loadProfile(nextSession.user.id);
        }
      }
      // CASO ESPECIAL: Login después de logout explícito
      else if (event === 'SIGNED_IN' && isLoggedOutRef.current && nextSession) {
        authLog('🔑 Login después de logout explícito');
        sessionStorage.setItem(sessionStorageKey, 'true');
        setSession(nextSession);
        isLoggedOutRef.current = false;
        
        if (nextSession.user?.id) {
          await loadProfile(nextSession.user.id);
        }
      }
      // Ignorar todos los demás SIGNED_IN
      else if (event === 'SIGNED_IN') {
        authLog('🚫 Evento SIGNED_IN ignorado - ya procesado en esta sesión');
      }
    });

    // ✅ CLEANUP
    return () => {
      isMountedRef.current = false;
      if (bootstrapTimeoutId) {
        clearTimeout(bootstrapTimeoutId);
      }
      subscription.unsubscribe();
    };
  }, []);

  const loadProfileExternal = useCallback(async (userId) => {
    // BLOQUEO ULTRA-ESTRICTO - NO recargar NUNCA después del bootstrap inicial
    const now = Date.now();
    const timeSinceBootstrap = now - bootstrapStartTimeRef.current;
    
    // Bloquear durante los primeros 30 segundos (casi siempre)
    if (timeSinceBootstrap < 30000) {
      authLog('🚫 loadProfileExternal: BLOQUEADO - protección anti-duplicados');
      return perfil;
    }
    
    // Verificación adicional
    if (lastUserIdRef.current === userId && perfil && perfil.id === userId) {
      authLog('🚫 loadProfileExternal: perfil válido - NO recarga');
      return perfil;
    }
    
    // Solo permitir en casos extremos
    authLog('🔄 loadProfileExternal: CASO EXTREMO - recargando');
    try {
      const profile = await fetchProfile(userId);
      if (!isMountedRef.current) return null;
      
      if (profile) {
        lastUserIdRef.current = userId;
        setPerfil(profile);
        setError(null);
      }
      return profile;
    } catch (err) {
      console.error('❌ Error fetching perfil (external):', err);
      if (!isMountedRef.current) return null;
      setError(err);
      return null;
    }
  }, []);

  // Detector ultra-rápido de estados bloqueados - SIMPLIFICADO
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isBootstrapping) {
        setTimeout(() => {
          if (bootstrapCompletedRef.current === false) {
            bootstrapCompletedRef.current = true;
            setIsBootstrapping(false);
          }
        }, 200);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isBootstrapping]);

  const login = async (email, password) => {
    setIsLoading(true);
    
    try {
      // 1. Intentar autenticar con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (authError) {
        if (isMountedRef.current) setIsLoading(false);
        return { error: authError };
      }

      // 2. Verificar si el usuario está activo en la tabla perfiles
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfiles')
        .select('activo')
        .eq('id', authData.user.id)
        .single();

      if (perfilError) {
        console.error('Error verificando estado del usuario:', perfilError);
        // Si no se puede verificar, permitir acceso por seguridad
        if (isMountedRef.current) setIsLoading(false);
        return { error: null };
      }

      // 3. Si el usuario está desactivado, hacer logout inmediato
      if (!perfilData.activo) {
        authLog('⛔ Usuario desactivado, bloqueando acceso');
        await supabase.auth.signOut();
        if (isMountedRef.current) setIsLoading(false);
        return { error: new Error('Tu cuenta ha sido desactivada. Contacta al administrador.') };
      }

      // 4. Actualizar last_login en la tabla perfiles
      const { error: updateError } = await supabase
        .from('perfiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authData.user.id);

      if (updateError) {
        authLog('⚠️ No se pudo actualizar last_login:', updateError);
      }

      // 5. Usuario activo, permitir acceso
      if (isMountedRef.current) setIsLoading(false);
      return { error: null };
      
    } catch (error) {
      console.error('Error en login:', error);
      if (isMountedRef.current) setIsLoading(false);
      return { error };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    authLog('🚪 Iniciando logout...');
    
    // Marcar que se va a hacer logout antes de la llamada
    isLoggedOutRef.current = true;
    
    const { error: authError } = await supabase.auth.signOut();
    
    // Limpiar completamente el localStorage de Supabase
    try {
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.removeItem('signed_in_processed'); // Limpiar también sessionStorage
      localStorage.clear();
    } catch (e) {
      console.warn('No se pudo limpiar localStorage:', e);
    }
    
    if (!authError && isMountedRef.current) {
      setSession(null);
      setPerfil(null);
      lastUserIdRef.current = null;
      navigate('/login', { replace: true });
    }
    if (isMountedRef.current) setIsLoading(false);
    return { error: authError };
  };

  // Función para forzar finalización del bootstrap (para uso externo)
  const forceFinishBootstrap = useCallback(() => {
    if (bootstrapCompletedRef.current === false) {
      console.log('🔄 Forzando finalización de bootstrap desde externo');
      bootstrapCompletedRef.current = true;
      setIsBootstrapping(false);
    }
  }, []);

  const value = {
    session,
    perfil,
    isBootstrapping,
    isLoading,
    login,
    logout,
    reloadProfile: loadProfileExternal,
    forceFinishBootstrap,
    error,
    isAuthenticated: !!session
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};

export { useAuth };
export default useAuth;
