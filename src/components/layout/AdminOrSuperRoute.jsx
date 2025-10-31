// src/components/layout/AdminOrSuperRoute.jsx
// Protege rutas que requieren permisos de admin o superadmin

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const AdminOrSuperRoute = () => {
    const { perfil, isBootstrapping, session } = useAuth();
    const rol = perfil?.rol || 'usuario';
    
    // Normalizar rol para aceptar 'administrador' como 'admin'
    const normalizedRol = rol === 'administrador' ? 'admin' : rol;

    // Si no hay sesión, redirigir a login
    if (!session && !isBootstrapping) {
        return <Navigate to="/login" replace />;
    }

    // Si está cargando, mostrar loading
    if (isBootstrapping) {
        return (
            <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>🔍 Verificando permisos...</p>
            </div>
        );
    }

    // Si hay perfil y es superadmin o admin, permitir acceso
    if (perfil && (normalizedRol === 'superadmin' || normalizedRol === 'admin')) {
        return <Outlet />;
    }

    // Si hay perfil pero no tiene permisos, redirigir
    if (perfil && normalizedRol === 'usuario') {
        return <Navigate to="/ventas" replace />;
    }

    // Estado por defecto
    return <Navigate to="/login" replace />;
};

export default AdminOrSuperRoute;
