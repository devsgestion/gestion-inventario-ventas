// src/pages/CambiosDevolucionesPage.jsx
// Página principal para gestionar cambios y devoluciones de productos

import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';
import useCambiosDevoluciones from '../hooks/useCambiosDevoluciones';
import ProcesarCambioModal from '../components/cambios/ProcesarCambioModal';
import ConfirmModal from '../components/common/ConfirmModal';
import { ToastContainer } from '../components/common/Toast';
import useToast from '../hooks/useToast';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import '../styles/CambiosDevoluciones.css';

const CambiosDevolucionesPage = () => {
    const { perfil } = useAuth();
    const empresaId = perfil?.empresa_id;
    const { cambios, loading, error, fetchCambios, anularCambio } = useCambiosDevoluciones(empresaId);
    const { toasts, showToast, removeToast } = useToast();
    
    const [showModal, setShowModal] = useState(false);
    const [showAnularModal, setShowAnularModal] = useState(false);
    const [cambioToAnular, setCambioToAnular] = useState(null);
    const [procesandoAnulacion, setProcesandoAnulacion] = useState(false);

    const handleCambioCompletado = () => {
        setShowModal(false);
        fetchCambios();
    };

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
            fetchCambios();
        } else {
            showToast(`Error al anular: ${resultado.error}`, 'error');
        }
    };

    if (loading && cambios.length === 0) {
        return (
            <div className="cd-container">
                <p>Cargando cambios y devoluciones...</p>
            </div>
        );
    }

    return (
        <div className="cd-container">
            <div className="cd-header">
                <div>
                    <h2>🔄 Cambios y Devoluciones</h2>
                    <p className="cd-subtitle">Gestiona cambios de productos y devoluciones con ajuste de precio</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)} 
                    className="cd-btn cd-btn--primary"
                >
                    ➕ Procesar Cambio/Devolución
                </button>
            </div>

            {error && (
                <div className="alert alert-error" style={{marginBottom: 'var(--space-lg)'}}>
                    {error}
                </div>
            )}

            {cambios.length === 0 ? (
                <div style={{
                    textAlign: 'center', 
                    padding: '4rem 2rem',
                    background: 'var(--color-surface-200)',
                    borderRadius: 'var(--border-radius-lg)',
                    border: '2px dashed var(--color-border)'
                }}>
                    <p style={{fontSize: '1.125rem', marginBottom: 'var(--space-lg)', color: 'var(--color-text-medium)'}}>
                        📋 No hay cambios o devoluciones registrados
                    </p>
                    <button 
                        onClick={() => setShowModal(true)} 
                        className="cd-btn cd-btn--primary"
                    >
                        Procesar primer cambio
                    </button>
                </div>
            ) : (
                <ul className="cd-list">
                    {cambios.map(cambio => {
                        const productosDevueltos = Array.isArray(cambio.productos_devueltos) 
                            ? cambio.productos_devueltos 
                            : [];
                        const productosNuevos = Array.isArray(cambio.productos_nuevos) 
                            ? cambio.productos_nuevos 
                            : [];
                        
                        let diferenciaClass = 'cd-diferencia--cero';
                        let diferenciaText = 'Sin diferencia';
                        
                        if (cambio.diferencia > 0) {
                            diferenciaClass = 'cd-diferencia--positiva';
                            diferenciaText = `Cliente pagó: ${formatCurrency(cambio.diferencia)}`;
                        } else if (cambio.diferencia < 0) {
                            diferenciaClass = 'cd-diferencia--negativa';
                            diferenciaText = `Devuelto al cliente: ${formatCurrency(Math.abs(cambio.diferencia))}`;
                        }

                        return (
                            <li key={cambio.id} className="cd-item">
                                {cambio.anulado && (
                                    <div style={{
                                        background: 'var(--color-danger-light)',
                                        padding: 'var(--space-sm)',
                                        borderRadius: 'var(--border-radius-md)',
                                        marginBottom: 'var(--space-md)',
                                        border: '2px solid var(--color-danger)'
                                    }}>
                                        <strong>❌ CAMBIO ANULADO</strong>
                                        <p style={{fontSize: '0.875rem', marginTop: '0.25rem'}}>
                                            Fecha: {formatDateTime(cambio.fecha_anulacion)}
                                        </p>
                                        {cambio.motivo_anulacion && (
                                            <p style={{fontSize: '0.875rem'}}>
                                                Motivo: {cambio.motivo_anulacion}
                                            </p>
                                        )}
                                    </div>
                                )}
                                <div className="cd-item-header">
                                    <div>
                                        <h3 className="cd-item-title">
                                            Cambio #{cambio.id.substring(0, 8)}
                                        </h3>
                                        <p className="cd-item-date">
                                            {formatDateTime(cambio.created_at)} • {cambio.usuario?.nombre_completo || 'Usuario desconocido'}
                                        </p>
                                    </div>
                                    <span className={`cd-badge cd-badge--${cambio.estado}`}>
                                        {cambio.estado}
                                    </span>
                                </div>

                                <div className="cd-item-body">
                                    <div className="cd-item-section">
                                        <h4>Productos Devueltos ({productosDevueltos.length})</h4>
                                        <ul className="cd-item-productos">
                                            {productosDevueltos.map((prod, idx) => (
                                                <li key={idx} className="cd-item-producto">
                                                    {prod.cantidad}x {prod.nombre} - {formatCurrency(prod.precio_unitario)}
                                                </li>
                                            ))}
                                        </ul>
                                        <p style={{marginTop: 'var(--space-sm)', fontWeight: 600}}>
                                            Total: {formatCurrency(cambio.valor_devolucion)}
                                        </p>
                                    </div>

                                    <div className="cd-item-section">
                                        <h4>Productos Nuevos ({productosNuevos.length})</h4>
                                        <ul className="cd-item-productos">
                                            {productosNuevos.map((prod, idx) => (
                                                <li key={idx} className="cd-item-producto">
                                                    {prod.cantidad}x {prod.nombre} - {formatCurrency(prod.precio_unitario)}
                                                </li>
                                            ))}
                                        </ul>
                                        <p style={{marginTop: 'var(--space-sm)', fontWeight: 600}}>
                                            Total: {formatCurrency(cambio.valor_nuevos)}
                                        </p>
                                    </div>
                                </div>

                                {cambio.motivo && (
                                    <p style={{
                                        marginBottom: 'var(--space-sm)', 
                                        fontSize: '0.875rem',
                                        color: 'var(--color-text-medium)'
                                    }}>
                                        <strong>Motivo:</strong> {cambio.motivo}
                                    </p>
                                )}

                                {cambio.observaciones && (
                                    <p style={{
                                        marginBottom: 'var(--space-sm)', 
                                        fontSize: '0.875rem',
                                        color: 'var(--color-text-medium)'
                                    }}>
                                        <strong>Observaciones:</strong> {cambio.observaciones}
                                    </p>
                                )}

                                <div className="cd-item-footer">
                                    <div>
                                        <span style={{fontSize: '0.875rem', color: 'var(--color-text-medium)'}}>
                                            Venta Original: #{cambio.venta_original_id?.substring(0, 8)}
                                        </span>
                                    </div>
                                    <div style={{display: 'flex', gap: 'var(--space-md)', alignItems: 'center'}}>
                                        <div className={`cd-diferencia ${diferenciaClass}`}>
                                            {diferenciaText}
                                        </div>
                                        {!cambio.anulado && (
                                            <button
                                                onClick={() => handleAnularClick(cambio.id)}
                                                disabled={procesandoAnulacion}
                                                className="cd-btn cd-btn--danger cd-btn--small"
                                                title="Anular este cambio/devolución"
                                            >
                                                {procesandoAnulacion ? '⏳ Anulando...' : '❌ Anular'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {showModal && (
                <ProcesarCambioModal 
                    empresaId={empresaId}
                    usuarioId={perfil?.id}
                    onClose={() => setShowModal(false)}
                    onCambioCompletado={handleCambioCompletado}
                />
            )}

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

export default CambiosDevolucionesPage;
