// src/pages/InventarioPage.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import ProductoForm from '../components/inventario/ProductoForm';
import ProductosLista from '../components/inventario/ProductosLista'; 
import useAuth from '../hooks/useAuth.jsx';
import { formatCurrencyCOP } from '../utils/formatters';
import './InventarioPage.css';

// =========================================================================
// 1. COMPONENTE DE REPORTES (Interno de la Página)
// =========================================================================

const ReportesResumen = ({ empresaId }) => {
    const [reporte, setReporte] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchReporte = async () => {
            setLoading(true);
            const { data, error } = await supabase.rpc('get_reporte_ventas', {
                p_empresa_id: empresaId,
            });

            if (error) {
                console.error('Error al cargar reporte:', error);
                setReporte(null);
            } else if (data && data.length > 0) {
                setReporte(data[0]);
            } else {
                setReporte(null);
            }
            setLoading(false);
        };

        // Solo cargamos si tenemos el ID. Esto es robusto porque el padre controla la renderización.
        if (empresaId) {
            fetchReporte();
        } else {
            setReporte(null);
            setLoading(false); 
        }
    }, [empresaId]);

    // Validación estricta: Si la ID no llega, no se renderizan datos.
    if (!empresaId) return <div className="empty-state">No hay datos de la empresa.</div>;
    if (loading) return <div className="loading-state">Cargando resumen de ventas...</div>;
    
    // Si la carga terminó y no hay reporte (o es cero)
    if (!reporte || reporte.total_ventas === 0) return <div className="empty-state">Aún no hay ventas registradas.</div>;

    return (
        <div className="reporte-grid">
            <div className="stats-card">
                <h4 className="card-title">Ventas Totales</h4>
                <h2 className="card-value">{formatCurrencyCOP(reporte.total_ventas)}</h2>
            </div>
            <div className="stats-card">
                <h4 className="card-title">Transacciones</h4>
                <h2 className="card-value">{reporte.cantidad_transacciones}</h2>
            </div>
            <div className="stats-card">
                <h4 className="card-title">Unidades Vendidas</h4>
                <h2 className="card-value">{reporte.total_items_vendidos}</h2>
            </div>
        </div>
    );
};

// =========================================================================
// 2. PÁGINA PRINCIPAL
// =========================================================================

const InventarioPage = () => {
    const { perfil, logout, isBootstrapping, isLoading } = useAuth(); 
    
    const [mostrarFormulario, setMostrarFormulario] = useState(false); 
    const [refreshKey, setRefreshKey] = useState(0); 
    
    // Extracción de la ID de la empresa (si existe)
    const empresaId = perfil?.empresa_id;
    const isDataReady = !!empresaId && !isBootstrapping;

    // Detector de página colgada
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isBootstrapping) {
                // Si volvemos a la página y sigue en bootstrap, hay problema
                setTimeout(() => {
                    if (isBootstrapping) {
                        console.error('🚨 Página colgada en bootstrap - refresh automático');
                        window.location.reload();
                    }
                }, 2000);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isBootstrapping]);

    const handleProductSaved = () => {
        setRefreshKey(prevKey => prevKey + 1);
        setMostrarFormulario(false);
    };

    // 🛑 MANEJO DE ESTADOS GLOBALES (CRÍTICO para evitar el cuelgue) 🛑
    // Si la carga inicial de la aplicación aún está en curso, mostramos un solo spinner.
    if (isBootstrapping || isLoading) {
        return (
            <div className="loading-state">
                <p>Cargando aplicación...</p>
                <button 
                    onClick={() => window.location.reload()} 
                    style={{
                        marginTop: '15px', 
                        padding: '8px 16px', 
                        backgroundColor: '#ff6b6b', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    🔄 Forzar Recarga
                </button>
            </div>
        );
    }
    
    // Si terminó la carga y no hay perfil o empresaId (FALLO DE PERFIL/RLS)
    if (!perfil || !empresaId) {
        return (
            <div className="empty-state">
                <p>No se pudo cargar la información de la empresa.</p>
                <button onClick={logout} className="btn btn-primary">Cerrar Sesión e Intentar de Nuevo</button>
            </div>
        );
    }

    return (
        <div className="inventario-container">
            {/* Header Principal */}
            <header className="inventario-header">
                <div className="header-content">
                    <h1 className="header-title">
                        Gestión de Inventario
                        {perfil?.empresa?.nombre && (
                            <> - <span className="company-name">{perfil.empresa.nombre}</span></>
                        )}
                    </h1>
                    <button 
                        onClick={logout}
                        className="btn btn-secondary"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            {/* Contenido Principal */}
            <main className="inventario-content">
                {/* Sección de Acciones */}
                <section className="actions-section">
                    <button 
                        onClick={() => setMostrarFormulario(!mostrarFormulario)}
                        className="btn btn-primary btn-lg"
                    >
                        {mostrarFormulario ? '✕ Ocultar Formulario' : '+ Crear Nuevo Producto'}
                    </button>

                    {/* Formulario de Ingreso de Productos: Renderizado Condicional */}
                    {mostrarFormulario && (
                        <div style={{ marginTop: '2rem' }}>
                            {/* CRÍTICO: Solo renderizar si los datos están listos */}
                            {isDataReady && <ProductoForm empresaId={empresaId} onProductSaved={handleProductSaved} />}
                        </div>
                    )}
                </section>

                {/* 🛑 SECCIONES DE DATOS: Renderizado Estricto 🛑 */}
                {isDataReady ? (
                    <>
                        {/* Lista de Productos */}
                        <section className="content-section">
                            <h3 className="section-title">📦 Inventario Actual</h3>
                            <ProductosLista empresaId={empresaId} refreshKey={refreshKey} /> 
                        </section>

                        {/* Resumen de Ventas */}
                        <section className="content-section">
                            <h3 className="section-title">📊 Resumen de Ventas</h3>
                            <ReportesResumen empresaId={empresaId} refreshKey={refreshKey} />
                        </section>
                    </>
                ) : (
                    // Estado de espera si isDataReady es false (solo debería ser breve)
                    <div className="loading-state" style={{ padding: '40px', textAlign: 'center' }}>
                        Esperando datos de la empresa para cargar los módulos...
                    </div>
                )}
            </main>
        </div>
    );
};

export default InventarioPage;