// src/components/inventario/AjusteStockModal.jsx

import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import useAuth from '../../hooks/useAuth';
import { parseInteger } from '../../utils/formatters';
import '../../styles/inventario.css'; // Asegúrate de importar el CSS

const AjusteStockModal = ({ producto, onClose, onStockAdjusted }) => {
    const { perfil } = useAuth();
    const [cantidadAjuste, setCantidadAjuste] = useState(''); 
    const [razon, setRazon] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleAjuste = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const ajusteNumerico = parseInteger(cantidadAjuste, Number.NaN);

        if (!Number.isFinite(ajusteNumerico) || ajusteNumerico === 0) {
            setError('Ingresa una cantidad válida para sumar o restar (no puede ser 0).');
            setLoading(false);
            return;
        }

        if (!razon.trim()) { // Validar que la razón no esté vacía
            setError('La razón del ajuste es obligatoria.');
            setLoading(false);
            return;
        }

        const empresaId = perfil?.empresa_id;
        const userId = perfil?.id;

        if (!empresaId) {
            setError('Error: No se puede identificar la empresa.');
            setLoading(false);
            return;
        }

        const nuevoStock = producto.stock_actual + ajusteNumerico;
        
        // Opcional: Validar que el stock no sea negativo si no está permitido
        if (nuevoStock < 0) {
            setError('El stock resultante no puede ser negativo.');
            setLoading(false);
            return;
        }

        // 1. Insertar el Movimiento
        const { error: movError } = await supabase
            .from('movimientos_inventario')
            .insert([{
                empresa_id: empresaId,
                producto_id: producto.id,
                usuario_id: userId,
                tipo_movimiento: ajusteNumerico > 0 ? 'RECEPCION' : 'AJUSTE', // o 'SALIDA' si es venta, 'DEVOLUCION'
                cantidad_cambio: ajusteNumerico,
                razon: razon,
            }]);

        if (movError) {
            console.error("Error al registrar movimiento:", movError);
            setError(`Error al registrar movimiento: ${movError.message}`);
            setLoading(false);
            return;
        }

        // 2. Ejecutar la actualización del stock
        const { error: updateError } = await supabase
            .from('productos')
            .update({ stock_actual: nuevoStock })
            .eq('id', producto.id)
            .eq('empresa_id', empresaId)
            .select();

        if (updateError) {
            console.error("Error al actualizar stock:", updateError);
            setError(`Error al actualizar stock: ${updateError.message}`);
        } else {
            onStockAdjusted();
            setCantidadAjuste('');
            setRazon('');
            onClose();
        }
        setLoading(false);
    };

    return (
        <div className="c-modal-overlay">
            <div className="c-modal-content">
                <div className="c-modal-header">
                    <h2 className="c-modal-title u-mb-xs">
                        <span role="img" aria-label="ajuste">🔧</span> Ajustar Stock
                    </h2>
                    <p className="c-modal-subtitle">
                        Producto: <span style={{color: 'var(--color-brand)', fontWeight: 600}}>{producto.nombre}</span>
                    </p>
                </div>
                
                <div className="c-modal-body">
                    <p className="c-modal-current-stock u-mb-lg">
                        Stock Actual: <b>{producto.stock_actual}</b> unidades
                    </p>
                    
                    <form onSubmit={handleAjuste} className="c-form">
                        <div className="c-form-group">
                            <label className="c-form-label">Cantidad a Sumar/Restar:</label>
                            <p className="c-form-message c-form-message--help u-mb-xs">(Usa los botones + y - o escribe directamente)</p>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button 
                                    type="button"
                                    onClick={() => setCantidadAjuste(prev => {
                                        const num = parseInteger(prev, 0);
                                        return String(num - 1);
                                    })}
                                    className="btn btn-secondary"
                                    style={{ 
                                        fontSize: '1.5rem', 
                                        padding: '0.5rem 1rem',
                                        minWidth: '50px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    −
                                </button>
                                <input 
                                    type="text"
                                    inputMode="numeric"
                                    pattern="-?[0-9]*"
                                    value={cantidadAjuste} 
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Permitir solo números y el signo menos al inicio
                                        if (value === '' || value === '-' || /^-?\d+$/.test(value)) {
                                            setCantidadAjuste(value);
                                        }
                                    }} 
                                    required 
                                    className={`c-form-input${error && error.toLowerCase().includes('cantidad') ? ' c-form-input--error' : ''}`}
                                    placeholder="Ej: 5 o -3"
                                    style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setCantidadAjuste(prev => {
                                        const num = parseInteger(prev, 0);
                                        return String(num + 1);
                                    })}
                                    className="btn btn-primary"
                                    style={{ 
                                        fontSize: '1.5rem', 
                                        padding: '0.5rem 1rem',
                                        minWidth: '50px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    +
                                </button>
                            </div>
                            {error && error.toLowerCase().includes('cantidad') && (
                                <span className="c-form-message c-form-message--error">{error}</span>
                            )}
                        </div>
                        
                        <div className="c-form-group">
                            <label className="c-form-label">Razón del Ajuste:</label>
                            <p className="c-form-message c-form-message--help u-mb-xs">(Obligatorio para inventario y trazabilidad)</p>
                            <input 
                                type="text" 
                                placeholder="Ej: Inventario físico, Mercancía recibida, Error"
                                value={razon} 
                                onChange={(e) => setRazon(e.target.value)} 
                                required 
                                className={`c-form-input${error && error.toLowerCase().includes('razón') ? ' c-form-input--error' : ''}`}
                            />
                            {error && error.toLowerCase().includes('razón') && (
                                <span className="c-form-message c-form-message--error">{error}</span>
                            )}
                        </div>
                        
                        {/* Mensaje de error general */}
                        {error && !error.toLowerCase().includes('cantidad') && !error.toLowerCase().includes('razón') && (
                            <p className="c-form-message c-form-message--error">{error}</p>
                        )}

                        <div className="c-modal-footer">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                disabled={loading} 
                                className="btn btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="btn btn-primary btn-success"
                            >
                                {loading ? 'Aplicando...' : 'Aplicar Ajuste'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AjusteStockModal;