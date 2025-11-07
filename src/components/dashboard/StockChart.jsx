// src/components/dashboard/StockChart.jsx
// Gráfico circular (donut) para mostrar productos con stock bajo

import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

const StockChart = ({ data, height = 300 }) => {
    if (!data || data.length === 0) {
        return (
            <div className="chart-empty-state chart-success">
                <p style={{ color: '#4CAF50', fontSize: '1.125rem' }}>
                    ✅ ¡Excelente! No hay productos con stock bajo
                </p>
            </div>
        );
    }

    // Limitar a los 8 productos con mayor déficit
    const topData = data.slice(0, 8);

    // Paleta de colores (de rojo a naranja)
    const COLORS = [
        '#f44336', '#e91e63', '#ff5722', '#ff9800',
        '#ffc107', '#ffeb3b', '#cddc39', '#8bc34a'
    ];

    // Tooltip personalizado
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="custom-tooltip">
                    <p className="tooltip-label" style={{ fontWeight: 'bold' }}>
                        {data.nombre}
                    </p>
                    <p>Stock actual: {data.stock}</p>
                    <p>Stock mínimo: {data.minimo}</p>
                    <p style={{ color: '#f44336' }}>
                        Déficit: {data.deficit} unidades
                    </p>
                </div>
            );
        }
        return null;
    };

    // Label personalizado
    const renderCustomLabel = ({ name, percent }) => {
        return `${(percent * 100).toFixed(0)}%`;
    };

    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={topData}
                    dataKey="deficit"
                    nameKey="nombre"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    label={renderCustomLabel}
                    labelLine={false}
                >
                    {topData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default StockChart;
