// src/components/layout/AdminRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const AdminRoute = () => {
    const { perfil, isBootstrapping, session } = useAuth();
    const [allowAccess, setAllowAccess] = React.useState(false);

    // Debug info
    console.log('🔐 AdminRoute Check:', {
        isBootstrapping,
        hasSession: !!session,
        hasPerfil: !!perfil,
        isAdmin: perfil?.is_admin,
        nombre: perfil?.nombre,
        allowAccess
    });

    // Si no hay sesión, redirigir a login
    if (!session && !isBootstrapping) {
        console.log('❌ No session - redirecting to login');
        return <Navigate to="/login" replace />;
    }

    // Si está cargando, mostrar loading con opción de bypass
    if (isBootstrapping) {
        return (
            <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>🔍 Verificando permisos de administrador...</p>
                <button 
                    onClick={() => setAllowAccess(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: '1rem' }}
                >
                    Continuar de todas formas (Admin)
                </button>
            </div>
        );
    }

    // Permitir acceso forzado (bypass)
    if (allowAccess && session) {
        console.log('🚀 Bypass access granted');
        return <Outlet />;
    }

    // Si hay perfil y es admin, permitir acceso
    if (perfil && perfil.is_admin === true) {
        console.log('✅ Admin access granted!');
        return <Outlet />;
    }

    // Si hay perfil pero no es admin, redirigir
    if (perfil && perfil.is_admin !== true) {
        console.log('❌ Not admin - redirecting to inventario', { isAdmin: perfil.is_admin });
        return <Navigate to="/inventario" replace />;
    }

    // Si hay sesión pero no perfil (después del loading), permitir acceso temporal
    if (session && !perfil && !isBootstrapping) {
        console.log('⚠️ Session without profile - allowing temporary access');
        return (
            <div className="loading-state">
                <p>⚠️ No se pudo cargar el perfil, pero tienes una sesión válida.</p>
                <button 
                    onClick={() => setAllowAccess(true)}
                    className="btn btn-primary"
                >
                    Continuar a Registro
                </button>
                <button 
                    onClick={() => window.location.href = '/inventario'}
                    className="btn btn-secondary"
                    style={{ marginLeft: '1rem' }}
                >
                    Ir a Inventario
                </button>
            </div>
        );
    }

    // Estado por defecto
    return <Navigate to="/login" replace />;
};

export default AdminRoute;