// src/components/layout/ProtectedRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Sidebar from './Sidebar';
import './ProtectedRoute.css';

const ProtectedRoute = () => {
    const { session, isBootstrapping, isLoading } = useAuth();

    if (isBootstrapping || isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Cargando...</p>
            </div>
        ); 
    }

    if (session) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <Outlet /> 
                </main>
            </div>
        ); 
    }

    return <Navigate to="/login" replace />;
};

export default ProtectedRoute;