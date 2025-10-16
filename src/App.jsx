// src/App.jsx (VERSÍON SIN LÓGICA DE ADMINISTRADOR)

import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute'; 

// 🛑 Carga Lazy para la fluidez 🛑
const LoginPage = lazy(() => import('./pages/LoginPage'));
const InventarioPage = lazy(() => import('./pages/InventarioPage'));
const VentasPage = lazy(() => import('./pages/VentasPage'));
const EmpresaSettings = lazy(() => import('./pages/EmpresaSettings'));
const RegisterPage = lazy(() => import('./pages/RegisterPage')); 
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function App() {
  return (
    // Suspense para manejar la espera de módulos
    <Suspense fallback={<div>Cargando Módulo...</div>}> 
        <Routes>
            {/* Rutas Públicas */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* CRÍTICO: La ruta /register ahora es PUBLICA temporalmente. 
                        Cualquiera puede crear un tenant hasta que implementemos el pago. */}
            <Route path="/register" element={<RegisterPage />} />
            
            <Route path="/404" element={<NotFoundPage />} />

            {/* Rutas Protegidas GENERALES (El core del software) */}
            <Route element={<ProtectedRoute />}>
                <Route path="/" element={<InventarioPage />} /> 
                <Route path="/inventario" element={<InventarioPage />} />
                <Route path="/ventas" element={<VentasPage />} />
                <Route path="/settings" element={<EmpresaSettings />} /> 
            </Route>
            
            {/* Redirección 404 */}
            <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
    </Suspense>
  );
}

export default App;