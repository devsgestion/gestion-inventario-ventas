// src/components/layout/ProtectedRoute.jsx
import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.jsx';
import Sidebar from './Sidebar';
import './ProtectedRoute.css';

export default function ProtectedRoute() {
    const { isBootstrapping, session, perfil, forceFinishBootstrap } = useAuth();

    // Timeout de emergencia
    useEffect(() => {
        if (isBootstrapping) {
            const timeoutId = setTimeout(() => {
                console.log('🔴 ProtectedRoute timeout - finalizando bootstrap');
                forceFinishBootstrap();
            }, 3000);
            return () => clearTimeout(timeoutId);
        }
    }, [isBootstrapping, forceFinishBootstrap]);

    if (isBootstrapping) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Iniciando aplicación...</p>
                <button 
                    onClick={() => window.location.reload()}
                    style={{
                        marginTop: '20px', 
                        padding: '8px 16px', 
                        backgroundColor: '#3498db', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Recargar si tarda mucho
                </button>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    if (session && !perfil) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Cargando perfil...</p>
                <button 
                    onClick={() => window.location.reload()}
                    style={{
                        marginTop: '20px', 
                        padding: '8px 16px', 
                        backgroundColor: '#3498db', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Recargar página
                </button>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}