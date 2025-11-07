// src/components/dashboard/ProductosChart.jsx
// Gráfico de barras horizontales para productos más vendidos

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { formatCurrencyCOP } from '../../utils/formatters';

const ProductosChart = ({ data, height = 400 }) => {
    if (!data || data.length === 0) {
        return (
            <div className="chart-empty-state">
                <p>No hay datos de productos vendidos</p>
            </div>
        );
    }

    // Colores para las barras (degradado de verde)
    const COLORS = [
        '#4CAF50', '#66BB6A', '#81C784', '#A5D6A7', '#C8E6C9',
        '#E8F5E9', '#81C784', '#66BB6A', '#4CAF50', '#388E3C'
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
                    <p style={{ color: '#4CAF50' }}>
                        Cantidad: {data.cantidad} unidades
                    </p>
                    <p style={{ color: '#2196F3' }}>
                        Ingresos: {formatCurrencyCOP(data.ingresos)}
                    </p>
                    <p style={{ color: '#FF9800' }}>
                        Utilidad: {formatCurrencyCOP(data.utilidad)}
                    </p>
                </div>
            );
        }
        return null;
    };

    // Acortar nombres largos para el eje Y
    const truncateName = (name, maxLength = 20) => {
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength) + '...';
    };

    const formattedData = data.map(item => ({
        ...item,
        nombreCorto: truncateName(item.nombre)
    }));

    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart
                data={formattedData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                    type="number" 
                    stroke="#666"
                    style={{ fontSize: '12px' }}
                />
                <YAxis 
                    dataKey="nombreCorto" 
                    type="category"
                    stroke="#666"
                    style={{ fontSize: '11px' }}
                    width={90}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '14px' }} />
                <Bar 
                    dataKey="cantidad" 
                    name="Unidades Vendidas"
                    radius={[0, 8, 8, 0]}
                >
                    {formattedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default ProductosChart;
