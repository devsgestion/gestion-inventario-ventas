// src/components/dashboard/VentasPorHoraChart.jsx
// Gráfico de área para mostrar ventas por hora del día con productos vendidos

import React, { useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { formatCurrencyCOP } from '../../utils/formatters';
import './VentasPorHoraChart.css';

const VentasPorHoraChart = ({ data, height = 250 }) => {
    const [selectedHour, setSelectedHour] = useState(null);

    if (!data || data.length === 0) {
        return (
            <div className="chart-empty-state">
                <p>No hay datos de ventas por hora</p>
            </div>
        );
    }

    // Filtrar solo horas con actividad para el resumen
    const dataConActividad = data.filter(item => item.transacciones > 0);

    if (dataConActividad.length === 0) {
        return (
            <div className="chart-empty-state">
                <p>No hay ventas registradas para hoy</p>
            </div>
        );
    }

    // Tooltip personalizado con productos
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const hourData = payload[0].payload;
            const productos = hourData.productos || [];
            const hasProducts = productos.length > 0;

            return (
                <div className="ventas-hora-tooltip">
                    <div className="tooltip-header">
                        <p className="tooltip-label">{hourData.hora}</p>
                    </div>
                    
                    <div className="tooltip-stats">
                        <p style={{ color: '#2196F3', fontWeight: 600 }}>
                            💰 {formatCurrencyCOP(hourData.ventas || hourData.total_ventas)}
                        </p>
                        <p style={{ color: '#666' }}>
                            🧾 {hourData.transacciones} transaccion{hourData.transacciones !== 1 ? 'es' : ''}
                        </p>
                    </div>

                    {hasProducts && (
                        <>
                            <div className="tooltip-divider"></div>
                            <div className="tooltip-productos">
                                <p className="tooltip-productos-title">📦 Productos vendidos:</p>
                                <div className="tooltip-productos-list">
                                    {productos.slice(0, 5).map((prod, idx) => (
                                        <div key={idx} className="tooltip-producto-item">
                                            <span className="producto-nombre">{prod.nombre}</span>
                                            <span className="producto-cantidad">×{prod.cantidad}</span>
                                            <span className="producto-subtotal">
                                                {formatCurrencyCOP(prod.subtotal)}
                                            </span>
                                        </div>
                                    ))}
                                    {productos.length > 5 && (
                                        <p className="tooltip-productos-more">
                                            + {productos.length - 5} producto{productos.length - 5 !== 1 ? 's' : ''} más
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {hasProducts && (
                        <p className="tooltip-click-hint">
                            👆 Click para ver detalles completos
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    // Formato para el eje Y
    const formatYAxis = (value) => {
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `$${(value / 1000).toFixed(0)}K`;
        }
        return `$${value}`;
    };

    // Manejar click en el gráfico
    const handleChartClick = (data) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const hourData = data.activePayload[0].payload;
            if (hourData.productos && hourData.productos.length > 0) {
                setSelectedHour(selectedHour?.hora === hourData.hora ? null : hourData);
            }
        }
    };

    return (
        <div className="ventas-hora-chart-wrapper">
            <ResponsiveContainer width="100%" height={height}>
                <AreaChart
                    data={data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    onClick={handleChartClick}
                >
                    <defs>
                        <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#2196F3" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
                    <XAxis 
                        dataKey="hora" 
                        className="chart-axis"
                        interval={2}
                        tick={{ fill: 'currentColor' }}
                        stroke="currentColor"
                    />
                    <YAxis 
                        className="chart-axis"
                        tickFormatter={formatYAxis}
                        tick={{ fill: 'currentColor' }}
                        stroke="currentColor"
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2196F3', strokeWidth: 2 }} />
                    <Area
                        type="monotone"
                        dataKey={data[0]?.ventas !== undefined ? "ventas" : "total_ventas"}
                        stroke="#2196F3"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorVentas)"
                    />
                </AreaChart>
            </ResponsiveContainer>

            {/* Panel lateral con productos de la hora seleccionada */}
            {selectedHour && selectedHour.productos && selectedHour.productos.length > 0 && (
                <div className="productos-detalle-panel">
                    <div className="panel-header">
                        <h4>🕐 {selectedHour.hora} - Productos Vendidos</h4>
                        <button 
                            className="panel-close-btn"
                            onClick={() => setSelectedHour(null)}
                            aria-label="Cerrar panel"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="panel-stats">
                        <div className="panel-stat">
                            <span className="stat-label">Total Ventas</span>
                            <span className="stat-value">
                                {formatCurrencyCOP(selectedHour.ventas || selectedHour.total_ventas)}
                            </span>
                        </div>
                        <div className="panel-stat">
                            <span className="stat-label">Transacciones</span>
                            <span className="stat-value">{selectedHour.transacciones}</span>
                        </div>
                    </div>

                    <div className="panel-productos">
                        <p className="panel-productos-title">
                            {selectedHour.productos.length} producto{selectedHour.productos.length !== 1 ? 's' : ''} vendido{selectedHour.productos.length !== 1 ? 's' : ''}
                        </p>
                        <div className="panel-productos-list">
                            {selectedHour.productos.map((prod, idx) => (
                                <div key={idx} className="panel-producto-item">
                                    <div className="producto-info">
                                        <span className="producto-nombre">{prod.nombre}</span>
                                        <span className="producto-cantidad">Cantidad: {prod.cantidad}</span>
                                    </div>
                                    <div className="producto-precios">
                                        <span className="producto-precio-unit">
                                            {formatCurrencyCOP(prod.precio_venta)} c/u
                                        </span>
                                        <span className="producto-subtotal">
                                            {formatCurrencyCOP(prod.subtotal)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VentasPorHoraChart;
