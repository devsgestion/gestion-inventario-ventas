// src/pages/InventarioPage.jsx (VERSIÓN FINAL Y SINCRONIZADA con CPP y Reporte de Utilidad)

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';
import ProductoForm from '../components/inventario/ProductoForm';
import ProductosLista from '../components/inventario/ProductosLista';
import RegistroCompraForm from '../components/inventario/RegistroCompraForm'; // 🛑 Importar nuevo formulario
import useAuth from '../hooks/useAuth.jsx';
import { formatCurrencyCOP } from '../utils/formatters';
import '../styles/inventario.css';

// =========================================================================
// 1. COMPONENTE DE REPORTES DEL DÍA (Visor de Estado de Caja y Utilidad)
// =========================================================================

const ReportesResumen = ({ empresaId, refreshKey }) => {
    const [reporteDia, setReporteDia] = useState(null);
    const [reporteUtilidad, setReporteUtilidad] = useState(null); // 🛑 Nuevo Estado
    const [loading, setLoading] = useState(false);

    const fetchReportes = useCallback(async () => {
        if (!empresaId) return;
        setLoading(true);

        // 1. Reporte de Ventas
        const { data: ventasData, error: ventasError } = await supabase.rpc('get_ventas_del_dia', { p_empresa_id: empresaId });
        
        // 2. Reporte de Utilidad (Requiere la RPC get_utilidad_del_dia)
        const { data: utilidadData, error: utilidadError } = await supabase.rpc('get_utilidad_del_dia', { p_empresa_id: empresaId });

        // Manejo de ventasData
        if (!ventasError && ventasData && ventasData.length > 0) {
            setReporteDia(Array.isArray(ventasData) ? ventasData[0] : ventasData);
        } else {
            setReporteDia({ total_ventas: 0, cantidad_transacciones: 0 });
        }

        // Manejo de utilidadData
        if (!utilidadError && utilidadData && utilidadData.length > 0) {
            setReporteUtilidad(Array.isArray(utilidadData) ? utilidadData[0] : utilidadData);
        } else {
            setReporteUtilidad({ total_ventas: 0, total_costos: 0, utilidad_neta: 0 });
        }
        
        if (ventasError || utilidadError) {
             console.error('❌ Error en RPC de Reportes:', ventasError, utilidadError);
        }

        setLoading(false);
    }, [empresaId]);

    useEffect(() => {
        fetchReportes();
        const handler = () => fetchReportes();
        window.addEventListener('caja-status-changed', handler);
        return () => window.removeEventListener('caja-status-changed', handler);
    }, [fetchReportes, refreshKey]);

    if (!empresaId) return <div className="c-state-message c-card">No hay datos de la empresa.</div>;
    if (loading) return <div className="c-state-message c-card">Cargando resumen del día...</div>;

    const totalVentas = reporteDia?.total_ventas ?? 0;
    const transacciones = reporteDia?.cantidad_transacciones ?? 0;
    const utilidad = reporteUtilidad?.utilidad_neta ?? 0; // 🛑 Nueva variable

    return (
        <div className="c-report-grid">
            <div className="c-report-grid__stat">
                <h4 className="c-report-grid__title">VENTAS DEL DÍA (HOY)</h4>
                <h2 className="c-report-grid__value">{formatCurrencyCOP(totalVentas)}</h2>
            </div>
            <div className="c-report-grid__stat">
                <h4 className="c-report-grid__title">UTILIDAD NETA HOY</h4>
                <h2 className="c-report-grid__value" style={{ color: utilidad >= 0 ? 'green' : 'red' }}>
                    {formatCurrencyCOP(utilidad)}
                </h2>
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
    const [mostrarFormulario, setMostrarFormulario] = useState(false); // Modal para Crear/Editar Producto
    const [mostrarFormularioCompra, setMostrarFormularioCompra] = useState(false); // 🛑 Modal para Compra
    const [productoSeleccionado, setProductoSeleccionado] = useState(null); // Producto para Compra/Edición
    const [refreshKey, setRefreshKey] = useState(0);
    // 🛑 NUEVO ESTADO: Para mostrar/ocultar productos inactivos 🛑
    const [mostrarInactivos, setMostrarInactivos] = useState(false);

    const empresaId = perfil?.empresa_id;
    const isDataReady = !!empresaId && !isBootstrapping;

    // Función de refresco: Aumenta la key y notifica a otros componentes
    const handleProductSaved = () => {
        setRefreshKey(prevKey => prevKey + 1);
        window.dispatchEvent(new Event('caja-status-changed'));
    };

    // Funciones para ProductoForm
    const handleCloseForm = () => {
        setMostrarFormulario(false);
    };

    // 🛑 Funciones para RegistroCompraForm 🛑
    const handleOpenCompraForm = (producto = null) => {
        setProductoSeleccionado(producto);
        setMostrarFormularioCompra(true);
    };

    const handleCloseCompraForm = () => {
        setMostrarFormularioCompra(false);
        setProductoSeleccionado(null);
    };
    // ------------------------------------

    // Exportar la función de recarga del inventario (CRÍTICO para VentasPage)
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
                    <h3 className="c-card__title">📊 Reporte Financiero Rápido (Hoy)</h3>
                    <ReportesResumen empresaId={empresaId} refreshKey={refreshKey} />
                </section>

                {/* Lista de Productos */}
                <section className="c-card">
                    <div className="u-flex u-justify-between u-align-center u-mb-lg">
                        <h3 className="c-card__title">📦 Inventario Actual</h3>
                        
                        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                            {/* 🛑 NUEVO: Toggle para productos inactivos 🛑 */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                <input
                                    type="checkbox"
                                    checked={mostrarInactivos}
                                    onChange={(e) => setMostrarInactivos(e.target.checked)}
                                />
                                Mostrar productos inactivos
                            </label>
                            
                            <button
                                onClick={() => setMostrarFormulario(true)}
                                className="btn btn-primary btn-success btn-new-product-action"
                                style={{ minWidth: 180 }}
                            >
                                + Crear Nuevo Producto
                            </button>
                        </div>
                    </div>
                    
                    <ProductosLista 
                        empresaId={empresaId} 
                        refreshKey={refreshKey} 
                        onRegisterStock={handleOpenCompraForm}
                        mostrarInactivos={mostrarInactivos}
                    />
                </section>

                {/* MODAL: Formulario de Creación/Edición */}
                {mostrarFormulario && isDataReady && (
                    <ProductoForm
                        empresaId={empresaId}
                        onProductSaved={handleProductSaved}
                        onClose={handleCloseForm}
                    />
                )}
                
                {/* 🛑 MODAL: Formulario de Registro de Compra/Stock 🛑 */}
                {mostrarFormularioCompra && isDataReady && (
                    <RegistroCompraForm
                        empresaId={empresaId}
                        productoInicial={productoSeleccionado} 
                        onCompraRegistrada={handleProductSaved} 
                        onClose={handleCloseCompraForm}
                    />
                )}
            </main>
        </div>
    );
};

export default InventarioPage;