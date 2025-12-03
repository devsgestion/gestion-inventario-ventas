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
                <div className="cd-list">
                    {cambios.map(cambio => {
                        const productosDevueltos = Array.isArray(cambio.productos_devueltos) 
                            ? cambio.productos_devueltos 
                            : [];
                        const productosNuevos = Array.isArray(cambio.productos_nuevos) 
                            ? cambio.productos_nuevos 
                            : [];
                        
                        let badgeClass = 'neutral';
                        let diferenciaText = 'Sin diferencia';
                        let diferenciaIcon = '⚖️';
                        
                        if (cambio.diferencia > 0) {
                            badgeClass = 'positive';
                            diferenciaText = `Cliente pagó: ${formatCurrency(cambio.diferencia)}`;
                            diferenciaIcon = '💵';
                        } else if (cambio.diferencia < 0) {
                            badgeClass = 'negative';
                            diferenciaText = `Devuelto: ${formatCurrency(Math.abs(cambio.diferencia))}`;
                            diferenciaIcon = '💸';
                        }

                        return (
                            <div key={cambio.id} className="cd-card">
                                {cambio.anulado && (
                                    <div className="cd-anulado-banner">
                                        <strong>❌ CAMBIO ANULADO</strong>
                                        <span>•</span>
                                        <span>{formatDateTime(cambio.fecha_anulacion)}</span>
                                        {cambio.motivo_anulacion && (
                                            <>
                                                <span>•</span>
                                                <span>Motivo: {cambio.motivo_anulacion}</span>
                                            </>
                                        )}
                                    </div>
                                )}
                                
                                <div className="cd-card-header">
                                    <div className="cd-card-title">
                                        <div className="cd-card-id">
                                            🔄 Cambio #{cambio.id.substring(0, 8)}
                                        </div>
                                        <div className="cd-card-meta">
                                            📅 {formatDateTime(cambio.created_at)} • 👤 {cambio.usuario?.nombre_completo || 'Usuario desconocido'}
                                        </div>
                                    </div>
                                    <span className={`cd-status-badge ${cambio.estado}`}>
                                        {cambio.estado}
                                    </span>
                                </div>

                                <div className="cd-card-body">
                                    {/* Sección Devolución */}
                                    <div className="cd-section">
                                        <div className="cd-section-title returned">
                                            ⬇️ Productos Devueltos ({productosDevueltos.length})
                                        </div>
                                        <ul className="cd-product-list-mini">
                                            {productosDevueltos.map((prod, idx) => (
                                                <li key={idx} className="cd-product-item-mini">
                                                    <span>{prod.cantidad}x {prod.nombre}</span>
                                                    <strong>{formatCurrency(prod.precio_unitario)}</strong>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="cd-section-total" style={{color: 'var(--color-danger)'}}>
                                            Total: {formatCurrency(cambio.valor_devolucion)}
                                        </div>
                                    </div>

                                    {/* Sección Nuevos */}
                                    <div className="cd-section">
                                        <div className="cd-section-title new">
                                            ⬆️ Productos Nuevos ({productosNuevos.length})
                                        </div>
                                        <ul className="cd-product-list-mini">
                                            {productosNuevos.map((prod, idx) => (
                                                <li key={idx} className="cd-product-item-mini">
                                                    <span>{prod.cantidad}x {prod.nombre}</span>
                                                    <strong>{formatCurrency(prod.precio_unitario)}</strong>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="cd-section-total" style={{color: 'var(--color-success)'}}>
                                            Total: {formatCurrency(cambio.valor_nuevos)}
                                        </div>
                                    </div>
                                </div>

                                <div className="cd-card-footer">
                                    <div style={{display: 'flex', gap: '2rem'}}>
                                        <div className="cd-info-group">
                                            <span className="cd-label">Venta Original</span>
                                            <span className="cd-value">#{cambio.venta_original_id?.substring(0, 8)}</span>
                                        </div>
                                        {cambio.motivo && (
                                            <div className="cd-info-group">
                                                <span className="cd-label">Motivo</span>
                                                <span className="cd-value">{cambio.motivo}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                        <div className={`cd-total-badge ${badgeClass}`}>
                                            <span>{diferenciaIcon}</span>
                                            {diferenciaText}
                                        </div>
                                        
                                        {!cambio.anulado && (
                                            <button
                                                onClick={() => handleAnularClick(cambio.id)}
                                                disabled={procesandoAnulacion}
                                                className="cd-btn cd-btn--danger cd-btn--small"
                                                title="Anular este cambio/devolución"
                                                style={{padding: '0.5rem 1rem'}}
                                            >
                                                {procesandoAnulacion ? '⏳' : '❌ Anular'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
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
