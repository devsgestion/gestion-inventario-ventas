// src/components/dashboard/ComparacionChart.jsx
// Gráfico de barras comparativo mes actual vs mes anterior

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { formatCurrencyCOP } from '../../utils/formatters';

const ComparacionChart = ({ data, height = 300 }) => {
    if (!data) {
        return (
            <div className="chart-empty-state">
                <p>No hay datos de comparación disponibles</p>
            </div>
        );
    }

    // Transformar datos para el gráfico
    const chartData = [
        {
            categoria: 'Ventas',
            'Mes Anterior': parseFloat(data.mes_anterior_ventas || 0),
            'Mes Actual': parseFloat(data.mes_actual_ventas || 0)
        },
        {
            categoria: 'Utilidad',
            'Mes Anterior': parseFloat(data.mes_anterior_utilidad || 0),
            'Mes Actual': parseFloat(data.mes_actual_utilidad || 0)
        }
    ];

    // Tooltip personalizado
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip">
                    <p className="tooltip-label" style={{ fontWeight: 'bold' }}>
                        {label}
                    </p>
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
            <BarChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                barCategoryGap="25%"
            >
                <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
                <XAxis 
                    dataKey="categoria" 
                    className="chart-axis"
                    tick={{ fill: 'currentColor' }}
                    stroke="currentColor"
                />
                <YAxis 
                    className="chart-axis"
                    tickFormatter={formatYAxis}
                    tick={{ fill: 'currentColor' }}
                    stroke="currentColor"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '14px' }} className="chart-legend" />
                <Bar 
                    dataKey="Mes Anterior" 
                    fill="#9E9E9E"
                    radius={[8, 8, 0, 0]}
                />
                <Bar 
                    dataKey="Mes Actual" 
                    fill="#4CAF50"
                    radius={[8, 8, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default ComparacionChart;
