// src/pages/HistorialCajaPage.jsx (Con validación de permisos)

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';
import useAuth from '../hooks/useAuth.jsx';
import usePermissions from '../hooks/usePermissions';
import useCambiosDevoluciones from '../hooks/useCambiosDevoluciones';
import ConfirmModal from '../components/common/ConfirmModal';
import { ToastContainer } from '../components/common/Toast';
import useToast from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyCOP } from '../utils/formatters';
import '../styles/ventas.css'; 

const HistorialCajaPage = () => {
    const { perfil, isLoading: isAuthLoading } = useAuth();
    const permissions = usePermissions();
    const navigate = useNavigate();
    const empresaId = perfil?.empresa_id;
    const { anularCambio } = useCambiosDevoluciones(empresaId);
    const { toasts, showToast, removeToast } = useToast();

    const [cierres, setCierres] = useState([]);
    const [detalleDia, setDetalleDia] = useState(null); 
    const [cambiosDia, setCambiosDia] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showAnularModal, setShowAnularModal] = useState(false);
    const [cambioToAnular, setCambioToAnular] = useState(null);
    const [procesandoAnulacion, setProcesandoAnulacion] = useState(false);

    // Verificar permisos
    useEffect(() => {
        if (perfil && !permissions.canViewCashHistory) {
            showToast('Acceso denegado: No tienes permisos para ver el historial de caja', 'error', 5000);
            navigate('/ventas');
        }
    }, [perfil, permissions, navigate, showToast]);

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
        setCambiosDia(null);

        const fechaInicio = fechaCierre + 'T00:00:00.000Z';
        const diaSiguiente = new Date(new Date(fechaCierre).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const fechaFin = diaSiguiente + 'T00:00:00.000Z';

        // Cargar detalle de productos vendidos
        const { data, error } = await supabase.rpc('get_detalle_venta_by_date', {
            p_empresa_id: empresaId,
            p_fecha_inicio: fechaInicio,
            p_fecha_fin: fechaFin
        });

        if (error) console.error("Error cargando detalle:", error);
        setDetalleDia(data || []);

        // Cargar cambios/devoluciones del día
        const { data: cambiosData, error: cambiosError } = await supabase
            .from('cambios_devoluciones')
            .select(`
                *,
                usuario:perfiles!cambios_devoluciones_usuario_id_fkey(nombre_completo, nombre),
                venta_original:ventas!cambios_devoluciones_venta_original_id_fkey(numero_venta)
            `)
            .eq('empresa_id', empresaId)
            .gte('created_at', fechaInicio)
            .lt('created_at', fechaFin)
            .order('created_at', { ascending: false });

        if (cambiosError) console.error("Error cargando cambios:", cambiosError);
        setCambiosDia(cambiosData || []);
    }, [empresaId]);

    const handleAnularClick = (cambioId) => {
        setCambioToAnular(cambioId);
        setShowAnularModal(true);
    };

    const handleConfirmAnular = async (motivo) => {
        if (!cambioToAnular) return;

        setProcesandoAnulacion(true);
        setShowAnularModal(false);
        
        const resultado = await anularCambio(cambioToAnular, perfil?.id, motivo);
        
        setProcesandoAnulacion(false);
        setCambioToAnular(null);

        if (resultado.success) {
            showToast('Cambio anulado correctamente', 'success');
            // Recargar detalle del día seleccionado
            if (selectedDate) {
                handleVerDetalle(selectedDate);
            }
        } else {
            showToast(`Error al anular: ${resultado.error}`, 'error');
        }
    };


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
                    <h3 className="c-card__title">Detalle del Día {selectedDate && `(${selectedDate})`}</h3>
                    
                    {!selectedDate && (
                        <p className="c-state-message">Selecciona una fecha de la izquierda para ver el detalle.</p>
                    )}

                    {selectedDate && detalleDia && detalleDia.length > 0 && (
                        <>
                            <h4 style={{marginTop: 'var(--space-lg)', marginBottom: 'var(--space-md)'}}>📦 Productos Vendidos</h4>
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

                            {/* Sección de Cambios/Devoluciones */}
                            {cambiosDia && cambiosDia.length > 0 && (
                                <div style={{marginTop: 'var(--space-xl)'}}>
                                    <h4 className="c-card__title" style={{marginBottom: 'var(--space-md)'}}>
                                        🔄 Cambios y Devoluciones del Día
                                    </h4>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: 'var(--space-md)'}}>
                                        {cambiosDia.map((cambio, index) => (
                                            <div 
                                                key={cambio.id}
                                                style={{
                                                    padding: 'var(--space-md)',
                                                    background: 'var(--color-surface-200)',
                                                    borderRadius: 'var(--border-radius-md)',
                                                    border: '1px solid var(--color-border)'
                                                }}
                                            >
                                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)'}}>
                                                    <div>
                                                        <strong>Cambio #{index + 1}</strong>
                                                        {cambio.venta_original?.numero_venta && (
                                                            <span style={{marginLeft: 'var(--space-sm)', color: 'var(--color-text-medium)', fontSize: '0.875rem'}}>
                                                                (Venta original: #{cambio.venta_original.numero_venta})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span style={{fontSize: '0.875rem', color: 'var(--color-text-medium)'}}>
                                                        {new Date(cambio.created_at).toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'})}
                                                    </span>
                                                </div>

                                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)'}}>
                                                    <div>
                                                        <div style={{fontSize: '0.75rem', color: 'var(--color-text-medium)', marginBottom: '0.25rem'}}>
                                                            Devolvió
                                                        </div>
                                                        <div style={{fontWeight: 600, color: 'var(--color-warning)'}}>
                                                            {formatCurrencyCOP(cambio.valor_devolucion)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{fontSize: '0.75rem', color: 'var(--color-text-medium)', marginBottom: '0.25rem'}}>
                                                            Nuevos
                                                        </div>
                                                        <div style={{fontWeight: 600, color: 'var(--color-info)'}}>
                                                            {formatCurrencyCOP(cambio.valor_nuevos)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{fontSize: '0.75rem', color: 'var(--color-text-medium)', marginBottom: '0.25rem'}}>
                                                            Diferencia
                                                        </div>
                                                        <div style={{
                                                            fontWeight: 700,
                                                            color: cambio.diferencia > 0 ? 'var(--color-success)' : cambio.diferencia < 0 ? 'var(--color-danger)' : 'var(--color-text-medium)'
                                                        }}>
                                                            {cambio.diferencia > 0 ? '+' : ''}{formatCurrencyCOP(cambio.diferencia)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {cambio.motivo && (
                                                    <div style={{fontSize: '0.875rem', marginTop: 'var(--space-sm)'}}>
                                                        <strong>Motivo:</strong> {cambio.motivo}
                                                    </div>
                                                )}

                                                {cambio.observaciones && (
                                                    <div style={{fontSize: '0.875rem', color: 'var(--color-text-medium)', marginTop: '0.25rem'}}>
                                                        <strong>Observaciones:</strong> {cambio.observaciones}
                                                    </div>
                                                )}

                                                {cambio.usuario && (
                                                    <div style={{fontSize: '0.75rem', color: 'var(--color-text-medium)', marginTop: 'var(--space-sm)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--color-border)'}}>
                                                        👤 Procesado por: {cambio.usuario.nombre_completo || cambio.usuario.nombre}
                                                    </div>
                                                )}

                                                {!cambio.anulado && (
                                                    <div style={{marginTop: 'var(--space-md)', display: 'flex', justifyContent: 'flex-end'}}>
                                                        <button
                                                            onClick={() => handleAnularClick(cambio.id)}
                                                            disabled={procesandoAnulacion}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                background: 'var(--color-danger)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: 'var(--border-radius-md)',
                                                                cursor: procesandoAnulacion ? 'not-allowed' : 'pointer',
                                                                fontSize: '0.875rem',
                                                                fontWeight: 600,
                                                                opacity: procesandoAnulacion ? 0.6 : 1
                                                            }}
                                                            title="Anular este cambio/devolución"
                                                        >
                                                            {procesandoAnulacion ? '⏳ Anulando...' : '❌ Anular Cambio'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Resumen total de cambios */}
                                        <div style={{
                                            padding: 'var(--space-md)',
                                            background: 'var(--color-surface-300)',
                                            borderRadius: 'var(--border-radius-md)',
                                            border: '2px solid var(--color-primary)',
                                            fontWeight: 600
                                        }}>
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                <span>💰 Total diferencia en cambios del día:</span>
                                                <span style={{
                                                    fontSize: '1.25rem',
                                                    color: cambiosDia.reduce((sum, c) => sum + Number(c.diferencia), 0) > 0 
                                                        ? 'var(--color-success)' 
                                                        : 'var(--color-danger)'
                                                }}>
                                                    {cambiosDia.reduce((sum, c) => sum + Number(c.diferencia), 0) > 0 ? '+' : ''}
                                                    {formatCurrencyCOP(cambiosDia.reduce((sum, c) => sum + Number(c.diferencia), 0))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {selectedDate && detalleDia && detalleDia.length === 0 && (
                        <p className="c-state-message">No se encontraron productos vendidos en esta fecha.</p>
                    )}
                </div>
            </div>
            {/* 💡 ELIMINAMOS EL FOOTER, sus elementos ahora están en p-historial-caja__global-summary */}
            {/* <div className="p-historial-caja__footer">...</div> */}

            <ConfirmModal
                isOpen={showAnularModal}
                onClose={() => {
                    setShowAnularModal(false);
                    setCambioToAnular(null);
                }}
                onConfirm={handleConfirmAnular}
                title="¿Anular este cambio?"
                message={
                    <div>
                        <p style={{marginBottom: 'var(--space-sm)'}}>
                            Esta acción revertirá:
                        </p>
                        <ul style={{
                            listStyle: 'disc',
                            paddingLeft: 'var(--space-lg)',
                            marginBottom: 'var(--space-md)'
                        }}>
                            <li>El inventario volverá a su estado original</li>
                            <li>La diferencia se restará de la caja abierta</li>
                            <li>El cambio quedará marcado como anulado</li>
                        </ul>
                        <p style={{fontWeight: 600, color: 'var(--color-danger)'}}>
                            Esta operación no se puede deshacer
                        </p>
                    </div>
                }
                type="danger"
                confirmText="Sí, anular cambio"
                cancelText="Cancelar"
                requireInput={true}
                inputLabel="Motivo de la anulación *"
                inputPlaceholder="Explica por qué estás anulando este cambio..."
            />

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
};

export default HistorialCajaPage;