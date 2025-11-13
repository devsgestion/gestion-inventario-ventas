import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { formatCurrencyCOP } from '../../utils/formatters';
import './VentasDelDiaModal.css';

const VentasDelDiaModal = ({ isOpen, onClose, empresaId }) => {
    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && empresaId) {
            fetchVentasDelDia();
        }
    }, [isOpen, empresaId]);

    const fetchVentasDelDia = async () => {
        setLoading(true);
        setError(null);

        try {
            // Obtener fecha actual en Colombia (America/Bogota)
            const now = new Date();
            const colombiaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
            const year = colombiaDate.getFullYear();
            const month = String(colombiaDate.getMonth() + 1).padStart(2, '0');
            const day = String(colombiaDate.getDate()).padStart(2, '0');
            const hoy = `${year}-${month}-${day}`;
            
            const { data, error } = await supabase
                .from('ventas')
                .select(`
                    id,
                    fecha_venta,
                    total_venta,
                    detalle_venta (
                        cantidad,
                        precio_unitario,
                        producto_id (
                            nombre
                        )
                    )
                `)
                .eq('empresa_id', empresaId)
                .gte('fecha_venta', `${hoy}T00:00:00-05:00`)
                .lte('fecha_venta', `${hoy}T23:59:59-05:00`)
                .order('fecha_venta', { ascending: false });

            if (error) throw error;

            setVentas(data || []);
        } catch (err) {
            console.error('Error cargando ventas del día:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatHora = (fecha) => {
        // Convertir a hora de Colombia
        const date = new Date(fecha);
        return date.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Bogota'
        });
    };

    const totalVentasDelDia = ventas.reduce((sum, venta) => sum + parseFloat(venta.total_venta || 0), 0);
    const cantidadVentas = ventas.length;

    if (!isOpen) return null;

    return (
        <div className="vdm-overlay" onClick={onClose}>
            <div className="vdm-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="vdm-header">
                    <div className="vdm-header-content">
                        <h2 className="vdm-title">
                            <span>📊</span>
                            <span>Ventas de Hoy</span>
                        </h2>
                        <p className="vdm-date">
                            {new Date().toLocaleDateString('es-CO', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                    <button 
                        className="vdm-close-btn"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                {/* Summary */}
                <div className="vdm-summary">
                    <div className="vdm-summary-card">
                        <p className="vdm-summary-label">Total Ventas</p>
                        <p className="vdm-summary-value">{cantidadVentas}</p>
                    </div>
                    <div className="vdm-summary-card">
                        <p className="vdm-summary-label">Ingresos</p>
                        <p className="vdm-summary-value">{formatCurrencyCOP(totalVentasDelDia)}</p>
                    </div>
                    <div className="vdm-summary-card">
                        <p className="vdm-summary-label">Promedio por Venta</p>
                        <p className="vdm-summary-value">
                            {cantidadVentas > 0 ? formatCurrencyCOP(totalVentasDelDia / cantidadVentas) : '$0'}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="vdm-content">
                    {loading ? (
                        <div className="vdm-loading">
                            <div className="vdm-loading-spinner"></div>
                            <p>Cargando ventas...</p>
                        </div>
                    ) : error ? (
                        <div className="vdm-error">
                            <div className="vdm-error-icon">⚠️</div>
                            <p>Error al cargar las ventas</p>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>
                        </div>
                    ) : ventas.length === 0 ? (
                        <div className="vdm-empty">
                            <div className="vdm-empty-icon">📭</div>
                            <p>No hay ventas registradas hoy</p>
                        </div>
                    ) : (
                        <div className="vdm-sales-list">
                            {ventas.map((venta, index) => (
                                <div key={venta.id} className="vdm-sale-card">
                                    <div className="vdm-sale-header">
                                        <span className="vdm-sale-number">#{index + 1}</span>
                                        <span className="vdm-sale-time">
                                            🕐 {formatHora(venta.fecha_venta)}
                                        </span>
                                    </div>

                                    <div className="vdm-products">
                                        {venta.detalle_venta?.map((detalle, idx) => {
                                            const subtotal = detalle.cantidad * detalle.precio_unitario;
                                            return (
                                                <div key={idx} className="vdm-product-item">
                                                    <span className="vdm-product-name">
                                                        {detalle.producto_id?.nombre || 'Producto'}
                                                    </span>
                                                    <span className="vdm-product-qty">
                                                        ×{detalle.cantidad}
                                                    </span>
                                                    <span className="vdm-product-price">
                                                        {formatCurrencyCOP(subtotal)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="vdm-sale-total">
                                        <span className="vdm-total-label">Total</span>
                                        <span className="vdm-total-value">
                                            {formatCurrencyCOP(venta.total_venta)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {ventas.length > 0 && (
                    <div className="vdm-footer">
                        <button onClick={onClose} className="vdm-close-footer-btn">
                            Cerrar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VentasDelDiaModal;
