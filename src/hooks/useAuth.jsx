// src/hooks/useAuth.jsx

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';

const AuthContext = createContext(null);

const fetchProfile = async (userId) => {
    const { data, error } = await supabase
        .from('perfiles')
        .select(`
            id,
            nombre,
            is_admin,
            empresa_id,
            empresa:empresas(id, nombre, plan_activo)
        `)
        .eq('id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    return data ?? null;
};

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [perfil, setPerfil] = useState(null);
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const isMountedRef = useRef(true);

    const loadProfile = useCallback(async (userId) => {
        try {
            const profile = await fetchProfile(userId);
            if (!isMountedRef.current) {
                return null;
            }
            setPerfil(profile);
            setError(null);
            return profile;
        } catch (err) {
            console.error('❌ Error fetching perfil:', err);
            if (!isMountedRef.current) {
                return null;
            }
            setPerfil(null);
            setError(err);
            return null;
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;

        const init = async () => {
            const { data } = await supabase.auth.getSession();
            if (!isMountedRef.current) return;

            const currentSession = data.session ?? null;
            setSession(currentSession);

            if (currentSession?.user?.id) {
                await loadProfile(currentSession.user.id);
            } else {
                setPerfil(null);
            }

            if (isMountedRef.current) {
                setIsBootstrapping(false);
            }
        };

        init();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (_event, nextSession) => {
                if (!isMountedRef.current) return;

                setSession(nextSession ?? null);

                if (nextSession?.user?.id) {
                    await loadProfile(nextSession.user.id);
                } else {
                    setPerfil(null);
                }

                if (isMountedRef.current) {
                    setIsBootstrapping(false);
                }
            }
        );

        return () => {
            isMountedRef.current = false;
            authListener?.subscription?.unsubscribe?.();
        };
    }, [loadProfile]);

    const login = async (email, password) => {
        setIsLoading(true);
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

        if (!authError) {
            const { data } = await supabase.auth.getSession();
            const nextSession = data.session ?? null;
            if (isMountedRef.current) {
                setSession(nextSession);
            }
            if (nextSession?.user?.id) {
                await loadProfile(nextSession.user.id);
            } else if (isMountedRef.current) {
                setPerfil(null);
            }
            if (isMountedRef.current) {
                setIsBootstrapping(false);
            }
        }

        if (isMountedRef.current) {
            setIsLoading(false);
        }

        return { error: authError };
    };

    const logout = async () => {
        await supabase.auth.signOut();
        if (!isMountedRef.current) return;
        setSession(null);
        setPerfil(null);
        setIsBootstrapping(false);
    };

    const value = {
        session,
        perfil,
        isBootstrapping,
        isLoading,
        login,
        logout,
        reloadProfile: loadProfile,
        error,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return context;
};

export default useAuth;
