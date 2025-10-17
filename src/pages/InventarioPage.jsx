// src/pages/InventarioPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';
import ProductoForm from '../components/inventario/ProductoForm';
import ProductosLista from '../components/inventario/ProductosLista'; 
import useAuth from '../hooks/useAuth.jsx';
import { formatCurrencyCOP } from '../utils/formatters';
import '../styles/inventario.css';

// =========================================================================
// 1. COMPONENTE DE REPORTES DEL DÍA (Ahora es solo un visor de estado)
// =========================================================================

const ReportesResumen = ({ empresaId, refreshKey, perfil }) => {
    const [reporteDia, setReporteDia] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchReporteDelDia = useCallback(async () => {
        if (!empresaId) return;
        setLoading(true);

        const { data: reporteData, error: reporteError } = await supabase.rpc('get_ventas_del_dia', {
            p_empresa_id: empresaId,
        });

        if (!reporteError && reporteData?.length > 0) {
            setReporteDia(reporteData[0]);
        } else {
            setReporteDia(null);
        }
        setLoading(false);
    }, [empresaId]);

    useEffect(() => {
        fetchReporteDelDia();
        const handler = () => fetchReporteDelDia();
        window.addEventListener('caja-status-changed', handler);
        return () => window.removeEventListener('caja-status-changed', handler);
    }, [fetchReporteDelDia, refreshKey]);

    const totalVentasHoy = reporteDia?.total_ventas || 0;

    if (!empresaId) return <div className="c-state-message c-card">No hay datos de la empresa.</div>;
    if (loading) return <div className="c-state-message c-card">Cargando resumen del día...</div>;

    return (
        <div className="c-report-grid">
            <div className="c-report-grid__stat">
                <h4 className="c-report-grid__title">VENTAS DEL DÍA (HOY)</h4>
                <h2 className="c-report-grid__value">{formatCurrencyCOP(totalVentasHoy)}</h2>
            </div>
            <div className="c-report-grid__stat">
                <h4 className="c-report-grid__title">Transacciones Hoy</h4>
                <h2 className="c-report-grid__value">{reporteDia?.cantidad_transacciones || 0}</h2>
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

    const empresaId = perfil?.empresa_id;
    const isDataReady = !!empresaId && !isBootstrapping;

    const handleProductSaved = () => {
        setRefreshKey(prevKey => prevKey + 1);
        setMostrarFormulario(false);
        if (window.refreshCajaStatus) {
            window.refreshCajaStatus();
        }
        window.dispatchEvent(new Event('caja-status-changed'));
    };

    useEffect(() => {
        window.refreshInventory = handleProductSaved;
        return () => {
            delete window.refreshInventory; 
        };
    }, []);

    if (isBootstrapping || isLoading) {
        return (
            <div className="loading-state">Cargando aplicación...</div>
        );
    }
    
    if (!perfil || !empresaId) {
        return (
            <div className="c-state-message c-card">
                <p>No se pudo cargar la información de la empresa.</p>
                <button onClick={logout} className="btn btn-primary u-mt-lg">Cerrar Sesión e Intentar de Nuevo</button>
            </div>
        );
    }

    return (
        <div className="m-inventory-layout">
            {/* Header Principal */}
            <header className="c-header-main u-mb-lg">
                <div className="u-flex u-align-center">
                    <h1 className="c-header-main__title">
                        Gestión de Inventario
                        {perfil?.empresa?.nombre && (
                            <> - <span className="c-header-main__company">{perfil.empresa.nombre}</span></>
                        )}
                    </h1>
                </div>
                <button 
                    onClick={logout}
                    className="btn btn-secondary"
                >
                    Cerrar Sesión
                </button>
            </header>

            {/* Contenido Principal */}
            <main className="m-inventory-content">
                {/* Secciones de Reportes */}
                <section className="c-card">
                    <h3 className="c-card__title">📊 Ventas del Día Actual</h3>
                    <ReportesResumen empresaId={empresaId} refreshKey={refreshKey} perfil={perfil} />
                </section>

                {/* Sección de Acciones */}
                <section className="c-card">
                    <button 
                        onClick={() => setMostrarFormulario(!mostrarFormulario)}
                        className="btn btn-primary btn-success btn-full"
                        style={{ maxWidth: '300px' }}
                    >
                        {mostrarFormulario ? '✕ Ocultar Formulario' : '+ Crear Nuevo Producto'}
                    </button>
                    {mostrarFormulario && (
                        <div className="u-mt-lg">
                            {isDataReady && <ProductoForm empresaId={empresaId} onProductSaved={handleProductSaved} />}
                        </div>
                    )}
                </section>

                {/* Lista de Productos */}
                <section className="c-card">
                    <h3 className="c-card__title">📦 Inventario Actual</h3>
                    <ProductosLista empresaId={empresaId} refreshKey={refreshKey} /> 
                </section>
            </main>
        </div>
    );
};

export default InventarioPage;