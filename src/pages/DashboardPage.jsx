// src/pages/DashboardPage.jsx
// Dashboard principal con métricas y gráficos analíticos

import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';
import useDashboard from '../hooks/useDashboard';
import VentasChart from '../components/dashboard/VentasChart';
import ProductosChart from '../components/dashboard/ProductosChart';
import StockChart from '../components/dashboard/StockChart';
import ComparacionChart from '../components/dashboard/ComparacionChart';
import VentasPorHoraChart from '../components/dashboard/VentasPorHoraChart';
import VentasDelDiaModal from '../components/dashboard/VentasDelDiaModal';
import { formatCurrencyCOP } from '../utils/formatters';
import '../styles/Dashboard.css';

const DashboardPage = () => {
    const { perfil } = useAuth();
    const empresaId = perfil?.empresa_id;
    const [showVentasModal, setShowVentasModal] = useState(false);

    const {
        loading,
        error,
        resumenGeneral,
        ventasUltimos30Dias,
        productosMasVendidos,
        productosBajoStock,
        comparacionMensual,
        ventasPorHora,
        refresh
    } = useDashboard(empresaId);

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Cargando dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-error">
                <p>❌ Error al cargar el dashboard: {error}</p>
                <button onClick={refresh} className="btn btn-primary">
                    Reintentar
                </button>
            </div>
        );
    }

    // Calcular indicadores de variación
    const getVariacionClass = (valor) => {
        if (valor > 0) return 'variacion-positiva';
        if (valor < 0) return 'variacion-negativa';
        return 'variacion-neutral';
    };

    const getVariacionIcon = (valor) => {
        if (valor > 0) return '📈';
        if (valor < 0) return '📉';
        return '➡️';
    };

    return (
        <div className="dashboard-page">
            {/* Header */}
            <header className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">
                        📊 Dashboard Analytics
                    </h1>
                    <p className="dashboard-subtitle">
                        {perfil?.empresa?.nombre || 'Tu Negocio'}
                    </p>
                </div>
                <div className="dashboard-actions">
                    <button 
                        onClick={() => setShowVentasModal(true)} 
                        className="btn btn-primary dashboard-ventas-btn"
                    >
                        🛍️ Ver Ventas de Hoy
                    </button>
                    <button onClick={refresh} className="btn btn-secondary dashboard-refresh-btn">
                        🔄 Actualizar
                    </button>
                </div>
            </header>

            {/* Tarjetas de Resumen (KPIs) */}
            {resumenGeneral && (
                <div className="dashboard-kpis">
                    <div className="kpi-card kpi-primary">
                        <div className="kpi-icon">💰</div>
                        <div className="kpi-content">
                            <h3 className="kpi-label">Ventas Hoy</h3>
                            <p className="kpi-value">
                                {formatCurrencyCOP(resumenGeneral.total_ventas_hoy)}
                            </p>
                        </div>
                    </div>

                    <div className="kpi-card kpi-success">
                        <div className="kpi-icon">📈</div>
                        <div className="kpi-content">
                            <h3 className="kpi-label">Ventas del Mes</h3>
                            <p className="kpi-value">
                                {formatCurrencyCOP(resumenGeneral.total_ventas_mes)}
                            </p>
                            {comparacionMensual && (
                                <p className={`kpi-variation ${getVariacionClass(comparacionMensual.variacion_ventas)}`}>
                                    {getVariacionIcon(comparacionMensual.variacion_ventas)}
                                    {Math.abs(comparacionMensual.variacion_ventas)}% vs mes anterior
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="kpi-card kpi-info">
                        <div className="kpi-icon">💵</div>
                        <div className="kpi-content">
                            <h3 className="kpi-label">Utilidad del Mes</h3>
                            <p className="kpi-value">
                                {formatCurrencyCOP(resumenGeneral.utilidad_mes)}
                            </p>
                            {comparacionMensual && (
                                <p className={`kpi-variation ${getVariacionClass(comparacionMensual.variacion_utilidad)}`}>
                                    {getVariacionIcon(comparacionMensual.variacion_utilidad)}
                                    {Math.abs(comparacionMensual.variacion_utilidad)}% vs mes anterior
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="kpi-card kpi-warning">
                        <div className="kpi-icon">🏷️</div>
                        <div className="kpi-content">
                            <h3 className="kpi-label">Promedio por Venta</h3>
                            <p className="kpi-value">
                                {formatCurrencyCOP(resumenGeneral.ticket_promedio)}
                            </p>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-icon">📦</div>
                        <div className="kpi-content">
                            <h3 className="kpi-label">Productos Activos</h3>
                            <p className="kpi-value">
                                {resumenGeneral.productos_activos}
                            </p>
                            <p className="kpi-detail">
                                de {resumenGeneral.total_productos} totales
                            </p>
                        </div>
                    </div>

                    <div className="kpi-card kpi-danger">
                        <div className="kpi-icon">⚠️</div>
                        <div className="kpi-content">
                            <h3 className="kpi-label">Stock Bajo</h3>
                            <p className="kpi-value">
                                {resumenGeneral.productos_bajo_stock}
                            </p>
                            <p className="kpi-detail">productos alertados</p>
                        </div>
                    </div>

                    <div className="kpi-card kpi-secondary">
                        <div className="kpi-icon">🏦</div>
                        <div className="kpi-content">
                            <h3 className="kpi-label">Valor Inventario</h3>
                            <p className="kpi-value">
                                {formatCurrencyCOP(resumenGeneral.valor_inventario)}
                            </p>
                            <p className="kpi-detail">stock valorizado</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid de Gráficos */}
            <div className="dashboard-charts">
                {/* Ventas últimos 30 días */}
                <div className="chart-card chart-card-wide">
                    <div className="chart-card-header">
                        <h3>📅 Ventas y Utilidad - Últimos 30 Días</h3>
                    </div>
                    <div className="chart-card-body">
                        <VentasChart data={ventasUltimos30Dias} height={350} />
                    </div>
                </div>

                {/* Comparación mensual */}
                {comparacionMensual && (
                    <div className="chart-card">
                        <div className="chart-card-header">
                            <h3>📊 Comparación Mensual</h3>
                        </div>
                        <div className="chart-card-body">
                            <ComparacionChart data={comparacionMensual} height={300} />
                        </div>
                        <div className="chart-card-footer">
                            <div className="comparison-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Transacciones:</span>
                                    <span className={`stat-value ${getVariacionClass(comparacionMensual.variacion_transacciones)}`}>
                                        {comparacionMensual.mes_actual_transacciones} 
                                        ({comparacionMensual.variacion_transacciones > 0 ? '+' : ''}
                                        {comparacionMensual.variacion_transacciones}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Productos más vendidos */}
                <div className="chart-card chart-card-tall">
                    <div className="chart-card-header">
                        <h3>🏆 Top 10 Productos Más Vendidos</h3>
                        <p className="chart-card-subtitle">Últimos 30 días</p>
                    </div>
                    <div className="chart-card-body">
                        <ProductosChart data={productosMasVendidos} height={450} />
                    </div>
                </div>

                {/* Stock bajo */}
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h3>⚠️ Productos con Stock Bajo</h3>
                        <p className="chart-card-subtitle">
                            {productosBajoStock.length} productos alertados
                        </p>
                    </div>
                    <div className="chart-card-body">
                        <StockChart data={productosBajoStock} height={300} />
                    </div>
                    {productosBajoStock.length > 0 && (
                        <div className="chart-card-footer">
                            <p className="chart-warning">
                                💡 Considera reabastecer estos productos pronto
                            </p>
                        </div>
                    )}
                </div>

                {/* Ventas por hora */}
                <div className="chart-card chart-card-wide">
                    <div className="chart-card-header">
                        <h3>⏰ Ventas por Hora - Hoy</h3>
                        <p className="chart-card-subtitle">
                            {new Date().toLocaleDateString('es-CO', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </p>
                    </div>
                    <div className="chart-card-body">
                        <VentasPorHoraChart data={ventasPorHora} height={280} />
                    </div>
                </div>
            </div>

            {/* Modal de Ventas del Día */}
            <VentasDelDiaModal 
                isOpen={showVentasModal}
                onClose={() => setShowVentasModal(false)}
                empresaId={empresaId}
            />
        </div>
    );
};

export default DashboardPage;
