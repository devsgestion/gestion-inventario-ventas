// src/pages/HistorialCajaPage.jsx (Actualizado para el diseño de la imagen)

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';
import useAuth from '../hooks/useAuth.jsx';
import { formatCurrencyCOP } from '../utils/formatters';
import '../styles/ventas.css'; 

const HistorialCajaPage = () => {
    const { perfil, isLoading: isAuthLoading } = useAuth();
    const empresaId = perfil?.empresa_id;

    const [cierres, setCierres] = useState([]);
    const [detalleDia, setDetalleDia] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);

    const fetchCierres = useCallback(async () => {
        if (!empresaId) return;
        setLoading(true);
        
        const { data, error } = await supabase
            .from('cierres_caja')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('fecha_cierre', { ascending: false });

        if (error) console.error("Error cargando historial de cierres:", error);
        
        setCierres(data || []);
        setLoading(false);
    }, [empresaId]);
    
    const handleVerDetalle = useCallback(async (fechaCierre) => {
        if (!empresaId) return;
        setSelectedDate(fechaCierre);
        setDetalleDia(null); 

        const fechaInicio = fechaCierre + 'T00:00:00.000Z';
        const diaSiguiente = new Date(new Date(fechaCierre).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const fechaFin = diaSiguiente + 'T00:00:00.000Z';

        const { data, error } = await supabase.rpc('get_detalle_venta_by_date', {
            p_empresa_id: empresaId,
            p_fecha_inicio: fechaInicio,
            p_fecha_fin: fechaFin
        });

        if (error) console.error("Error cargando detalle:", error);
        
        setDetalleDia(data || []);
    }, [empresaId]);


    useEffect(() => {
        fetchCierres();
        window.refreshHistorialCaja = fetchCierres;
        return () => { delete window.refreshHistorialCaja; };
    }, [fetchCierres]);

    if (isAuthLoading || loading) return <div className="loading-state c-card">Cargando historial de caja...</div>;
    if (!perfil || !empresaId) return <div className="c-state-message c-card">No se pudo cargar la información de la empresa.</div>;
    
    const totalCierres = cierres.reduce((sum, c) => sum + Number(c.total_ingresos), 0);

    return (
        <div className="m-inventory-layout p-page-layout"> 
            
            <h1 className="c-page-header__title">Historial de Cierres de Caja</h1>
            
            {/* 💡 NUEVO: Contenedor para los totales globales (parte superior) */}
            <div className="p-historial-caja__global-summary u-mb-xl">
                <div className="c-card p-historial-caja__summary-item badge-success">
                    <strong>Total Ingresos Históricos:</strong> {formatCurrencyCOP(totalCierres)}
                </div>
                <div className="c-card p-historial-caja__summary-item badge-info">
                    <strong>Días Cerrados:</strong> {cierres.length}
                </div>
            </div>
            
            <div className="p-historial-caja__grid">
                
                {/* 1. SIDEBAR DE CIERRES */}
                <div className="c-card p-historial-caja__sidebar">
                    <h3 className="c-card__title">Cierres por Día</h3>
                    <div className="p-historial-caja__items-list"> {/* Nuevo wrapper para la lista scrollable */}
                        {cierres.map(cierre => (
                            <div 
                                key={cierre.id} 
                                onClick={() => handleVerDetalle(cierre.fecha_cierre)}
                                className={`p-historial-caja__item ${selectedDate === cierre.fecha_cierre ? 'is-selected' : ''}`}
                                role="button"
                            >
                                <span className="p-historial-caja__item-date">📅 {cierre.fecha_cierre}</span>
                                <span className="p-historial-caja__item-income">💵 {formatCurrencyCOP(cierre.total_ingresos)}</span>
                                <span className="p-historial-caja__item-sales">{cierre.total_transacciones} ventas</span>
                            </div>
                        ))}
                        {cierres.length === 0 && <p className="c-state-message">Aún no hay cierres de caja registrados.</p>}
                    </div>
                </div>
                
                {/* 2. DETALLE DE PRODUCTOS VENDIDOS */}
                <div className="c-card p-historial-caja__detail">
                    <h3 className="c-card__title">Detalle de Productos Vendidos {selectedDate && `(${selectedDate})`}</h3>
                    
                    {selectedDate && detalleDia ? (
                        detalleDia.length > 0 ? (
                            <div className="c-data-table-wrapper">
                                <table className="c-data-table">
                                    <thead>
                                        <tr className="c-data-table__row">
                                            <th className="c-data-table__header-cell">Producto</th>
                                            <th className="c-data-table__header-cell">Ref.</th>
                                            <th className="c-data-table__header-cell">Unidades</th>
                                            <th className="c-data-table__header-cell">Precio Unit.</th>
                                            <th className="c-data-table__header-cell">Total</th>
                                            <th className="c-data-table__header-cell">Notas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detalleDia.map((item, index) => (
                                            <tr key={index} className="c-data-table__row">
                                                <td className="c-data-table__cell">{item.nombre_producto}</td>
                                                <td className="c-data-table__cell">{item.referencia}</td>
                                                <td className="c-data-table__cell">{item.cantidad_vendida}</td>
                                                <td className="c-data-table__cell">
                                                    {formatCurrencyCOP(item.precio_unitario)}
                                                    {item.precio_modificado && (
                                                        <span className="u-text-success" style={{ fontSize: '0.9em', marginLeft: 6 }}>
                                                            (Modificado)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="c-data-table__cell u-text-success u-text-bold">
                                                    {formatCurrencyCOP(item.total_linea)}
                                                </td>
                                                <td className="c-data-table__cell">
                                                    {/* Muestra nota si el precio fue modificado */}
                                                    {item.precio_modificado
                                                        ? `Precio modificado en venta`
                                                        : ''}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="c-state-message">No se encontraron productos vendidos en esta fecha.</p>
                        )
                    ) : (
                        <p className="c-state-message">Selecciona una fecha de la izquierda para ver el detalle de la venta.</p>
                    )}
                </div>
            </div>
            {/* 💡 ELIMINAMOS EL FOOTER, sus elementos ahora están en p-historial-caja__global-summary */}
            {/* <div className="p-historial-caja__footer">...</div> */}
        </div>
    );
};

export default HistorialCajaPage;