// src/App.jsx (VERSIÓN MODIFICADA)

import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute'; 
import './styles/global.css'; // Importa el CSS global

// 🛑 Carga Lazy para la fluidez 🛑
const LoginPage = lazy(() => import('./pages/LoginPage'));
const InventarioPage = lazy(() => import('./pages/InventarioPage'));
const VentasPage = lazy(() => import('./pages/VentasPage'));
const EmpresaSettings = lazy(() => import('./pages/EmpresaSettings'));
const RegisterPage = lazy(() => import('./pages/RegisterPage')); 
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
// 🛑 NUEVA PÁGINA 🛑
const HistorialCajaPage = lazy(() => import('./pages/HistorialCajaPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));


function App() {
    return (
        // Suspense para manejar la espera de módulos
        <Suspense fallback={<div>Cargando Módulo...</div>}> 
            <Routes>
                {/* Rutas Públicas */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/404" element={<NotFoundPage />} />

                {/* Rutas Protegidas GENERALES */}
                <Route element={<ProtectedRoute />}>
                    
                    {/* 🛑 CAMBIO CRÍTICO: La raíz (/) ahora solo redirige 🛑 */}
                    <Route path="/" element={<Navigate to="/ventas" replace />} /> 

                    <Route path="/inventario" element={<InventarioPage />} />
                    <Route path="/ventas" element={<VentasPage />} />
                    <Route path="/settings" element={<EmpresaSettings />} /> 
                    <Route path="/profile" element={<UserProfilePage />} />
                    <Route path="/historial" element={<HistorialCajaPage />} />
                    
                    {/* Ruta de administración - Solo superadmin */}
                    <Route path="/admin" element={<AdminUsersPage />} />
                </Route>
                
                {/* Redirección 404 */}
                <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
        </Suspense>
    );
}

export default App;