// src/components/layout/ProtectedRoute.jsx
import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.jsx';
import Sidebar from './Sidebar';
import './ProtectedRoute.css';

export default function ProtectedRoute() {
  const { isBootstrapping, session, perfil, forceFinishBootstrap } = useAuth();

  // SOLO timeout para bootstrap - SIN recovery, SIN re-renders forzados
  useEffect(() => {
    if (isBootstrapping) {
      const timeoutId = setTimeout(() => {
        forceFinishBootstrap();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [isBootstrapping, forceFinishBootstrap]);

  // Detector de cuelgue MÁS AGRESIVO - refresh más rápido
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh MUCHO más rápido si se detecta problema
        setTimeout(() => {
          if (document.visibilityState === 'visible' && session && !perfil) {
            console.error('🚨 Aplicación colgada detectada - refresh inmediato');
            window.location.reload();
          }
        }, 2000); // Reducido de 5 a 2 segundos
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [perfil, session]);

  if (isBootstrapping) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Iniciando...</p>
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
            marginTop: '10px', 
            padding: '8px 16px', 
            backgroundColor: '#ff6b6b', 
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

  // IMPORTANTE: Sin key={forceRender} para evitar re-renders innecesarios
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}