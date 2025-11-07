// src/components/dashboard/VentasChart.jsx
// Gráfico de líneas para mostrar ventas y utilidad de los últimos 30 días

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { formatCurrencyCOP } from '../../utils/formatters';

const VentasChart = ({ data, height = 300 }) => {
    if (!data || data.length === 0) {
        return (
            <div className="chart-empty-state">
                <p>No hay datos de ventas disponibles</p>
            </div>
        );
    }

    // Formato personalizado para el tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip">
                    <p className="tooltip-label">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }}>
                            {entry.name}: {formatCurrencyCOP(entry.value)}
                        </p>
                    ))}
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
            <LineChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                    dataKey="fecha" 
                    stroke="#666"
                    style={{ fontSize: '12px' }}
                />
                <YAxis 
                    stroke="#666"
                    style={{ fontSize: '12px' }}
                    tickFormatter={formatYAxis}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                    wrapperStyle={{ fontSize: '14px' }}
                    iconType="line"
                />
                <Line
                    type="monotone"
                    dataKey="total_ventas"
                    name="Ventas"
                    stroke="#4CAF50"
                    strokeWidth={3}
                    dot={{ fill: '#4CAF50', r: 4 }}
                    activeDot={{ r: 6 }}
                />
                <Line
                    type="monotone"
                    dataKey="utilidad"
                    name="Utilidad"
                    stroke="#2196F3"
                    strokeWidth={2}
                    dot={{ fill: '#2196F3', r: 3 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default VentasChart;
