// src/pages/InventarioPage.jsx (VERSIÓN FINAL Y SINCRONIZADA)

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';
import ProductoForm from '../components/inventario/ProductoForm';
import ProductosLista from '../components/inventario/ProductosLista';
import useAuth from '../hooks/useAuth.jsx';
import { formatCurrencyCOP } from '../utils/formatters';
import '../styles/inventario.css';

// =========================================================================
// 1. COMPONENTE DE REPORTES DEL DÍA (Visor de Estado de Caja)
// =========================================================================

const ReportesResumen = ({ empresaId, refreshKey }) => {
    const [reporteDia, setReporteDia] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchReporteDelDia = useCallback(async () => {
        if (!empresaId) return;
        setLoading(true);

        // 💡 DEBUG: Log de llamada RPC y respuesta
        console.log('🔎 Llamando a get_ventas_del_dia con empresaId:', empresaId);
        const { data: reporteData, error: reporteError } = await supabase.rpc('get_ventas_del_dia', {
            p_empresa_id: empresaId,
        });
        console.log('🔎 Respuesta RPC:', { reporteData, reporteError });

        // 💡 DEBUG: Si la respuesta es null, muestra mensaje claro
        if (reporteError) {
            console.error('❌ Error en RPC:', reporteError);
            setReporteDia(null);
        } else if (reporteData === null) {
            console.warn('⚠️ La función RPC retornó null. Verifica la función en Supabase.');
            setReporteDia({ total_ventas: 0, cantidad_transacciones: 0 });
        } else if (Array.isArray(reporteData) && reporteData.length > 0) {
            setReporteDia(reporteData[0]);
        } else if (Array.isArray(reporteData) && reporteData.length === 0) {
            setReporteDia({ total_ventas: 0, cantidad_transacciones: 0 });
        } else if (typeof reporteData === 'object') {
            setReporteDia(reporteData);
        } else {
            setReporteDia({ total_ventas: 0, cantidad_transacciones: 0 });
        }
        setLoading(false);
    }, [empresaId]);

    useEffect(() => {
        fetchReporteDelDia();
        const handler = () => fetchReporteDelDia();
        window.addEventListener('caja-status-changed', handler);
        return () => window.removeEventListener('caja-status-changed', handler);
    }, [fetchReporteDelDia, refreshKey]);

    if (!empresaId) return <div className="c-state-message c-card">No hay datos de la empresa.</div>;
    if (loading) return <div className="c-state-message c-card">Cargando resumen del día...</div>;

    // 💡 DEBUG: Mostrar el estado actual en pantalla
    if (!reporteDia) {
        return (
            <div className="c-state-message c-card">
                <p>No hay datos de ventas para hoy.</p>
                <pre style={{ fontSize: '0.85em', background: '#222', color: '#fff', padding: '8px', borderRadius: '6px' }}>
                    {JSON.stringify(reporteDia, null, 2)}
                </pre>
            </div>
        );
    }

    const totalVentas = reporteDia?.total_ventas ?? 0;
    const transacciones = reporteDia?.cantidad_transacciones ?? 0;

    return (
        <div className="c-report-grid">
            <div className="c-report-grid__stat">
                <h4 className="c-report-grid__title">VENTAS DEL DÍA (HOY)</h4>
                <h2 className="c-report-grid__value">{formatCurrencyCOP(totalVentas)}</h2>
            </div>
            <div className="c-report-grid__stat">
                <h4 className="c-report-grid__title">Transacciones Hoy</h4>
                <h2 className="c-report-grid__value">{transacciones}</h2>
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

    // Función de refresco: Aumenta la key y notifica a otros componentes
    const handleProductSaved = () => {
        setRefreshKey(prevKey => prevKey + 1);
        // 🛑 DISPARAR EVENTO GLOBAL: Notificar al ReportesResumen y a otros hooks que hay un cambio 🛑
        window.dispatchEvent(new Event('caja-status-changed'));
    };

    // Función para cerrar el modal de ProductoForm (Se pasa como prop 'onClose')
    const handleCloseForm = () => {
        setMostrarFormulario(false);
    };

    // 🛑 EXPORTAR LA FUNCIÓN DE RECARGA DEL INVENTARIO (CRÍTICO para VentasPage) 🛑
    useEffect(() => {
        window.refreshInventory = handleProductSaved;
        return () => {
            delete window.refreshInventory;
        };
    }, []);

    // Manejo de estados globales
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
                    <ReportesResumen empresaId={empresaId} refreshKey={refreshKey} />
                </section>

                {/* Lista de Productos */}
                <section className="c-card">
                    <div className="u-flex u-justify-between u-align-center u-mb-lg">
                        <h3 className="c-card__title">📦 Inventario Actual</h3>
                        00000000                         <button
                            onClick={() => setMostrarFormulario(true)}
                            className="btn btn-primary btn-success btn-new-product-action"
                            style={{ minWidth: 180 }}
                        >
                            + Crear Nuevo Producto
                        </button>
                    </div>
                    <ProductosLista empresaId={empresaId} refreshKey={refreshKey} />
                </section>

                {/* 💡 MODAL: Renderizado condicional del formulario */}
                {mostrarFormulario && isDataReady && (
                    <ProductoForm
                        empresaId={empresaId}
                        onProductSaved={handleProductSaved}
                        onClose={handleCloseForm}
                    />
                )}
            </main>
        </div>
    );
};

export default InventarioPage;