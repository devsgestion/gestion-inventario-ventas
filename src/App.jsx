// src/App.jsx (VERSIÓN CON SISTEMA DE ROLES)

import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute';
import './styles/global.css';

// 🛑 Carga Lazy para la fluidez 🛑
const LoginPage = lazy(() => import('./pages/LoginPage'));
const InventarioPage = lazy(() => import('./pages/InventarioPage'));
const VentasPage = lazy(() => import('./pages/VentasPage'));
const PedidosPage = lazy(() => import('./pages/PedidosPage'));
const EmpresaSettings = lazy(() => import('./pages/EmpresaSettings'));
const RegisterPage = lazy(() => import('./pages/RegisterPage')); 
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const HistorialCajaPage = lazy(() => import('./pages/HistorialCajaPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const CambiosDevolucionesPage = lazy(() => import('./pages/CambiosDevolucionesPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const GastosPage = lazy(() => import('./pages/GastosPage'));
const HistorialMovimientosPage = lazy(() => import('./pages/HistorialMovimientosPage'));

let appMountCount = 0;

function App() {
    // ...sin logs de montaje para mayor fluidez

    return (
        <Suspense fallback={<div>Cargando Módulo...</div>}> 
            <Routes>
                {/* Rutas Públicas */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/404" element={<NotFoundPage />} />

                {/* Todas las rutas protegidas usan ProtectedRoute (con Sidebar) */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<Navigate to="/ventas" replace />} /> 
                    
                    {/* Rutas accesibles para todos los usuarios autenticados */}
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/inventario" element={<InventarioPage />} />
                    <Route path="/ventas" element={<VentasPage />} />
                    <Route path="/pedidos" element={<PedidosPage />} />
                    <Route path="/profile" element={<UserProfilePage />} />
                    
                    {/* Rutas que validan permisos internamente */}
                    <Route path="/settings" element={<EmpresaSettings />} /> 
                    <Route path="/historial" element={<HistorialCajaPage />} />
                    <Route path="/admin" element={<AdminUsersPage />} />
                    <Route path="/cambios-devoluciones" element={<CambiosDevolucionesPage />} />
                    <Route path="/gastos" element={<GastosPage />} />
                    <Route path="/movimientos" element={<HistorialMovimientosPage />} />
                </Route>
                
                {/* Redirección 404 */}
                <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
        </Suspense>
    );
}

export default App;