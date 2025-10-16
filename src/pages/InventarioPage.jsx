// src/pages/InventarioPage.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import ProductoForm from '../components/inventario/ProductoForm';
import ProductosLista from '../components/inventario/ProductosLista'; 
import useAuth from '../hooks/useAuth';
import { formatCurrencyCOP } from '../utils/formatters';
import './InventarioPage.css';

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

        if (empresaId) {
            fetchReporte();
        } else {
            setReporte(null);
        }
    }, [empresaId]);

    if (!empresaId) return <div className="loading-state">Cargando datos de la empresa...</div>;
    if (loading) return <div className="loading-state">Cargando resumen de ventas...</div>;
    if (!reporte) return <div className="empty-state">No hay datos de ventas disponibles.</div>;

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

const InventarioPage = () => {
    const { perfil, logout, isBootstrapping } = useAuth(); 
    
    const [mostrarFormulario, setMostrarFormulario] = useState(false); // Lo cambiamos a false por defecto ahora que el inventario está visible
    const [refreshKey, setRefreshKey] = useState(0); 

    const handleProductSaved = () => {
        setRefreshKey(prevKey => prevKey + 1);
        setMostrarFormulario(false);
    };

    if (isBootstrapping) {
        return (
            <div className="loading-state">Cargando inventario...</div>
        );
    }

    if (!perfil || !perfil.empresa_id) {
        return (
            <div className="empty-state">No se pudo cargar la empresa asociada al usuario.</div>
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

                    {/* Formulario de Ingreso de Productos */}
                    {mostrarFormulario && (
                        <div style={{ marginTop: '2rem' }}>
                            <ProductoForm empresaId={perfil?.empresa_id} onProductSaved={handleProductSaved} />
                        </div>
                    )}
                </section>

                {/* Lista de Productos */}
                <section className="content-section">
                    <h3 className="section-title">📦 Inventario Actual</h3>
                    <ProductosLista key={refreshKey} empresaId={perfil.empresa_id} refreshKey={refreshKey} /> 
                </section>

                {/* Resumen de Ventas */}
                <section className="content-section">
                    <h3 className="section-title">📊 Resumen de Ventas</h3>
                    <ReportesResumen empresaId={perfil.empresa_id} />
                </section>
            </main>
        </div>
    );
};

export default InventarioPage;