// src/components/dashboard/VentasPorHoraChart.jsx
// Gráfico de área para mostrar ventas por hora del día

import React from 'react';
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

const VentasPorHoraChart = ({ data, height = 250 }) => {
    if (!data || data.length === 0) {
        return (
            <div className="chart-empty-state">
                <p>No hay datos de ventas por hora</p>
            </div>
        );
    }

    // Filtrar solo horas con actividad (opcional)
    const dataConActividad = data.filter(item => item.ventas > 0);

    if (dataConActividad.length === 0) {
        return (
            <div className="chart-empty-state">
                <p>No hay ventas registradas para hoy</p>
            </div>
        );
    }

    // Tooltip personalizado
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="custom-tooltip">
                    <p className="tooltip-label">{data.hora}</p>
                    <p style={{ color: '#2196F3' }}>
                        Ventas: {formatCurrencyCOP(data.ventas)}
                    </p>
                    <p>Transacciones: {data.transacciones}</p>
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

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
                <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#2196F3" stopOpacity={0.1} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                    dataKey="hora" 
                    stroke="#666"
                    style={{ fontSize: '11px' }}
                    interval={2}
                />
                <YAxis 
                    stroke="#666"
                    style={{ fontSize: '12px' }}
                    tickFormatter={formatYAxis}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                    type="monotone"
                    dataKey="ventas"
                    stroke="#2196F3"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVentas)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};

export default VentasPorHoraChart;
